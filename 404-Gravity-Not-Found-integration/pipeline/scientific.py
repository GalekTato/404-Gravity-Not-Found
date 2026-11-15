from __future__ import annotations

import calendar
import re
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

import numpy as np

from .paths import resolve_data_paths

MEXICO_BBOX = {"lat_min": 14.0, "lat_max": 33.0, "lon_min": -119.0, "lon_max": -86.0}


def _slice(values: np.ndarray, low: float, high: float) -> slice:
    values = np.asarray(values)
    if values[0] > values[-1]:
        ascending = values[::-1]
        start = max(0, int(np.searchsorted(ascending, low, side="left")))
        stop = min(values.size, int(np.searchsorted(ascending, high, side="right")))
        return slice(values.size - stop, values.size - start)
    return slice(
        max(0, int(np.searchsorted(values, low, side="left"))),
        min(values.size, int(np.searchsorted(values, high, side="right"))),
    )


def _stats(values: np.ndarray, prefix: str, *, scale: float = 1.0, fill: float | None = None) -> dict[str, float]:
    if np.ma.isMaskedArray(values):
        values = values.filled(np.nan)
    values = np.asarray(values, dtype=np.float32) * scale
    if fill is not None:
        values = np.where(values == fill, np.nan, values)
    finite = values[np.isfinite(values) & (values > -9000)]
    finite = finite[finite > -1e20]
    if finite.size == 0:
        return {f"{prefix}_{name}": float("nan") for name in ("count", "mean", "std", "p05", "p95", "max")}
    return {
        f"{prefix}_count": float(finite.size),
        f"{prefix}_mean": float(finite.mean()),
        f"{prefix}_std": float(finite.std()),
        f"{prefix}_p05": float(np.quantile(finite, 0.05)),
        f"{prefix}_p95": float(np.quantile(finite, 0.95)),
        f"{prefix}_max": float(finite.max()),
    }


def _month_from_name(path: Path) -> str:
    match = re.search(r"A(20\d{2})(\d{3})", path.name)
    if match:
        date = datetime.strptime(f"{match.group(1)}-{match.group(2)}", "%Y-%j")
        return date.strftime("%Y-%m")
    match = re.search(r"A(20\d{2})(\d{2})", path.name)
    if match:
        return f"{match.group(1)}-{match.group(2)}"
    match = re.search(r"(20\d{2})(\d{2})(\d{2})", path.name)
    if match:
        return f"{match.group(1)}-{match.group(2)}"
    match = re.search(r"(?<!\d)(20\d{2})(\d{3})(?!\d)", path.name)
    if match:
        date = datetime.strptime(f"{match.group(1)}-{match.group(2)}", "%Y-%j")
        return date.strftime("%Y-%m")
    raise ValueError(f"Cannot infer month from {path.name}")


def aggregate_gpm(path: str | Path) -> dict[str, Any]:
    import h5py

    path = Path(path)
    with h5py.File(path, "r") as source:
        lat = source["Grid/lat"][:]
        lon = source["Grid/lon"][:]
        ys, xs = _slice(lat, MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"]), _slice(
            lon, MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"]
        )
        values = source["Grid/precipitation"][0, xs, ys]
        result = _stats(values, "gpm_precip", fill=-9999.9)
        result.update({"month": _month_from_name(path), "source": str(path), "source_type": "gpm"})
        return result


