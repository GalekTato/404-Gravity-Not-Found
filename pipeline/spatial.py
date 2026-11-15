"""State-level spatial preprocessing for Mexico.

This module replaces the single national aggregate with per-state statistics
for the 32 Mexican federal entities. Raster sources (GPM, MODIS, GLDAS) are
summarized inside each state polygon, and the coordinates of the most extreme
pixel are preserved so downstream events are located where the signal occurs.
"""
from __future__ import annotations

import json
import logging
import multiprocessing as mp
import tempfile
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from .cache import atomic_replace, manifest_matches, write_manifest
from .execution import select_workers
from .paths import resolve_data_paths
from .scientific import MEXICO_BBOX, _month_from_name, _slice

LOGGER = logging.getLogger(__name__)

STATES_CACHE_NAME = "mexico_states.geojson"
SIMPLIFY_TOLERANCE_DEGREES = 0.01
SPATIAL_VERSION = 2


@dataclass(frozen=True)
class StateGeometry:
    clave: str
    nombre: str
    lon: float
    lat: float


def _state_source_candidates(root: Path) -> list[Path]:
    return [
        root / "data" / "interim" / STATES_CACHE_NAME,
        root / "404-Gravity-Not-Found" / "public" / "geojson" / "estados.geojson",
        root / "public" / "geojson" / "estados.geojson",
    ]


def prepare_state_geometries(root: str | Path) -> Path:
    """Write a simplified state GeoJSON cache and return its path."""
    root = Path(root).resolve()
    cache = root / "data" / "interim" / STATES_CACHE_NAME
    if cache.exists():
        return cache
    import shapely
    from shapely.geometry import mapping, shape

    source = next((path for path in _state_source_candidates(root)[1:] if path.exists()), None)
    if source is None:
        raise FileNotFoundError(
            "State boundaries were not found. Expected public/geojson/estados.geojson."
        )
    payload = json.loads(source.read_text(encoding="utf-8"))
    features = []
    for feature in payload["features"]:
        geometry = shapely.make_valid(shape(feature["geometry"]))
        simplified = geometry.simplify(SIMPLIFY_TOLERANCE_DEGREES, preserve_topology=True)
        point = simplified.representative_point()
        properties = feature["properties"]
        features.append(
            {
                "type": "Feature",
                "id": properties["clave"],
                "properties": {
                    "clave": properties["clave"],
                    "nombre": properties["nombre"],
                    "lon": round(point.x, 5),
                    "lat": round(point.y, 5),
                },
                "geometry": mapping(simplified),
            }
        )
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps({"type": "FeatureCollection", "features": features}), encoding="utf-8")
    return cache


@lru_cache(maxsize=4)
def load_states(states_path: str) -> tuple[list[StateGeometry], list[Any]]:
    """Load state metadata and shapely geometries ordered by state code."""
    from shapely.geometry import shape

    payload = json.loads(Path(states_path).read_text(encoding="utf-8"))
    features = sorted(payload["features"], key=lambda item: item["properties"]["clave"])
    states = [
        StateGeometry(
            clave=item["properties"]["clave"],
            nombre=item["properties"]["nombre"],
            lon=float(item["properties"]["lon"]),
            lat=float(item["properties"]["lat"]),
        )
        for item in features
    ]
    geometries = [shape(item["geometry"]) for item in features]
    return states, geometries


def assign_states(
    states_path: str | Path,
    lon: np.ndarray,
    lat: np.ndarray,
    *,
    max_distance_degrees: float = 0.0,
) -> np.ndarray:
    """Return the state index for each point, or -1 when outside every state.

    Points outside all polygons may be attached to the nearest state when they
    are within ``max_distance_degrees`` (for offshore epicenters or cyclone
    tracks approaching the coast).
    """
    import shapely

    _, geometries = load_states(str(states_path))
    lon = np.asarray(lon, dtype=float)
    lat = np.asarray(lat, dtype=float)
    result = np.full(lon.shape, -1, dtype=np.int16)
    valid = np.isfinite(lon) & np.isfinite(lat)
    if not valid.any():
        return result
    for index, geometry in enumerate(geometries):
        minx, miny, maxx, maxy = geometry.bounds
        candidates = valid & (result < 0) & (lon >= minx) & (lon <= maxx) & (lat >= miny) & (lat <= maxy)
        if candidates.any():
            inside = shapely.contains_xy(geometry, lon[candidates], lat[candidates])
            positions = np.flatnonzero(candidates)[inside]
            result[positions] = index
    if max_distance_degrees > 0:
        pending = np.flatnonzero(valid & (result < 0))
        if pending.size:
            tree = shapely.STRtree(geometries)
            points = shapely.points(lon[pending], lat[pending])
            input_index, tree_index = tree.query_nearest(
                points, max_distance=max_distance_degrees, all_matches=False
            )
            result[pending[input_index]] = tree_index.astype(np.int16)
    return result


