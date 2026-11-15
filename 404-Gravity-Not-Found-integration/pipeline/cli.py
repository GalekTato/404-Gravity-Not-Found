from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from hardware_runtime import ResourceMonitor, profile_stage

from .benchmark import compare_cpu_modes, write_benchmark
from .cleaning import clean_firms_csv, clean_npz_directory
from .config import PipelineConfig
from .features import build_features
from .backtesting import backtest_catalog
from .ground_truth import (
    download_eonet_wildfires,
    download_ibtracs,
    download_usgs_earthquakes,
    normalize_firms_labels,
    normalize_ibtracs_labels,
    normalize_usgs_labels,
)
from .lazy_benchmark import benchmark_gpm_backends
from .hazards import build_hazard_catalog, build_spatial_hazard_catalog
from .inventory import build_inventory
from .models import infer_anomalies, train_anomaly_model
from .paths import resolve_data_paths
from .scientific import aggregate_all_data
from .spatial import aggregate_state_features

LOGGER = logging.getLogger("pipeline")


def _paths(config: PipelineConfig) -> tuple[Path, Path]:
    source = resolve_data_paths(config.root).alos
    cleaned = config.interim_root / "alos_clean"
    return source, cleaned


def _sar_paths(config: PipelineConfig) -> tuple[Path, Path]:
    source = resolve_data_paths(config.root).nisar
    cleaned = config.interim_root / "nisar_clean"
    return source, cleaned


def run(config: PipelineConfig) -> None:
    runtime = config.runtime
    source, cleaned = _paths(config)
    nisar_source, nisar_cleaned = _sar_paths(config)
    firms = resolve_data_paths(config.root).firms
    inventory = build_inventory(config.root)
    (config.output_root / "data_inventory.json").write_text(
        json.dumps(inventory, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    with ResourceMonitor(runtime.monitor_interval_seconds, runtime.ram_fraction):
        with profile_stage("cleaning"):
            clean_npz_directory(
                source,
                cleaned,
                workers=runtime.workers,
                minimum_files=runtime.parallel_min_files,
                minimum_bytes=runtime.parallel_min_bytes,
            )
            clean_npz_directory(
                nisar_source,
                nisar_cleaned,
                workers=runtime.workers,
                minimum_files=runtime.parallel_min_files,
                minimum_bytes=runtime.parallel_min_bytes,
            )
            clean_firms_csv(firms, config.interim_root)
        features = config.interim_root / "alos_features.parquet"
        with profile_stage("features"):
            build_features(
                cleaned,
                features,
                workers=runtime.workers,
                minimum_files=runtime.parallel_min_files,
                minimum_bytes=runtime.parallel_min_bytes,
            )
            build_features(
                nisar_cleaned,
                config.interim_root / "nisar_features.parquet",
                workers=runtime.workers,
                minimum_files=runtime.parallel_min_files,
                minimum_bytes=runtime.parallel_min_bytes,
            )
        with profile_stage("scientific_aggregation"):
            monthly = aggregate_all_data(config.root, config.interim_root / "mexico_monthly_features.parquet")
            state_monthly = aggregate_state_features(
                config.root,
                config.interim_root / "mexico_state_monthly_features.parquet",
                workers=runtime.workers,
                minimum_files=runtime.parallel_min_files,
                minimum_bytes=runtime.parallel_min_bytes,
            )
            build_hazard_catalog(
                monthly,
                config.output_root / "hazard_catalog.parquet",
                (
                    config.interim_root / "alos_features.parquet",
                    config.interim_root / "nisar_features.parquet",
                ),
            )
            build_spatial_hazard_catalog(
                config.root,
                state_monthly,
                config.output_root / "spatial_hazard_catalog.parquet",
            )
        model = config.output_root / "isolation_forest.joblib"
        with profile_stage("training"):
            train_anomaly_model(features, model, seed=runtime.seed, workers=runtime.workers)
        with profile_stage("inference"):
            infer_anomalies(features, model, config.output_root / "alos_anomalies.parquet")


def main() -> None:
    parser = argparse.ArgumentParser(description="Resource-aware geospatial pipeline")
    parser.add_argument(
        "command",
        choices=("inventory", "run", "benchmark", "ground-truth", "backtest", "lazy-benchmark"),
    )
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    config = PipelineConfig.from_root(args.root)
    if args.command == "inventory":
        print(json.dumps(build_inventory(config.root), indent=2, ensure_ascii=False))
    elif args.command == "ground-truth":
        external_root = config.interim_root / "external"
        earthquake_json = download_usgs_earthquakes(external_root / "usgs_earthquakes.geojson")
        normalize_usgs_labels(earthquake_json, external_root / "usgs_earthquake_labels.parquet")
        eonet_json = download_eonet_wildfires(external_root / "eonet_wildfires.json")
        normalize_firms_labels(
            config.data_paths.firms,
            external_root / "firms_labels.parquet",
            external_wildfires=eonet_json,
        )
        ibtracs_csv = download_ibtracs(external_root / "ibtracs_na.csv")
        normalize_ibtracs_labels(ibtracs_csv, external_root / "ibtracs_labels.parquet")
        LOGGER.info("Ground truth written to %s", external_root)
    elif args.command == "backtest":
        labels = config.interim_root / "external"
        if not (labels / "usgs_earthquake_labels.parquet").exists():
            raise FileNotFoundError("Run `ground-truth` before `backtest`.")
        output = config.output_root / "backtest.json"
        backtest_catalog(config.output_root / "hazard_catalog.parquet", labels, output)
        LOGGER.info("Backtest written to %s", output)
    elif args.command == "lazy-benchmark":
        source = next(resolve_data_paths(config.root).gpm.glob("*.HDF5"), None)
        if source is None:
            raise FileNotFoundError("No GPM HDF5 source was found.")
        output = config.output_root / "lazy_benchmark.json"
        benchmark_gpm_backends(source, output)
        LOGGER.info("Lazy backend benchmark written to %s", output)
    elif args.command == "run":
        run(config)
    else:
        source, cleaned = _paths(config)
        def benchmark_clean(workers: int):
            return clean_npz_directory(
                source,
                cleaned,
                workers=workers,
                minimum_files=1,
                minimum_bytes=0,
            )

        results = compare_cpu_modes(
            "cleaning",
            benchmark_clean,
            parallel_workers=config.runtime.workers,
        )
        results.append({
            "name": "gpu",
            "available": config.runtime.gpu_enabled,
            "note": "Neural AMP path is validated separately; classical anomaly model remains CPU-compatible.",
        })
        write_benchmark(results, config.output_root / "benchmark.json")


if __name__ == "__main__":
    main()
