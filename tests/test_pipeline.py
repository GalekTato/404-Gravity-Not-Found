from pathlib import Path

import numpy as np

from pipeline.features import _tile_features
from pipeline.execution import select_training_jobs, select_workers
from pipeline.inventory import build_inventory
from pipeline.paths import resolve_data_paths
from pipeline.scientific import _month_from_name, _slice


def test_tile_features_are_finite(tmp_path: Path):
    path = tmp_path / "tile.clean.npz"
    np.savez_compressed(
        path,
        co_pol=np.array([[1, np.nan]], dtype=np.float32),
        cross_pol=np.array([[2, 1]], dtype=np.float32),
    )
    result = _tile_features(str(path))
    assert np.isfinite(result["co_pol_mean"])
    assert np.isfinite(result["log_ratio_mean"])


def test_inventory_handles_empty_root(tmp_path: Path):
    result = build_inventory(tmp_path)
    assert set(result["groups"]) == {"alos", "nisar", "firms", "gpm", "modis", "gldas"}
    assert all(group["count"] == 0 for group in result["groups"].values())
    assert all(not group["available"] for group in result["groups"].values())
    assert len(result["warnings"]) == 6


def test_usgs_normalization_creates_complete_monthly_series(tmp_path: Path):
    import json
    import pandas as pd
    from pipeline.ground_truth import normalize_usgs_labels

    geojson_path = tmp_path / "usgs.geojson"
    # 2020-01-15 UTC (1579046400000 ms) and 2020-03-15 UTC (1584230400000 ms)
    geojson_path.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {"properties": {"time": 1579046400000, "mag": 4.5}},
                    {"properties": {"time": 1584230400000, "mag": 5.1}},
                ],
            }
        ),
        encoding="utf-8",
    )
    output_path = tmp_path / "usgs_labels.parquet"
    normalize_usgs_labels(geojson_path, output_path)
    frame = pd.read_parquet(output_path)
    assert list(frame["month"]) == ["2020-01", "2020-02", "2020-03"]
    assert list(frame["observed"]) == [True, False, True]
    assert list(frame["event_count"]) == [1, 0, 1]


def test_backtest_evaluates_per_hazard_chronological_split(tmp_path: Path):
    import json
    import pandas as pd
    from pipeline.backtesting import backtest_catalog

    months = [f"2020-{m:02d}" for m in range(1, 11)]
    catalog_path = tmp_path / "catalog.parquet"
    pd.DataFrame(
        {
            "month": months,
            "fire_risk_score_proxy": [0.1, 0.2, 0.9, 0.1, 0.8, 0.2, 0.1, 0.9, 0.2, 0.95],
            "drought_score_proxy": [0.1] * 10,
            "flood_score_proxy": [0.2] * 10,
            "tectonic_score_proxy": [float("nan")] * 10,
        }
    ).to_parquet(catalog_path, index=False)

    labels_path = tmp_path / "labels.parquet"
    # Fire only covers 2020-01..2020-10, while another hazard covers 1900-01..1950-12
    fire_labels = pd.DataFrame(
        {
            "month": months,
            "hazard_type": ["incendio"] * 10,
            "observed": [False, False, True, False, True, False, False, True, False, True],
            "source": ["test_fire"] * 10,
        }
    )
    old_labels = pd.DataFrame(
        {
            "month": [f"1900-{m:02d}" for m in range(1, 13)],
            "hazard_type": ["sismo"] * 12,
            "observed": [True] * 12,
            "source": ["test_usgs"] * 12,
        }
    )
    pd.concat([fire_labels, old_labels], ignore_index=True).to_parquet(labels_path, index=False)

    output_path = tmp_path / "backtest.json"
    backtest_catalog(catalog_path, labels_path, output_path, test_fraction=0.2)
    report = json.loads(output_path.read_text(encoding="utf-8"))
    evaluated_hazards = {row["hazard_type"] for row in report["results"]}
    assert "incendio" in evaluated_hazards
    skipped_reasons = {row["hazard_type"]: row["reason"] for row in report["skipped"]}
    assert "zero finite values" in skipped_reasons["sismo"]
    assert "No independent ground-truth labels" in skipped_reasons["sequia"]


def test_scientific_dates_normalize_months():
    assert _month_from_name(Path("MOD11C3.A2010001.061.hdf")) == "2010-01"
    assert _month_from_name(Path("GLDAS_NOAH025_M.A201001.021.nc4")) == "2010-01"
    assert _month_from_name(Path("3B-MO.20100101.HDF5")) == "2010-01"


def test_coordinate_slice_preserves_descending_source_indices():
    values = np.array([4.0, 3.0, 2.0, 1.0, 0.0])
    selected = values[_slice(values, 1.5, 3.5)]
    np.testing.assert_array_equal(selected, np.array([3.0, 2.0]))


def test_empty_feature_export_is_readable(tmp_path: Path):
    from pipeline.features import build_features, read_features

    output = tmp_path / "empty.parquet"
    build_features(tmp_path / "missing", output, workers=1)
    assert read_features(output).empty


def test_data_paths_support_direct_and_archive_layouts(tmp_path: Path):
    direct_alos = tmp_path / "alos_mexico_reducido" / "content" / "hackaton_alos" / "datos_reducidos"
    archive_firms = tmp_path / "Hack" / "Datos" / "datos_firms_incendios"
    direct_alos.mkdir(parents=True)
    archive_firms.mkdir(parents=True)
    paths = resolve_data_paths(tmp_path)
    assert paths.alos == direct_alos
    assert paths.firms == archive_firms


def test_parallel_policy_avoids_small_process_pools(tmp_path: Path):
    files = [tmp_path / "small.npz"]
    files[0].write_bytes(b"small")
    assert select_workers(files, 14, minimum_files=8, minimum_bytes=1) == 1
    assert select_training_jobs(10, 14) == 1