def aggregate_modis(path: str | Path) -> dict[str, Any]:
    from pyhdf.SD import SD, SDC

    path = Path(path)
    source = SD(str(path), SDC.READ)
    try:
        # MODIS CMG arrays are [latitude, longitude] at 0.05 degrees.
        lat = np.linspace(90.0 - 0.025, -90.0 + 0.025, 3600)
        lon = np.linspace(-180.0 + 0.025, 180.0 - 0.025, 7200)
        ys = _slice(lat[::-1], MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"])
        xs = _slice(lon, MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"])
        # Convert ascending-lat slice back to the source's north-to-south rows.
        row_start = 3600 - ys.stop
        row_count = ys.stop - ys.start
        col_start, col_count = xs.start, xs.stop - xs.start
        result = {"month": _month_from_name(path), "source": str(path), "source_type": "modis"}
        for name, prefix in (("LST_Day_CMG", "modis_lst_day"), ("LST_Night_CMG", "modis_lst_night")):
            values = source.select(name).get(
                start=(row_start, col_start), count=(row_count, col_count)
            )
            result.update(_stats(values, prefix, scale=0.02, fill=0))
        return result
    finally:
        source.end()


def aggregate_gldas(path: str | Path) -> dict[str, Any]:
    from netCDF4 import Dataset

    path = Path(path)
    with Dataset(path) as source:
        lat, lon = source.variables["lat"][:], source.variables["lon"][:]
        ys, xs = _slice(lat, MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"]), _slice(
            lon, MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"]
        )
        result: dict[str, Any] = {"month": _month_from_name(path), "source": str(path), "source_type": "gldas"}
        variables = {
            "Rainf_f_tavg": "gldas_rain",
            "Qs_acc": "gldas_runoff_surface",
            "SoilMoi0_10cm_inst": "gldas_soil_moisture",
            "RootMoist_inst": "gldas_root_moisture",
            "AvgSurfT_inst": "gldas_surface_temp",
            "Tair_f_inst": "gldas_air_temp",
        }
        for name, prefix in variables.items():
            values = source.variables[name][0, ys, xs]
            result.update(_stats(values, prefix))
        return result


def aggregate_firms(path: str | Path) -> dict[str, Any]:
    import pandas as pd

    path = Path(path)
    frame = pd.read_csv(path, usecols=["latitude", "longitude", "acq_date", "bright_ti4", "frp"])
    frame = frame[
        frame["latitude"].between(MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"])
        & frame["longitude"].between(MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"])
    ]
    month = pd.to_datetime(frame["acq_date"], errors="coerce").dt.strftime("%Y-%m")
    result: dict[str, Any] = {"month": month.iloc[0] if not month.empty else None, "source": str(path), "source_type": "firms"}
    result.update(_stats(frame["frp"].to_numpy(), "firms_frp"))
    result["firms_fire_count"] = float(len(frame))
    result["firms_lat_mean"] = float(frame["latitude"].mean()) if len(frame) else float("nan")
    result["firms_lon_mean"] = float(frame["longitude"].mean()) if len(frame) else float("nan")
    return result


def aggregate_all_data(root: str | Path, output: str | Path) -> Path:
    """Aggregate every file in Hack/Datos without loading the full archive."""
    root, output = Path(root), Path(output)
    paths = resolve_data_paths(root)
    sources = (
        list(paths.gpm.glob("*.HDF5"))
        + list(paths.modis.glob("*.hdf"))
        + list(paths.gldas.glob("*.nc4"))
        + list(paths.firms.glob("*.txt"))
    )
    manifest_path = output.with_suffix(".manifest.json")
    from .cache import atomic_replace, manifest_matches, write_manifest

    if output.exists() and manifest_matches(
        manifest_path,
        sources,
        aggregation="Mexico bbox monthly source statistics",
        version=1,
    ):
        return output
    rows: list[dict[str, Any]] = []
    for path in sorted(paths.gpm.glob("*.HDF5")):
        rows.append(aggregate_gpm(path))
    for path in sorted(paths.modis.glob("*.hdf")):
        rows.append(aggregate_modis(path))
    for path in sorted(paths.gldas.glob("*.nc4")):
        rows.append(aggregate_gldas(path))
    for path in sorted(paths.firms.glob("*.txt")):
        row = aggregate_firms(path)
        if row["month"]:
            rows.append(row)
    import pandas as pd

    frame = pd.DataFrame(rows)
    # Keep one row per source/month and let the hazard layer merge by month.
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        prefix=f"{output.stem}.", suffix=".parquet", dir=output.parent, delete=False
    ) as temporary:
        temporary_path = Path(temporary.name)
    try:
        frame.to_parquet(temporary_path, compression="zstd", index=False)
        atomic_replace(temporary_path, output)
        sources = (
            list(paths.gpm.glob("*.HDF5"))
            + list(paths.modis.glob("*.hdf"))
            + list(paths.gldas.glob("*.nc4"))
            + list(paths.firms.glob("*.txt"))
        )
        write_manifest(
            output.with_suffix(".manifest.json"),
            sources,
            row_count=len(frame),
            aggregation="Mexico bbox monthly source statistics",
            version=1,
        )
        return output
    finally:
        temporary_path.unlink(missing_ok=True)
