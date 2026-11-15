from __future__ import annotations

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

CENTRO_MEXICO = (-102.5528, 23.6345)


def _data_root() -> Path:
    configured = os.environ.get("PIPELINE_DATA_ROOT")
    if configured:
        return Path(configured)
    repo_root = Path(__file__).resolve().parents[2]
    if (repo_root / "data" / "processed" / "hazard_catalog.parquet").exists():
        return repo_root
    return Path(__file__).resolve().parents[3]


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


def clear_catalog_cache() -> None:
    load_catalog.cache_clear()


def _severity(value: Any) -> float:
    if value is None or pd.isna(value):
        return 0.0
    numeric = abs(float(value))
    return round(min(10.0, max(0.0, numeric * 2.0)), 1)


def _event_for(row: pd.Series, hazard_type: str, target_date: date) -> dict[str, Any] | None:
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
        "geometry": {"type": "Point", "coordinates": list(CENTRO_MEXICO)},
        "properties": {
            "id": f"{hazard_type}-{row['month']}",
            "type": hazard_type,
            "name": label,
            "severity": _severity(score),
            "radius_km": 1100,
            "date": target_date.isoformat(),
            "month": row["month"],
            "score": None if pd.isna(score) else round(float(score), 5),
            "evidence": evidence,
            "observed": observed,
            "source": "data/processed/hazard_catalog.parquet",
        },
    }


def events_for_date(target_date: date) -> list[dict[str, Any]]:
    frame = load_catalog()
    month = target_date.strftime("%Y-%m")
    matches = frame[frame["month"] == month]
    if matches.empty:
        return []
    row = matches.iloc[0]
    events = []
    for hazard_type in HAZARD_DEFINITIONS:
        event = _event_for(row, hazard_type, target_date)
        if event is not None:
            events.append(event)
    return events


def catalog_status() -> dict[str, Any]:
    path = _catalog_path()
    frame = load_catalog()
    return {
        "available": True,
        "path": str(path),
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
