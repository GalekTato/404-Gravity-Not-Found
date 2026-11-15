from __future__ import annotations

import datetime
import os
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


HAZARD_DEFINITIONS = {
    "incendio": ("fire_risk_score_proxy", "fire_evidence", "Riesgo de incendio"),
    "sequia": ("drought_score_proxy", "drought_evidence", "Indicador de sequía"),
    "inundacion": ("flood_score_proxy", "flood_evidence", "Indicador de inundación"),
    "sismo": ("tectonic_score_proxy", "tectonic_evidence", "Screening tectónico"),
}

FALLBACK_COORDINATES = (-99.1332, 19.4326)

_SYNCED_MTIME: tuple[str, int] | None = None


def _data_root() -> Path:
    configured = os.environ.get("PIPELINE_DATA_ROOT")
    if configured:
        return Path(configured)
    repo_root = Path(__file__).resolve().parents[2]
    if (repo_root / "data" / "processed" / "spatial_hazard_catalog.parquet").exists() or (
        repo_root / "data" / "processed" / "hazard_catalog.parquet"
    ).exists():
        return repo_root
    return Path(__file__).resolve().parents[3]


def _spatial_catalog_path() -> Path:
    return _data_root() / "data" / "processed" / "spatial_hazard_catalog.parquet"


def _catalog_path() -> Path:
    return _data_root() / "data" / "processed" / "hazard_catalog.parquet"


@lru_cache(maxsize=1)
def load_catalog() -> pd.DataFrame:
    path = _catalog_path()
    if not path.exists():
        raise FileNotFoundError(
            f"No existe el catálogo científico: {path}. Ejecuta el pipeline o configura PIPELINE_DATA_ROOT."
        )
    frame = pd.read_parquet(path)
    if "month" not in frame:
        raise ValueError("El catálogo no contiene la columna month.")
    frame["month"] = pd.to_datetime(frame["month"], errors="coerce").dt.strftime("%Y-%m")
    return frame.dropna(subset=["month"]).sort_values("month").reset_index(drop=True)


@lru_cache(maxsize=1)
def load_spatial_catalog() -> pd.DataFrame:
    path = _spatial_catalog_path()
    if not path.exists():
        return pd.DataFrame()
    frame = pd.read_parquet(path)
    return frame.sort_values(["period", "severity"], ascending=[True, False]).reset_index(drop=True)


def clear_catalog_cache() -> None:
    global _SYNCED_MTIME
    _SYNCED_MTIME = None
    load_catalog.cache_clear()
    load_spatial_catalog.cache_clear()


def ensure_postgres_catalog_synced() -> int:
    """Synchronize the spatial Parquet catalog into PostgreSQL SpatialHazardEvent."""
    global _SYNCED_MTIME
    path = _spatial_catalog_path()
    if not path.exists():
        return 0
    mtime_key = (str(path), path.stat().st_mtime_ns)
    if _SYNCED_MTIME == mtime_key:
        from nasa_api.models import SpatialHazardEvent
        return SpatialHazardEvent.objects.count()

    from django.db import transaction
    from nasa_api.models import SpatialHazardEvent

    frame = load_spatial_catalog()
    if frame.empty:
        return 0

    existing_count = SpatialHazardEvent.objects.count()
    if existing_count == len(frame) and _SYNCED_MTIME is None:
        _SYNCED_MTIME = mtime_key
        return existing_count

    records = []
    for _, row in frame.iterrows():
        date_val = str(row.get("date") or f"{row['period']}-15")[:10]
        try:
            parsed_date = datetime.date.fromisoformat(date_val)
        except ValueError:
            parsed_date = datetime.date.fromisoformat(f"{row['period']}-15")
        score_val = row.get("score")
        prob_val = row.get("probability")
        records.append(
            SpatialHazardEvent(
                event_id=str(row["event_id"]),
                period=str(row["period"]),
                date=parsed_date,
                hazard_type=str(row["hazard_type"]),
                name=str(row["name"]),
                state_clave=str(row["state_clave"]).zfill(2),
                state_name=str(row["state_name"]),
                longitude=float(row["longitude"]),
                latitude=float(row["latitude"]),
                severity=float(row["severity"]),
                radius_km=int(row.get("radius_km") or 80),
                score=None if pd.isna(score_val) else float(score_val),
                probability=None if pd.isna(prob_val) else float(prob_val),
                evidence=str(row.get("evidence") or "proxy"),
                observed=bool(row.get("observed", False)),
                source=str(row.get("source") or "data/processed/spatial_hazard_catalog.parquet"),
            )
        )
    with transaction.atomic():
        SpatialHazardEvent.objects.all().delete()
        SpatialHazardEvent.objects.bulk_create(records, batch_size=1000)
    _SYNCED_MTIME = mtime_key
    return len(records)


