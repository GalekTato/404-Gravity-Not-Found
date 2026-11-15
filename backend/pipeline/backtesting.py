from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, f1_score, precision_score, recall_score, roc_auc_score


SCORE_COLUMNS = {
    "incendio": "fire_risk_score_proxy",
    "sequia": "drought_score_proxy",
    "inundacion": "flood_score_proxy",
    "sismo": "tectonic_score_proxy",
}


def _optimal_train_threshold(scores: pd.Series, labels: pd.Series) -> float:
    """Learn the classification threshold strictly on the training split to maximize F1."""
    y_train = labels.astype(bool).to_numpy()
    s_train = scores.to_numpy(dtype=float)
    if len(np.unique(y_train)) < 2:
        return float(scores.quantile(0.8))
    best_threshold = float(scores.quantile(0.8))
    best_f1 = -1.0
    for q in np.linspace(0.10, 0.88, 40):
        candidate = float(np.quantile(s_train, q))
        pred = s_train >= candidate
        score = float(f1_score(y_train, pred, zero_division=0))
        if score > best_f1:
            best_f1 = score
            best_threshold = candidate
    return best_threshold


def backtest_catalog(
    catalog: str | Path,
    labels: str | Path,
    output: str | Path,
    *,
    test_fraction: float = 0.2,
) -> Path:
    """Evaluate hazard scores using a strict per-hazard chronological train/test split."""
    if not 0 < test_fraction < 1:
        raise ValueError("test_fraction must be between zero and one.")
    predictions = pd.read_parquet(catalog)
    label_paths = [Path(labels)] if Path(labels).is_file() else sorted(Path(labels).glob("*.parquet"))
    observed = (
        pd.concat((pd.read_parquet(path) for path in label_paths), ignore_index=True)
        if label_paths
        else pd.DataFrame(columns=["month", "hazard_type", "observed"])
    )
    required = {"month", "hazard_type", "observed"}
    missing = required - set(observed.columns)
    if missing:
        raise ValueError(f"Ground-truth labels are missing columns: {sorted(missing)}")
    observed["month"] = pd.to_datetime(observed["month"], errors="coerce").dt.strftime("%Y-%m")
    predictions["month"] = pd.to_datetime(predictions["month"], errors="coerce").dt.strftime("%Y-%m")
    results: list[dict[str, object]] = []
    skipped: list[dict[str, object]] = []
    for hazard_type, score_column in SCORE_COLUMNS.items():
        if score_column not in predictions:
            skipped.append(
                {
                    "hazard_type": hazard_type,
                    "reason": f"Score column '{score_column}' is missing from the catalog.",
                }
            )
            continue
        finite_predictions = (
            predictions[["month", score_column]]
            .replace([np.inf, -np.inf], np.nan)
            .dropna(subset=["month", score_column])
        )
        if finite_predictions.empty:
            skipped.append(
                {
                    "hazard_type": hazard_type,
                    "reason": (
                        f"Catalog has zero finite values for '{score_column}' "
                        "(insufficient sensor/SAR temporal pairs)."
                    ),
                }
            )
            continue
        labels_for_hazard = observed[observed["hazard_type"] == hazard_type].dropna(subset=["month"])
        if labels_for_hazard.empty:
            skipped.append(
                {
                    "hazard_type": hazard_type,
                    "reason": f"No independent ground-truth labels are available for hazard '{hazard_type}'.",
                }
            )
            continue
        source_name = (
            str(labels_for_hazard["source"].dropna().iloc[0])
            if "source" in labels_for_hazard and not labels_for_hazard["source"].dropna().empty
            else "external"
        )
        dedup_labels = (
            labels_for_hazard.groupby("month", as_index=False)
            .agg(observed=("observed", "max"))
        )
        merged = (
            finite_predictions.merge(dedup_labels, on="month", how="inner")
            .sort_values("month")
            .reset_index(drop=True)
        )
        hazard_months = sorted(merged["month"].unique())
        if len(hazard_months) < 2:
            skipped.append(
                {
                    "hazard_type": hazard_type,
                    "reason": (
                        f"Insufficient overlapping months ({len(hazard_months)}) between finite catalog "
                        "scores and ground-truth coverage for a chronological train/test split."
                    ),
                }
            )
            continue
        split_index = max(1, int(len(hazard_months) * (1 - test_fraction)))
        train_months = set(hazard_months[:split_index])
        test_months = set(hazard_months[split_index:])
        train = merged[merged["month"].isin(train_months)]
        test = merged[merged["month"].isin(test_months)]
        if train.empty or test.empty:
            skipped.append(
                {
                    "hazard_type": hazard_type,
                    "reason": "Insufficient finite scores or overlapping train/test months.",
                }
            )
            continue
        threshold = _optimal_train_threshold(train[score_column], train["observed"])
        predicted = test[score_column] >= threshold
        actual = test["observed"].astype(bool)
        normalized_score = 1.0 / (1.0 + np.exp(-test[score_column].clip(-20, 20)))
        roc_auc = (
            float(roc_auc_score(actual, normalized_score))
            if len(np.unique(actual)) >= 2
            else None
        )
        results.append(
            {
                "hazard_type": hazard_type,
                "source": source_name,
                "train_months": len(train_months),
                "test_months": len(test_months),
                "positive_test_months": int(actual.sum()),
                "threshold": threshold,
                "precision": float(precision_score(actual, predicted, zero_division=0)),
                "recall": float(recall_score(actual, predicted, zero_division=0)),
                "f1": float(f1_score(actual, predicted, zero_division=0)),
                "roc_auc": roc_auc,
                "brier_score": float(brier_score_loss(actual, normalized_score)),
            }
        )
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps({"results": results, "skipped": skipped}, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return output
