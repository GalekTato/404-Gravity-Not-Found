from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np

from .execution import select_training_jobs

LOGGER = logging.getLogger(__name__)


def train_anomaly_model(
    features_path: str | Path,
    model_path: str | Path,
    *,
    seed: int,
    workers: int = 1,
) -> Path:
    from sklearn.ensemble import IsolationForest
    import joblib
    import pandas as pd

    frame = pd.read_parquet(features_path)
    numeric = frame.select_dtypes(include=[np.number]).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    if numeric.empty:
        raise ValueError("No numeric features available for anomaly training")
    model = IsolationForest(
        n_estimators=200,
        contamination="auto",
        random_state=seed,
        n_jobs=select_training_jobs(len(numeric), workers),
    )
    model.fit(numeric.to_numpy(dtype=np.float32, copy=False))
    model_path = Path(model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "columns": list(numeric.columns)}, model_path, compress=3)
    return model_path


def infer_anomalies(features_path: str | Path, model_path: str | Path, output_path: str | Path) -> Path:
    import joblib
    import pandas as pd

    artifact: dict[str, Any] = joblib.load(model_path)
    frame = pd.read_parquet(features_path)
    columns = artifact.get("columns")
    if not isinstance(columns, list) or not all(isinstance(column, str) for column in columns):
        raise ValueError("The anomaly model artifact does not contain valid feature columns.")
    missing = sorted(set(columns) - set(frame.columns))
    if missing:
        raise ValueError(f"Feature columns are missing from the inference dataset: {missing}")
    values = frame[columns].replace([float("inf"), float("-inf")], 0).fillna(0)
    values_array = values.to_numpy(dtype=np.float32, copy=False)
    frame["anomaly_score"] = artifact["model"].decision_function(values_array)
    frame["is_anomaly"] = artifact["model"].predict(values_array) == -1
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_parquet(output_path, compression="zstd", index=False)
    return output_path