def _severity(value: Any) -> float:
    if value is None or pd.isna(value):
        return 0.0
    numeric = abs(float(value))
    return round(min(10.0, max(0.0, numeric * 2.0)), 1)


def _legacy_event_for(row: pd.Series, hazard_type: str, target_date: date) -> dict[str, Any] | None:
    definition = HAZARD_DEFINITIONS.get(hazard_type)
    if definition is None:
        return None
    score_column, evidence_column, label = definition
    evidence = str(row.get(evidence_column, "no_confirmable"))
    score = row.get(score_column)
    observed = bool(row.get("fire_observed", False)) if hazard_type == "incendio" else False
    if pd.isna(score) and not observed:
        return None
    if pd.isna(score) and observed:
        score = min(10.0, float(np.log1p(row.get("firms_fire_count", 1))))
    return {
        "type": "Feature",
        "id": f"{hazard_type}-{row['month']}",
        "geometry": {"type": "Point", "coordinates": list(FALLBACK_COORDINATES)},
        "properties": {
            "id": f"{hazard_type}-{row['month']}",
            "type": hazard_type,
            "name": label,
            "severity": _severity(score),
            "radius_km": 150,
            "date": target_date.isoformat(),
            "month": row["month"],
            "score": None if pd.isna(score) else round(float(score), 5),
            "evidence": evidence,
            "observed": observed,
            "source": "data/processed/hazard_catalog.parquet",
        },
    }


def _model_to_feature(event: Any) -> dict[str, Any]:
    return {
        "type": "Feature",
        "id": event.event_id,
        "geometry": {"type": "Point", "coordinates": [round(event.longitude, 5), round(event.latitude, 5)]},
        "properties": {
            "id": event.event_id,
            "type": event.hazard_type,
            "name": event.name,
            "state_clave": event.state_clave,
            "state_name": event.state_name,
            "severity": round(float(event.severity), 1),
            "radius_km": int(event.radius_km),
            "date": event.date.isoformat(),
            "month": event.period,
            "score": None if event.score is None else round(float(event.score), 4),
            "probability": None if event.probability is None else round(float(event.probability), 4),
            "evidence": event.evidence,
            "observed": bool(event.observed),
            "source": event.source,
        },
    }


def events_for_period(
    period: str,
    *,
    hazard_type: str | None = None,
    state_clave: str | None = None,
) -> list[dict[str, Any]]:
    """Query PostgreSQL for all spatial events in a YYYY-MM period."""
    if _spatial_catalog_path().exists():
        try:
            ensure_postgres_catalog_synced()
            from nasa_api.models import SpatialHazardEvent

            queryset = SpatialHazardEvent.objects.filter(period=period)
            if hazard_type and hazard_type != "todos":
                queryset = queryset.filter(hazard_type=hazard_type)
            if state_clave:
                queryset = queryset.filter(state_clave=str(state_clave).zfill(2))
            results = [_model_to_feature(item) for item in queryset.order_by("-observed", "-severity", "state_clave")]
            if results:
                return results
        except Exception:
            frame = load_spatial_catalog()
            if not frame.empty:
                sub = frame[frame["period"] == period]
                if hazard_type and hazard_type != "todos":
                    sub = sub[sub["hazard_type"] == hazard_type]
                if state_clave:
                    sub = sub[sub["state_clave"] == str(state_clave).zfill(2)]
                return [
                    {
                        "type": "Feature",
                        "id": str(r["event_id"]),
                        "geometry": {"type": "Point", "coordinates": [float(r["longitude"]), float(r["latitude"])]},
                        "properties": {
                            "id": str(r["event_id"]),
                            "type": str(r["hazard_type"]),
                            "name": str(r["name"]),
                            "state_clave": str(r["state_clave"]),
                            "state_name": str(r["state_name"]),
                            "severity": float(r["severity"]),
                            "radius_km": int(r["radius_km"]),
                            "date": str(r["date"]),
                            "month": str(r["period"]),
                            "score": None if pd.isna(r.get("score")) else round(float(r["score"]), 4),
                            "probability": None if pd.isna(r.get("probability")) else round(float(r["probability"]), 4),
                            "evidence": str(r.get("evidence", "proxy")),
                            "observed": bool(r.get("observed", False)),
                            "source": str(r.get("source", "data/processed/spatial_hazard_catalog.parquet")),
                        },
                    }
                    for _, r in sub.iterrows()
                ]
    return []


