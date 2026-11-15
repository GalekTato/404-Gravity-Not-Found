from __future__ import annotations

import hashlib
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from .cache import atomic_replace
from .scientific import MEXICO_BBOX


USGS_ENDPOINT = "https://earthquake.usgs.gov/fdsnws/event/1/query"
IBTRACS_ENDPOINT = (
    "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/"
    "v04r01/access/csv/ibtracs.NA.list.v04r01.csv"
)
IBTRACS_EP_ENDPOINT = (
    "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/"
    "v04r01/access/csv/ibtracs.EP.list.v04r01.csv"
)
EONET_ENDPOINT = "https://eonet.gsfc.nasa.gov/api/v3/events"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _complete_monthly_series(
    positive_frame: pd.DataFrame,
    *,
    hazard_type: str,
    source_name: str,
    include_magnitude: bool = False,
) -> pd.DataFrame:
    """Expand positive event months into a complete monthly boolean series over the covered range."""
    base_columns = ["month", "hazard_type", "observed", "event_count", "source"]
    if include_magnitude:
        base_columns.insert(4, "magnitude")
    if positive_frame.empty:
        return pd.DataFrame(columns=base_columns)
    min_month = str(positive_frame["month"].min())
    max_month = str(positive_frame["month"].max())
    all_months = pd.date_range(f"{min_month}-01", f"{max_month}-01", freq="MS").strftime("%Y-%m")
    grid = pd.DataFrame({"month": all_months})
    merged = grid.merge(positive_frame, on="month", how="left")
    merged["hazard_type"] = hazard_type
    merged["observed"] = merged["observed"].where(merged["observed"].notna(), False).astype(bool)
    merged["event_count"] = merged["event_count"].fillna(0).astype(int)
    merged["source"] = source_name
    if include_magnitude and "magnitude" not in merged:
        merged["magnitude"] = float("nan")
    return merged[base_columns]