_GRID_CACHE: dict[tuple, list[np.ndarray]] = {}


def _state_pixel_index(states_path: str, lat: np.ndarray, lon: np.ndarray) -> list[np.ndarray]:
    """Flat pixel indices per state for a (lat, lon) grid, cached by grid shape."""
    key = (states_path, lat.size, float(lat[0]), float(lat[-1]), lon.size, float(lon[0]), float(lon[-1]))
    cached = _GRID_CACHE.get(key)
    if cached is not None:
        return cached
    lon_grid, lat_grid = np.meshgrid(lon, lat)
    assigned = assign_states(states_path, lon_grid.ravel(), lat_grid.ravel())
    states, _ = load_states(states_path)
    groups = [np.flatnonzero(assigned == index) for index in range(len(states))]
    _GRID_CACHE[key] = groups
    return groups


def _state_stats(
    values: np.ndarray,
    lat: np.ndarray,
    lon: np.ndarray,
    states_path: str,
    prefix: str,
    *,
    extreme: str = "max",
) -> list[dict[str, float]]:
    """Mean, p95, extreme value, and extreme coordinates per state."""
    flat = np.asarray(values, dtype=np.float32).ravel()
    lon_flat = np.tile(lon, lat.size)
    lat_flat = np.repeat(lat, lon.size)
    rows: list[dict[str, float]] = []
    for pixels in _state_pixel_index(states_path, lat, lon):
        selected = flat[pixels] if pixels.size else np.empty(0, dtype=np.float32)
        finite = np.isfinite(selected)
        if not finite.any():
            rows.append({f"{prefix}_mean": np.nan, f"{prefix}_p95": np.nan, f"{prefix}_{extreme}": np.nan,
                         f"{prefix}_{extreme}_lon": np.nan, f"{prefix}_{extreme}_lat": np.nan})
            continue
        good = selected[finite]
        good_pixels = pixels[finite]
        position = int(np.argmax(good) if extreme == "max" else np.argmin(good))
        rows.append(
            {
                f"{prefix}_mean": float(good.mean()),
                f"{prefix}_p95": float(np.quantile(good, 0.95)),
                f"{prefix}_{extreme}": float(good[position]),
                f"{prefix}_{extreme}_lon": float(lon_flat[good_pixels[position]]),
                f"{prefix}_{extreme}_lat": float(lat_flat[good_pixels[position]]),
            }
        )
    return rows


def _clean(values: Any, *, scale: float = 1.0, fill: float | None = None) -> np.ndarray:
    if np.ma.isMaskedArray(values):
        values = values.filled(np.nan)
    array = np.asarray(values, dtype=np.float32) * scale
    if fill is not None:
        array = np.where(array == fill * scale, np.nan, array)
    array = np.where((array < -9000) | (array > 1e20), np.nan, array)
    return array