def events_for_date(
    target_date: date,
    *,
    hazard_type: str | None = None,
    state_clave: str | None = None,
) -> list[dict[str, Any]]:
    period = target_date.strftime("%Y-%m")
    spatial_events = events_for_period(period, hazard_type=hazard_type, state_clave=state_clave)
    if spatial_events or _spatial_catalog_path().exists() or state_clave:
        return spatial_events
    frame = load_catalog()
    matches = frame[frame["month"] == period]
    if matches.empty:
        return []
    row = matches.iloc[0]
    events = []
    for h_type in HAZARD_DEFINITIONS:
        if hazard_type and hazard_type != "todos" and h_type != hazard_type:
            continue
        event = _legacy_event_for(row, h_type, target_date)
        if event is not None:
            events.append(event)
    return events


def timemap_summary(*, hazard_type: str | None = None, state_clave: str | None = None) -> dict[str, Any]:
    """Build the interactive TimeMap timeline with markers for every event period."""
    if _spatial_catalog_path().exists():
        try:
            ensure_postgres_catalog_synced()
            from nasa_api.models import SpatialHazardEvent

            queryset = SpatialHazardEvent.objects.all()
            if hazard_type and hazard_type != "todos":
                queryset = queryset.filter(hazard_type=hazard_type)
            if state_clave:
                queryset = queryset.filter(state_clave=str(state_clave).zfill(2))
            rows = list(
                queryset.values(
                    "period",
                    "date",
                    "hazard_type",
                    "name",
                    "state_clave",
                    "state_name",
                    "severity",
                    "observed",
                    "evidence",
                )
            )
        except Exception:
            frame = load_spatial_catalog()
            if hazard_type and hazard_type != "todos":
                frame = frame[frame["hazard_type"] == hazard_type]
            if state_clave:
                frame = frame[frame["state_clave"] == str(state_clave).zfill(2)]
            rows = frame.to_dict(orient="records")
    else:
        rows = []

    if not rows:
        return {"available": False, "total_events": 0, "total_periods": 0, "markers": []}

    df = pd.DataFrame(rows)
    df["date_str"] = df["date"].astype(str).str.slice(0, 10)
    markers: list[dict[str, Any]] = []
    for period, group in df.groupby("period", sort=True):
        # Prioritize observed events or highest severity for the headline of the timeline marker
        ordered = group.sort_values(["observed", "severity"], ascending=[False, False])
        lead = ordered.iloc[0]
        type_counts = group["hazard_type"].value_counts().to_dict()
        states_list = sorted(group["state_name"].dropna().unique().tolist())
        markers.append(
            {
                "period": str(period),
                "date": str(lead["date_str"]),
                "headline": str(lead["name"]),
                "dominant_type": str(lead["hazard_type"]),
                "max_severity": round(float(group["severity"].max()), 1),
                "total": int(len(group)),
                "observed_count": int(group["observed"].sum()),
                "has_observed": bool(group["observed"].any()),
                "counts": {
                    "sismo": int(type_counts.get("sismo", 0)),
                    "huracan": int(type_counts.get("huracan", 0)),
                    "sequia": int(type_counts.get("sequia", 0)),
                    "inundacion": int(type_counts.get("inundacion", 0)),
                    "incendio": int(type_counts.get("incendio", 0)),
                },
                "states_count": len(states_list),
                "states_affected": len(states_list),
                "states": states_list[:6],
            }
        )

    return {
        "available": True,
        "first_period": markers[0]["period"],
        "last_period": markers[-1]["period"],
        "total_periods": len(markers),
        "total_events": int(len(df)),
        "states_covered": int(df["state_clave"].nunique()),
        "markers": markers,
    }


def catalog_status() -> dict[str, Any]:
    path = _catalog_path()
    frame = load_catalog()
    spatial_path = _spatial_catalog_path()
    spatial_count = 0
    states_covered = 0
    if spatial_path.exists():
        spatial_count = ensure_postgres_catalog_synced()
        s_df = load_spatial_catalog()
        states_covered = int(s_df["state_clave"].nunique()) if not s_df.empty else 0
    return {
        "available": True,
        "database_engine": "postgresql",
        "path": str(path),
        "spatial_catalog_path": str(spatial_path) if spatial_path.exists() else None,
        "spatial_events_in_postgres": spatial_count,
        "states_covered": states_covered,
        "updated_at": date.fromtimestamp(path.stat().st_mtime).isoformat(),
        "months": int(frame["month"].nunique()),
        "first_month": frame["month"].min(),
        "last_month": frame["month"].max(),
        "evidence": {
            column: frame[column].value_counts(dropna=False).to_dict()
            for column in ("fire_evidence", "drought_evidence", "flood_evidence", "tectonic_evidence")
            if column in frame
        },
    }