def download_usgs_earthquakes(
    output: str | Path,
    *,
    start_time: str = "2010-01-01",
    end_time: str = "2026-12-31",
    min_magnitude: float = 4.0,
    timeout_seconds: int = 60,
) -> Path:
    """Download a reproducible USGS GeoJSON earthquake catalog for Mexico."""
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    query = urllib.parse.urlencode(
        {
            "format": "geojson",
            "starttime": start_time,
            "endtime": end_time,
            "minlatitude": MEXICO_BBOX["lat_min"],
            "maxlatitude": MEXICO_BBOX["lat_max"],
            "minlongitude": MEXICO_BBOX["lon_min"],
            "maxlongitude": MEXICO_BBOX["lon_max"],
            "minmagnitude": min_magnitude,
            "orderby": "time-asc",
            "limit": 20000,
        }
    )
    url = f"{USGS_ENDPOINT}?{query}"
    request = urllib.request.Request(url, headers={"User-Agent": "geospatial-resource-pipeline/0.1"})
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        payload = response.read()
    temporary = output.with_suffix(f"{output.suffix}.tmp")
    temporary.write_bytes(payload)
    atomic_replace(temporary, output)
    manifest = {
        "source": "USGS Earthquake Catalog",
        "url": url,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "sha256": _sha256(output),
        "coverage": {
            "start_time": start_time,
            "end_time": end_time,
            "min_magnitude": min_magnitude,
            "region": "Mexico bounding box",
        },
    }
    output.with_suffix(".manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return output


def normalize_usgs_labels(source: str | Path, output: str | Path) -> Path:
    """Normalize USGS earthquake events into a complete monthly tectonic label series."""
    source, output = Path(source), Path(output)
    payload: dict[str, Any] = json.loads(source.read_text(encoding="utf-8"))
    rows = []
    for feature in payload.get("features", []):
        properties = feature.get("properties") or {}
        timestamp = properties.get("time")
        if timestamp is None:
            continue
        month = datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc).strftime("%Y-%m")
        rows.append(
            {
                "month": month,
                "hazard_type": "sismo",
                "observed": True,
                "event_count": 1,
                "magnitude": properties.get("mag"),
                "source": "USGS Earthquake Catalog",
            }
        )
    frame = pd.DataFrame(rows)
    if not frame.empty:
        frame = (
            frame.groupby(["month", "hazard_type", "source"], as_index=False)
            .agg(observed=("observed", "max"), event_count=("event_count", "sum"), magnitude=("magnitude", "max"))
        )
    frame = _complete_monthly_series(
        frame,
        hazard_type="sismo",
        source_name="USGS Earthquake Catalog",
        include_magnitude=True,
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    frame.to_parquet(output, compression="zstd", index=False)
    return output


def download_ibtracs(
    output: str | Path,
    *,
    timeout_seconds: int = 120,
) -> Path:
    """Download NOAA IBTrACS North Atlantic and normalize its provenance."""
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(
        IBTRACS_ENDPOINT,
        headers={"User-Agent": "Mozilla/5.0 (compatible; geospatial-resource-pipeline/0.1)"},
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        payload = response.read()
    temporary = output.with_suffix(f"{output.suffix}.tmp")
    temporary.write_bytes(payload)
    atomic_replace(temporary, output)
    manifest = {
        "source": "NOAA IBTrACS v04r01 North Atlantic",
        "url": IBTRACS_ENDPOINT,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "sha256": _sha256(output),
        "coverage": "North Atlantic basin storm tracks; filtered to Mexico in normalization",
    }
    output.with_suffix(".manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return output


def normalize_ibtracs_labels(source: str | Path, output: str | Path) -> Path:
    """Normalize IBTrACS storm positions (NA and optional EP basin) intersecting Mexico."""
    source, output = Path(source), Path(output)
    sources = [source]
    ep_candidate = source.parent / "ibtracs_ep.csv"
    if ep_candidate.exists() and ep_candidate != source:
        sources.append(ep_candidate)
    frames = [pd.read_csv(path, skiprows=[1], low_memory=False) for path in sources]
    frame = pd.concat(frames, ignore_index=True)
    frame["lat"] = pd.to_numeric(frame.get("USA_LAT"), errors="coerce").fillna(
        pd.to_numeric(frame.get("LAT"), errors="coerce")
    )
    frame["lon"] = pd.to_numeric(frame.get("USA_LON"), errors="coerce").fillna(
        pd.to_numeric(frame.get("LON"), errors="coerce")
    )
    frame["timestamp"] = pd.to_datetime(frame.get("ISO_TIME"), errors="coerce", utc=True)
    frame = frame[
        frame["lat"].between(MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"])
        & frame["lon"].between(MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"])
        & frame["timestamp"].notna()
    ]
    positive = (
        frame.assign(month=frame["timestamp"].dt.strftime("%Y-%m"), observed=True)
        .groupby("month", as_index=False)
        .agg(observed=("observed", "max"), event_count=("SID", "nunique"))
    )
    cyclone_series = _complete_monthly_series(
        positive,
        hazard_type="ciclon",
        source_name="NOAA IBTrACS v04r01 (NA + EP basins)",
    )
    flood_series = _complete_monthly_series(
        positive,
        hazard_type="inundacion",
        source_name="NOAA IBTrACS v04r01 (NA + EP tropical cyclone tracks in Mexico)",
    )
    labels = pd.concat([cyclone_series, flood_series], ignore_index=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    labels.to_parquet(output, compression="zstd", index=False)
    return output


def download_eonet_wildfires(
    output: str | Path,
    *,
    start_time: str = "2010-01-01",
    end_time: str = "2026-12-31",
    timeout_seconds: int = 60,
) -> Path:
    """Download public historical wildfire events from NASA EONET v3 for the Mexico bounding box."""
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    bbox = f"{MEXICO_BBOX['lon_min']},{MEXICO_BBOX['lat_max']},{MEXICO_BBOX['lon_max']},{MEXICO_BBOX['lat_min']}"
    query = urllib.parse.urlencode(
        {
            "category": "wildfires",
            "status": "all",
            "start": start_time,
            "end": end_time,
            "bbox": bbox,
        }
    )
    url = f"{EONET_ENDPOINT}?{query}"
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; geospatial-resource-pipeline/0.1)"},
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        payload = response.read()
    temporary = output.with_suffix(f"{output.suffix}.tmp")
    temporary.write_bytes(payload)
    atomic_replace(temporary, output)
    manifest = {
        "source": "NASA EONET v3 Historical Wildfires",
        "url": url,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "sha256": _sha256(output),
        "coverage": {
            "start_time": start_time,
            "end_time": end_time,
            "bbox": bbox,
            "region": "Mexico bounding box",
        },
    }
    output.with_suffix(".manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return output


def _extract_eonet_wildfire_months(eonet_path: Path, states_geojson: Path | None = None) -> list[str]:
    if not eonet_path.exists():
        return []
    payload: dict[str, Any] = json.loads(eonet_path.read_text(encoding="utf-8"))
    records: list[tuple[float, float, str]] = []
    for event in payload.get("events", []):
        for geom in event.get("geometry", []):
            coords = geom.get("coordinates")
            date_str = geom.get("date")
            if not date_str:
                continue
            parsed = pd.to_datetime(date_str, errors="coerce", utc=True)
            if pd.isna(parsed):
                continue
            if isinstance(coords, list) and len(coords) >= 2 and isinstance(coords[0], (int, float)):
                lon, lat = float(coords[0]), float(coords[1])
                if not (
                    MEXICO_BBOX["lat_min"] <= lat <= MEXICO_BBOX["lat_max"]
                    and MEXICO_BBOX["lon_min"] <= lon <= MEXICO_BBOX["lon_max"]
                ):
                    continue
                records.append((lon, lat, parsed.strftime("%Y-%m")))
    if not records:
        return []
    candidate_geojson = states_geojson or (eonet_path.parent.parent / "mexico_states.geojson")
    if candidate_geojson.exists():
        import numpy as np
        from .spatial import assign_states

        lons = np.array([r[0] for r in records], dtype=np.float64)
        lats = np.array([r[1] for r in records], dtype=np.float64)
        assigned = assign_states(str(candidate_geojson), lons, lats, max_distance_degrees=0.15)
        return [records[i][2] for i in range(len(records)) if assigned[i] >= 0]
    return [r[2] for r in records]


def normalize_firms_labels(
    source_dir: str | Path,
    output: str | Path,
    *,
    external_wildfires: str | Path | None = None,
) -> Path:
    """Normalize local NASA FIRMS observations and public NASA EONET wildfires into monthly fire labels."""
    source_dir, output = Path(source_dir), Path(output)
    rows = []
    local_files = sorted(source_dir.glob("*.txt")) if source_dir.exists() else []
    for path in local_files:
        frame = pd.read_csv(path, usecols=["latitude", "longitude", "acq_date"])
        frame = frame[
            frame["latitude"].between(MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"])
            & frame["longitude"].between(MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"])
        ]
        month = pd.to_datetime(frame["acq_date"], errors="coerce").dt.strftime("%Y-%m").dropna()
        rows.extend({"month": value, "hazard_type": "incendio", "observed": True} for value in month)

    has_external = False
    if external_wildfires is not None and Path(external_wildfires).exists():
        eonet_months = _extract_eonet_wildfire_months(Path(external_wildfires))
        if eonet_months:
            has_external = True
            rows.extend({"month": value, "hazard_type": "incendio", "observed": True} for value in eonet_months)

    source_label = (
        "NASA FIRMS local observations + NASA EONET v3 Historical Wildfires"
        if has_external
        else "NASA FIRMS local observations"
    )
    positive = pd.DataFrame(rows)
    if not positive.empty:
        positive = (
            positive.groupby(["month", "hazard_type"], as_index=False)
            .agg(observed=("observed", "max"), event_count=("observed", "size"))
        )
    labels = _complete_monthly_series(
        positive,
        hazard_type="incendio",
        source_name=source_label,
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    labels.to_parquet(output, compression="zstd", index=False)
    manifest = {
        "source": source_label,
        "local_firms_files": len(local_files),
        "external_wildfires_used": has_external,
        "rows": int(len(labels)),
        "positive_months": int(labels["observed"].sum()) if not labels.empty else 0,
        "sha256": _sha256(output),
    }
    output.with_suffix(".manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return output