def _read_gpm(path: Path, states_path: str) -> list[dict[str, Any]]:
    import h5py

    with h5py.File(path, "r") as source:
        lat = source["Grid/lat"][:]
        lon = source["Grid/lon"][:]
        ys = _slice(lat, MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"])
        xs = _slice(lon, MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"])
        values = _clean(source["Grid/precipitation"][0, xs, ys], fill=-9999.9).T
    return _state_stats(values, lat[ys], lon[xs], states_path, "gpm_precip")


def _read_modis(path: Path, states_path: str) -> list[dict[str, Any]]:
    from pyhdf.SD import SD, SDC

    lat_all = np.linspace(90.0 - 0.025, -90.0 + 0.025, 3600)
    lon_all = np.linspace(-180.0 + 0.025, 180.0 - 0.025, 7200)
    ys = _slice(lat_all[::-1], MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"])
    xs = _slice(lon_all, MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"])
    row_start, row_count = 3600 - ys.stop, ys.stop - ys.start
    col_start, col_count = xs.start, xs.stop - xs.start
    lat = lat_all[row_start: row_start + row_count]
    lon = lon_all[col_start: col_start + col_count]
    source = SD(str(path), SDC.READ)
    try:
        day = _clean(source.select("LST_Day_CMG").get(start=(row_start, col_start), count=(row_count, col_count)),
                     scale=0.02, fill=0)
        night = _clean(source.select("LST_Night_CMG").get(start=(row_start, col_start), count=(row_count, col_count)),
                       scale=0.02, fill=0)
    finally:
        source.end()
    day_rows = _state_stats(day, lat, lon, states_path, "modis_lst_day")
    night_rows = _state_stats(night, lat, lon, states_path, "modis_lst_night")
    return [{**a, "modis_lst_night_mean": b["modis_lst_night_mean"]} for a, b in zip(day_rows, night_rows)]


def _read_gldas(path: Path, states_path: str) -> list[dict[str, Any]]:
    from netCDF4 import Dataset

    with Dataset(path) as source:
        lat = np.asarray(source.variables["lat"][:], dtype=float)
        lon = np.asarray(source.variables["lon"][:], dtype=float)
        ys = _slice(lat, MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"])
        xs = _slice(lon, MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"])
        variables = {
            "SoilMoi0_10cm_inst": ("gldas_soil_moisture", "min"),
            "RootMoist_inst": ("gldas_root_moisture", "min"),
            "Qs_acc": ("gldas_runoff_surface", "max"),
            "Rainf_f_tavg": ("gldas_rain", "max"),
            "Tair_f_inst": ("gldas_air_temp", "max"),
        }
        per_variable = []
        for name, (prefix, extreme) in variables.items():
            values = _clean(source.variables[name][0, ys, xs])
            per_variable.append(_state_stats(values, lat[ys], lon[xs], states_path, prefix, extreme=extreme))
    return [dict(item for rows in group for item in rows.items()) for group in zip(*per_variable)]


_READERS = {"gpm": _read_gpm, "modis": _read_modis, "gldas": _read_gldas}


def _state_rows_for_file(task: tuple[str, str, str]) -> list[dict[str, Any]]:
    kind, path_text, states_path = task
    path = Path(path_text)
    rows = _READERS[kind](path, states_path)
    states, _ = load_states(states_path)
    month = _month_from_name(path)
    return [
        {"state_clave": state.clave, "month": month, "source_type": kind, **row}
        for state, row in zip(states, rows)
    ]


def aggregate_state_features(
    root: str | Path,
    output: str | Path,
    *,
    workers: int = 1,
    minimum_files: int = 8,
    minimum_bytes: int = 256 * 1024 * 1024,
) -> Path:
    """Aggregate GPM, MODIS, and GLDAS rasters to monthly per-state features."""
    import pandas as pd

    root, output = Path(root).resolve(), Path(output)
    states_path = str(prepare_state_geometries(root))
    paths = resolve_data_paths(root)
    sources = {
        "gpm": sorted(paths.gpm.glob("*.HDF5")),
        "modis": sorted(paths.modis.glob("*.hdf")),
        "gldas": sorted(paths.gldas.glob("*.nc4")),
    }
    all_files = [path for files in sources.values() for path in files] + [Path(states_path)]
    manifest_path = output.with_suffix(".manifest.json")
    if output.exists() and manifest_matches(
        manifest_path, all_files, aggregation="Mexico state monthly statistics", version=SPATIAL_VERSION
    ):
        return output
    tasks = [(kind, str(path), states_path) for kind, files in sources.items() for path in files]
    effective = select_workers(
        [Path(task[1]) for task in tasks], workers, minimum_files=minimum_files, minimum_bytes=minimum_bytes
    )
    LOGGER.info("state aggregation files=%d workers=%d", len(tasks), effective)
    rows: list[dict[str, Any]] = []
    if effective <= 1:
        for task in tasks:
            rows.extend(_state_rows_for_file(task))
    else:
        context = mp.get_context("spawn")
        with ProcessPoolExecutor(max_workers=effective, mp_context=context) as pool:
            for chunk in pool.map(_state_rows_for_file, tasks, chunksize=8):
                rows.extend(chunk)
    long = pd.DataFrame(rows)
    frames = []
    for kind in ("gpm", "modis", "gldas"):
        part = long[long["source_type"] == kind].drop(columns="source_type").dropna(axis=1, how="all")
        if not part.empty:
            frames.append(part.groupby(["state_clave", "month"], as_index=False).mean(numeric_only=True))
    wide = frames[0]
    for frame in frames[1:]:
        wide = wide.merge(frame, on=["state_clave", "month"], how="outer")
    wide = wide.sort_values(["state_clave", "month"]).reset_index(drop=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=f"{output.stem}.", suffix=".parquet", dir=output.parent,
                                     delete=False) as temporary:
        temporary_path = Path(temporary.name)
    try:
        wide.to_parquet(temporary_path, compression="zstd", index=False)
        atomic_replace(temporary_path, output)
        write_manifest(manifest_path, all_files, row_count=len(wide),
                       aggregation="Mexico state monthly statistics", version=SPATIAL_VERSION)
    finally:
        temporary_path.unlink(missing_ok=True)
    return output
