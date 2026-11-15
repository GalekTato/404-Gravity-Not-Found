"""Export precomputed JSON snapshots for standalone GitHub Pages deployment."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nasa_api.settings")

import pandas as pd

from nasa_api.services.catalog import load_spatial_catalog, model_metrics_summary


def main() -> None:
    out_dir = ROOT / "public" / "data-snapshots"
    out_dir.mkdir(parents=True, exist_ok=True)

    df = load_spatial_catalog()
    features = []
    for _, r in df.iterrows():
        features.append(
            {
                "type": "Feature",
                "id": str(r["event_id"]),
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(float(r["longitude"]), 5), round(float(r["latitude"]), 5)],
                },
                "properties": {
                    "id": str(r["event_id"]),
                    "type": str(r["hazard_type"]),
                    "name": str(r["name"]),
                    "state_clave": str(r["state_clave"]).zfill(2),
                    "state_name": str(r["state_name"]),
                    "severity": round(float(r["severity"]), 2),
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
        )

    catalog_payload = {
        "type": "FeatureCollection",
        "metadata": {
            "date": "2026-11-15",
            "count": len(features),
            "region": "México (32 entidades federativas · Snapshot estático)",
            "projection": "Eventos e indicadores multisensor geolocalizados por entidad",
        },
        "features": features,
    }
    (out_dir / "catalog-events.json").write_text(
        json.dumps(catalog_payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    metrics = model_metrics_summary()
    (out_dir / "model-metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Exported {len(features)} events and model-metrics.json to {out_dir}")


if __name__ == "__main__":
    main()
