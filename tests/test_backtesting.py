import json
from pathlib import Path

import pandas as pd

from pipeline.backtesting import backtest_catalog
from pipeline.ground_truth import normalize_usgs_labels


def test_backtesting_uses_chronological_split(tmp_path: Path):
    months = pd.date_range("2020-01-01", periods=10, freq="MS").strftime("%Y-%m")
    pd.DataFrame(
        {
            "month": months,
            "fire_risk_score_proxy": range(10),
            "drought_score_proxy": [float("nan")] * 10,
            "flood_score_proxy": [float("nan")] * 10,
            "tectonic_score_proxy": [float("nan")] * 10,
        }
    ).to_parquet(tmp_path / "catalog.parquet", index=False)
    pd.DataFrame(
        {
            "month": months,
            "hazard_type": ["incendio"] * 10,
            "observed": [False] * 8 + [True, True],
        }
    ).to_parquet(tmp_path / "labels.parquet", index=False)

    output = backtest_catalog(tmp_path / "catalog.parquet", tmp_path / "labels.parquet", tmp_path / "metrics.json")
    payload = json.loads(output.read_text(encoding="utf-8"))

    assert payload["results"][0]["train_months"] == 8
    assert payload["results"][0]["test_months"] == 2


def test_normalize_usgs_labels(tmp_path: Path):
    source = tmp_path / "earthquakes.json"
    source.write_text(
        json.dumps(
            {
                "features": [
                    {"properties": {"time": 1577836800000, "mag": 4.2}},
                    {"properties": {"time": 1577923200000, "mag": 3.1}},
                ]
            }
        ),
        encoding="utf-8",
    )

    output = normalize_usgs_labels(source, tmp_path / "labels.parquet")
    labels = pd.read_parquet(output)

    assert labels.loc[0, "month"] == "2020-01"
    assert labels.loc[0, "event_count"] == 2
