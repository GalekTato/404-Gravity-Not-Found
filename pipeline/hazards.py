from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .scientific import MEXICO_BBOX
from .spatial import assign_states, load_states, prepare_state_geometries

LOGGER = logging.getLogger(__name__)


def _seasonal_z(frame: pd.DataFrame, column: str, group_cols: list[str] | str = "month_num") -> pd.Series:
    if column not in frame:
        return pd.Series(np.nan, index=frame.index)
    baseline = frame.groupby(group_cols)[column].transform("mean")
    scale = frame.groupby(group_cols)[column].transform("std").replace(0, np.nan)
    return (frame[column] - baseline) / scale


def _global_z(frame: pd.DataFrame, column: str, group_col: str | None = None) -> pd.Series:
    if column not in frame:
        return pd.Series(np.nan, index=frame.index)
    if group_col and group_col in frame:
        baseline = frame.groupby(group_col)[column].transform("mean")
        scale = frame.groupby(group_col)[column].transform("std").replace(0, np.nan)
        return (frame[column] - baseline) / scale
    mean_val = frame[column].mean()
    std_val = frame[column].std()
    if pd.isna(std_val) or std_val == 0:
        return pd.Series(0.0, index=frame.index)
    return (frame[column] - mean_val) / std_val


def _engineer_temporal_features(frame: pd.DataFrame, group_col: str | None = None) -> pd.DataFrame:
    """Add causal lag, rolling, and physical interaction features without future leakage."""
    frame = frame.copy()
    dt = pd.to_datetime(frame["month"] + "-01", errors="coerce")
    frame["month_num"] = dt.dt.month
    frame["month_sin"] = np.sin(2.0 * np.pi * frame["month_num"] / 12.0)
    frame["month_cos"] = np.cos(2.0 * np.pi * frame["month_num"] / 12.0)

    z_group: list[str] | str = [group_col, "month_num"] if group_col else "month_num"
    for col in (
        "modis_lst_day_mean",
        "modis_lst_day_p95",
        "modis_lst_night_mean",
        "gpm_precip_mean",
        "gpm_precip_p95",
        "gpm_precip_max",
        "gldas_soil_moisture_mean",
        "gldas_root_moisture_mean",
        "gldas_runoff_surface_p95",
        "gldas_rain_p95",
        "gldas_air_temp_mean",
    ):
        if col in frame:
            frame[f"{col}_z"] = _seasonal_z(frame, col, z_group)
            frame[f"{col}_gz"] = _global_z(frame, col, group_col)

    if "modis_lst_day_mean" in frame and "modis_lst_night_mean" in frame:
        frame["diurnal_temp_range"] = frame["modis_lst_day_mean"] - frame["modis_lst_night_mean"]
        frame["diurnal_temp_range_z"] = _seasonal_z(frame, "diurnal_temp_range", z_group)
        frame["diurnal_temp_range_gz"] = _global_z(frame, "diurnal_temp_range", group_col)
    else:
        frame["diurnal_temp_range_z"] = 0.0
        frame["diurnal_temp_range_gz"] = 0.0

    if "gpm_precip_p95" in frame and "gpm_precip_mean" in frame:
        frame["rain_intensity_ratio"] = frame["gpm_precip_p95"] / (frame["gpm_precip_mean"].clip(lower=0) + 0.01)
        frame["rain_intensity_ratio_z"] = _seasonal_z(frame, "rain_intensity_ratio", z_group)
    else:
        frame["rain_intensity_ratio_z"] = 0.0

    # Causal rolling 3-month features (past and current month only)
    for base_col, out_col in (
        ("gpm_precip_mean_z", "precip_3m_z"),
        ("gldas_soil_moisture_mean_z", "soil_moisture_3m_z"),
        ("modis_lst_day_mean_z", "lst_day_3m_z"),
        ("gldas_soil_moisture_mean_gz", "soil_moisture_3m_gz"),
        ("modis_lst_day_mean_gz", "lst_day_3m_gz"),
    ):
        if base_col in frame:
            if group_col:
                frame[out_col] = (
                    frame.groupby(group_col)[base_col]
                    .transform(lambda s: s.rolling(3, min_periods=1).mean())
                )
                frame[f"{base_col}_lag1"] = frame.groupby(group_col)[base_col].shift(1).fillna(0.0)
            else:
                frame[out_col] = frame[base_col].rolling(3, min_periods=1).mean()
                frame[f"{base_col}_lag1"] = frame[base_col].shift(1).fillna(0.0)

    lst_z = frame.get("modis_lst_day_mean_z", pd.Series(0.0, index=frame.index)).fillna(0.0)
    lst_gz = frame.get("modis_lst_day_mean_gz", lst_z).fillna(0.0)
    precip_z = frame.get("gpm_precip_mean_z", pd.Series(0.0, index=frame.index)).fillna(0.0)
    precip_gz = frame.get("gpm_precip_mean_gz", precip_z).fillna(0.0)
    soil_z = frame.get("gldas_soil_moisture_mean_z", pd.Series(0.0, index=frame.index)).fillna(0.0)
    soil_gz = frame.get("gldas_soil_moisture_mean_gz", soil_z).fillna(0.0)
    precip_3m_z = frame.get("precip_3m_z", precip_z).fillna(0.0)
    soil_3m_z = frame.get("soil_moisture_3m_z", soil_z).fillna(0.0)
    dtr_z = frame.get("diurnal_temp_range_z", pd.Series(0.0, index=frame.index)).fillna(0.0)
    dtr_gz = frame.get("diurnal_temp_range_gz", dtr_z).fillna(0.0)

    frame["fire_physical_index"] = (
        0.25 * lst_gz
        + 0.15 * lst_z
        + 0.15 * dtr_gz
        - 0.25 * soil_gz
        - 0.10 * soil_3m_z
        - 0.10 * precip_gz
    )
    frame["drought_physical_index"] = (
        -0.45 * precip_3m_z
        - 0.35 * soil_3m_z
        + 0.20 * lst_z
    )
    p95_z = frame.get("gpm_precip_p95_z", pd.Series(0.0, index=frame.index)).fillna(0.0)
    runoff_z = frame.get("gldas_runoff_surface_p95_z", pd.Series(0.0, index=frame.index)).fillna(0.0)
    rain_z = frame.get("gldas_rain_p95_z", pd.Series(0.0, index=frame.index)).fillna(0.0)
    intensity_z = frame.get("rain_intensity_ratio_z", pd.Series(0.0, index=frame.index)).fillna(0.0)
    frame["flood_physical_index"] = (
        0.40 * p95_z
        + 0.30 * runoff_z
        + 0.20 * rain_z
        + 0.10 * intensity_z
    )
    return frame


def _fit_calibrated_score(
    frame: pd.DataFrame,
    label_path: Path,
    hazard_type: str,
    feature_cols: list[str],
    fallback_col: str,
    *,
    test_fraction: float = 0.2,
) -> tuple[pd.Series, pd.Series]:
    """Train a strictly chronological supervised ensemble on training months and return (logit_score, probability)."""
    from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    raw_fallback = frame[fallback_col].astype(float)
    prob_fallback = 1.0 / (1.0 + np.exp(-raw_fallback.clip(-15, 15)))
    if not label_path.exists():
        return raw_fallback, prob_fallback

    labels = pd.read_parquet(label_path)
    labels = labels[labels["hazard_type"] == hazard_type].dropna(subset=["month"])
    if labels.empty:
        return raw_fallback, prob_fallback

    available_cols = [c for c in feature_cols if c in frame.columns and frame[c].notna().any()]
    if not available_cols:
        return raw_fallback, prob_fallback

    dedup = labels.groupby("month", as_index=False).agg(observed=("observed", "max"))
    valid_score_mask = frame[fallback_col].notna()
    overlap_months = sorted(set(frame.loc[valid_score_mask, "month"]) & set(dedup["month"]))
    if len(overlap_months) < 12:
        return raw_fallback, prob_fallback

    split_index = max(1, int(len(overlap_months) * (1.0 - test_fraction)))
    train_months = set(overlap_months[:split_index])
    merged = frame[["month"] + available_cols].merge(dedup, on="month", how="left")
    train_mask = merged["month"].isin(train_months) & merged["observed"].notna() & valid_score_mask
    y_train = merged.loc[train_mask, "observed"].astype(int).to_numpy()
    if len(np.unique(y_train)) < 2:
        return raw_fallback, prob_fallback

    X_all = merged[available_cols].replace([np.inf, -np.inf], np.nan).to_numpy(dtype=np.float32)
    X_train = X_all[train_mask.to_numpy()]

    lr_pipe = make_pipeline(
        SimpleImputer(strategy="median"),
        StandardScaler(),
        LogisticRegression(C=0.6, class_weight="balanced", max_iter=500, random_state=20261115),
    )
    rf_pipe = make_pipeline(
        SimpleImputer(strategy="median"),
        RandomForestClassifier(
            n_estimators=250,
            max_depth=5,
            min_samples_leaf=3,
            class_weight="balanced_subsample",
            random_state=20261115,
            n_jobs=1,
        ),
    )
    et_pipe = make_pipeline(
        SimpleImputer(strategy="median"),
        ExtraTreesClassifier(
            n_estimators=250,
            max_depth=6,
            min_samples_leaf=3,
            class_weight="balanced",
            random_state=20261115,
            n_jobs=1,
        ),
    )
    lr_pipe.fit(X_train, y_train)
    rf_pipe.fit(X_train, y_train)
    et_pipe.fit(X_train, y_train)

    # Calibrate probability prevalence to training base rate for reliable Brier score
    base_rate = float(np.clip(y_train.mean(), 0.05, 0.95))
    raw_prob = (
        0.40 * lr_pipe.predict_proba(X_all)[:, 1]
        + 0.35 * rf_pipe.predict_proba(X_all)[:, 1]
        + 0.25 * et_pipe.predict_proba(X_all)[:, 1]
    )
    train_prob_mean = float(np.clip(raw_prob[train_mask.to_numpy()].mean(), 0.05, 0.95))
    # Log-odds shift to align mean predicted probability on train set with empirical base rate
    logit = np.log(np.clip(raw_prob, 1e-4, 1 - 1e-4) / (1.0 - np.clip(raw_prob, 1e-4, 1 - 1e-4)))
    shift = np.log(base_rate / (1.0 - base_rate)) - np.log(train_prob_mean / (1.0 - train_prob_mean))
    calibrated_logit = pd.Series(logit + shift, index=frame.index)
    calibrated_prob = pd.Series(1.0 / (1.0 + np.exp(-calibrated_logit.clip(-15, 15))), index=frame.index)

    # Preserve NaN where primary satellite sensors were unavailable
    calibrated_logit = calibrated_logit.where(valid_score_mask, np.nan)
    calibrated_prob = calibrated_prob.where(valid_score_mask, np.nan)
    return calibrated_logit, calibrated_prob


def _fit_state_ensemble_model(
    state_df: pd.DataFrame,
    external_dir: Path,
    hazard_type: str,
    label_filename: str,
    feature_cols: list[str],
    score_col: str,
) -> tuple[pd.Series, pd.Series]:
    """Train the supervised 3-model ensemble on pre-forecast history and score all state-months (2010–2027)."""
    from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    raw_score = state_df[score_col].astype(float)
    fallback_prob = 1.0 / (1.0 + np.exp(-raw_score.clip(-15, 15)))
    label_path = external_dir / label_filename
    if not label_path.exists():
        return raw_score, fallback_prob

    labels = pd.read_parquet(label_path)
    labels = labels[labels["hazard_type"] == hazard_type].dropna(subset=["month"])
    if labels.empty:
        return raw_score, fallback_prob

    dedup = labels.groupby("month", as_index=False).agg(observed=("observed", "max"))
    available_cols = [c for c in feature_cols if c in state_df.columns and state_df[c].notna().any()]
    if not available_cols:
        return raw_score, fallback_prob

    merged = state_df[["month"] + available_cols].merge(dedup, on="month", how="left")
    train_mask = (~state_df.get("is_forecast", pd.Series(False, index=state_df.index))) & merged["observed"].notna() & raw_score.notna()
    y_train = merged.loc[train_mask, "observed"].astype(int).to_numpy()
    if len(np.unique(y_train)) < 2:
        return raw_score, fallback_prob

    X_all = merged[available_cols].replace([np.inf, -np.inf], np.nan).to_numpy(dtype=np.float32)
    X_train = X_all[train_mask.to_numpy()]

    lr_pipe = make_pipeline(
        SimpleImputer(strategy="median"),
        StandardScaler(),
        LogisticRegression(C=0.5, class_weight="balanced", max_iter=500, random_state=20261115),
    )
    rf_pipe = make_pipeline(
        SimpleImputer(strategy="median"),
        RandomForestClassifier(
            n_estimators=180,
            max_depth=5,
            min_samples_leaf=5,
            class_weight="balanced_subsample",
            random_state=20261115,
            n_jobs=1,
        ),
    )
    et_pipe = make_pipeline(
        SimpleImputer(strategy="median"),
        ExtraTreesClassifier(
            n_estimators=180,
            max_depth=6,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=20261115,
            n_jobs=1,
        ),
    )
    lr_pipe.fit(X_train, y_train)
    rf_pipe.fit(X_train, y_train)
    et_pipe.fit(X_train, y_train)

    ens_prob = np.clip(
        0.40 * lr_pipe.predict_proba(X_all)[:, 1]
        + 0.35 * rf_pipe.predict_proba(X_all)[:, 1]
        + 0.25 * et_pipe.predict_proba(X_all)[:, 1],
        1e-4,
        1.0 - 1e-4,
    )
    ens_logit = np.log(ens_prob / (1.0 - ens_prob))
    blended_score = pd.Series(0.55 * ens_logit + 0.45 * raw_score.fillna(0.0), index=state_df.index)
    blended_prob = pd.Series(1.0 / (1.0 + np.exp(-blended_score.clip(-15, 15))), index=state_df.index)
    return blended_score.where(raw_score.notna(), np.nan), blended_prob.where(raw_score.notna(), np.nan)


def _extend_state_features_through_2027(state_df: pd.DataFrame) -> pd.DataFrame:
    """Impute trailing partial-sensor gaps in late 2026 and project 2027-01..2027-12 state features."""
    df = state_df.copy()
    df["state_clave"] = df["state_clave"].astype(str).str.zfill(2)
    df["is_forecast"] = df["month"] >= "2026-11"

    states = sorted(df["state_clave"].unique())
    existing_pairs = set(zip(df["state_clave"], df["month"]))
    forecast_months = ["2026-11", "2026-12"] + [f"2027-{m:02d}" for m in range(1, 13)]

    extra_rows = []
    for month in forecast_months:
        for clave in states:
            if (clave, month) not in existing_pairs:
                extra_rows.append({"state_clave": clave, "month": month, "is_forecast": True})
    if extra_rows:
        df = pd.concat([df, pd.DataFrame(extra_rows)], ignore_index=True)

    df = df.sort_values(["state_clave", "month"]).reset_index(drop=True)
    dt = pd.to_datetime(df["month"] + "-01", errors="coerce")
    df["_year"] = dt.dt.year
    df["_mnum"] = dt.dt.month

    numeric_cols = [
        c for c in df.select_dtypes(include=[np.number]).columns
        if c not in {"_year", "_mnum"} and not c.endswith("_lon") and not c.endswith("_lat")
    ]
    coord_cols = [c for c in df.columns if c.endswith("_lon") or c.endswith("_lat")]

    hist_mask = df["_year"] <= 2026
    recent_mask = (df["_year"] >= 2021) & (df["_year"] <= 2026)

    for col in numeric_cols:
        hist_mean = df[hist_mask].groupby(["state_clave", "_mnum"])[col].mean()
        recent_mean = df[recent_mask].groupby(["state_clave", "_mnum"])[col].mean()
        clim_val = df.set_index(["state_clave", "_mnum"]).index.map(hist_mean)
        recent_val = df.set_index(["state_clave", "_mnum"]).index.map(recent_mean)
        trend_delta = pd.Series(recent_val, index=df.index).astype(float) - pd.Series(clim_val, index=df.index).astype(float)
        trend_delta = trend_delta.fillna(0.0) * 0.55

        # State-level last observed anomaly persistence decaying with horizon
        df["_anom"] = df[col] - pd.Series(clim_val, index=df.index).astype(float)
        last_anom = df.groupby("state_clave")["_anom"].ffill().fillna(0.0)
        months_since_obs = df.groupby("state_clave")[col].transform(
            lambda s: s.isna().astype(int).groupby(s.notna().cumsum()).cumsum()
        )
        projected = (
            pd.Series(clim_val, index=df.index).astype(float)
            + trend_delta
            + 0.42 * last_anom * (0.80 ** months_since_obs.clip(lower=0))
        )
        df[col] = df[col].where(df[col].notna(), projected)

    for col in coord_cols:
        coord_med = df[hist_mask].groupby(["state_clave", "_mnum"])[col].median()
        state_med = df[hist_mask].groupby("state_clave")[col].median()
        mapped = pd.Series(df.set_index(["state_clave", "_mnum"]).index.map(coord_med), index=df.index).astype(float)
        mapped = mapped.fillna(df["state_clave"].map(state_med))
        df[col] = df[col].where(df[col].notna(), mapped)

    df = df.drop(columns=["_year", "_mnum", "_anom"], errors="ignore")
    return df


def build_hazard_catalog(
    monthly_features: str | Path,
    output: str | Path,
    sar_features: tuple[str | Path, ...] = (),
) -> Path:
    """Create explainable and calibrated monthly hazard indicators with evidence labels."""
    monthly_features_path = Path(monthly_features)
    output_path = Path(output)
    external_dir = monthly_features_path.parent / "external"

    source = pd.read_parquet(monthly_features_path)
    numeric = source.select_dtypes(include=[np.number]).columns
    rows = []
    for month, group in source.groupby("month", dropna=True):
        row: dict[str, Any] = {"month": month}
        for column in numeric:
            row[column] = group[column].mean()
        rows.append(row)
    frame = pd.DataFrame(rows).sort_values("month").reset_index(drop=True)

    # Merge cross-state spatial maxima/minima when state features are available
    state_features_path = monthly_features_path.parent / "mexico_state_monthly_features.parquet"
    if state_features_path.exists():
        state_df = pd.read_parquet(state_features_path)
        state_agg = (
            state_df.groupby("month", as_index=False)
            .agg(
                state_precip_max=("gpm_precip_p95", "max"),
                state_precip_p90=("gpm_precip_p95", lambda s: float(np.nanquantile(s, 0.9)) if s.notna().any() else np.nan),
                state_runoff_max=("gldas_runoff_surface_p95", "max"),
                state_lst_max=("modis_lst_day_p95", "max"),
                state_soil_min=("gldas_soil_moisture_mean", "min"),
            )
        )
        frame = frame.merge(state_agg, on="month", how="left")

    if sar_features:
        sar_frames = []
        for path in sar_features:
            sar = pd.read_parquet(path)
            if sar.empty:
                continue
            dates = sar.get("fecha", pd.Series(index=sar.index, dtype="object")).astype("string")
            dates = dates.where(dates.notna(), sar["path"].str.extract(r"(20\d{6})")[0])
            sar["month"] = pd.to_datetime(dates, errors="coerce").dt.strftime("%Y-%m")
            numeric_sar = sar.select_dtypes(include=[np.number]).columns
            summary = sar.groupby("month", dropna=True)[list(numeric_sar)].mean().reset_index()
            summary = summary.rename(columns={column: f"sar_{column}" for column in numeric_sar})
            sar_frames.append(summary)
        if sar_frames:
            sar_summary = (
                pd.concat(sar_frames, ignore_index=True)
                .groupby("month", as_index=False)
                .mean(numeric_only=True)
            )
            frame = frame.merge(sar_summary, on="month", how="left")

    frame = _engineer_temporal_features(frame, group_col=None)
    for col in ("state_precip_max", "state_precip_p90", "state_runoff_max", "state_lst_max", "state_soil_min"):
        if col in frame:
            frame[f"{col}_z"] = _seasonal_z(frame, col, "month_num")
            frame[f"{col}_gz"] = _global_z(frame, col, None)

    # Ensure raw proxy columns remain NaN when underlying sensor inputs are missing
    has_climate = (
        frame.get("modis_lst_day_mean", pd.Series(np.nan, index=frame.index)).notna()
        & frame.get("gpm_precip_mean", pd.Series(np.nan, index=frame.index)).notna()
        & frame.get("gldas_soil_moisture_mean", pd.Series(np.nan, index=frame.index)).notna()
    )
    frame["fire_physical_index"] = frame["fire_physical_index"].where(has_climate, np.nan)
    frame["drought_physical_index"] = frame["drought_physical_index"].where(has_climate, np.nan)
    frame["flood_physical_index"] = frame["flood_physical_index"].where(has_climate, np.nan)

    fire_features = [
        "fire_physical_index",
        "drought_physical_index",
        "modis_lst_day_mean_gz",
        "modis_lst_day_p95_gz",
        "modis_lst_day_mean_z",
        "diurnal_temp_range_gz",
        "gpm_precip_mean_gz",
        "gldas_soil_moisture_mean_gz",
        "soil_moisture_3m_gz",
        "soil_moisture_3m_z",
        "state_lst_max_gz",
        "state_soil_min_gz",
        "month_sin",
        "month_cos",
    ]
    flood_features = [
        "flood_physical_index",
        "gpm_precip_p95_z",
        "gpm_precip_max_z",
        "gpm_precip_mean_z",
        "gldas_runoff_surface_p95_z",
        "gldas_rain_p95_z",
        "rain_intensity_ratio_z",
        "state_precip_max_z",
        "state_precip_p90_z",
        "state_runoff_max_z",
        "month_sin",
        "month_cos",
    ]

    fire = frame.get("firms_fire_count", pd.Series(0.0, index=frame.index)).fillna(0)
    frame["fire_observed"] = fire > 0
    frame["fire_evidence"] = np.where(frame["fire_observed"], "observed", "proxy")

    fire_score, fire_prob = _fit_calibrated_score(
        frame,
        external_dir / "firms_labels.parquet",
        "incendio",
        fire_features,
        "fire_physical_index",
    )
    frame["fire_risk_score_proxy"] = fire_score
    frame["fire_risk_probability"] = fire_prob
    frame["fire_risk_evidence"] = np.where(
        (external_dir / "firms_labels.parquet").exists() & fire_score.notna(), "supervised", "proxy"
    )

    frame["drought_score_proxy"] = frame["drought_physical_index"]
    frame["drought_probability"] = 1.0 / (1.0 + np.exp(-frame["drought_score_proxy"].clip(-15, 15)))
    frame["drought_evidence"] = "proxy"

    flood_score, flood_prob = _fit_calibrated_score(
        frame,
        external_dir / "ibtracs_labels.parquet",
        "inundacion",
        flood_features,
        "flood_physical_index",
    )
    frame["flood_score_proxy"] = flood_score
    frame["flood_probability"] = flood_prob
    frame["flood_evidence"] = np.where(
        (external_dir / "ibtracs_labels.parquet").exists() & flood_score.notna(), "supervised", "proxy"
    )

    frame["tectonic_score_proxy"] = _seasonal_z(frame, "sar_log_ratio_mean", "month_num")
    frame["tectonic_evidence"] = np.where(
        frame["tectonic_score_proxy"].notna(), "proxy", "no_confirmable"
    )
    frame["tectonic_reason"] = (
        "Screening SAR: no hay pares temporales co-registrados suficientes; "
        "los sismos históricos confirmados se sirven desde el catálogo sísmico USGS."
    )

    numeric_cols = frame.select_dtypes(include=[np.number]).columns
    from sklearn.ensemble import IsolationForest

    model_values = frame[numeric_cols].replace([np.inf, -np.inf], np.nan).fillna(0)
    if len(frame) >= 3:
        model = IsolationForest(n_estimators=200, random_state=20261115, n_jobs=1)
        model.fit(model_values)
        frame["multisensor_anomaly_score"] = model.decision_function(model_values)
        frame["multisensor_is_anomaly"] = model.predict(model_values) == -1
        frame["multisensor_anomaly_evidence"] = "proxy"
    else:
        frame["multisensor_anomaly_score"] = np.nan
        frame["multisensor_is_anomaly"] = False
        frame["multisensor_anomaly_evidence"] = "no_confirmable"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_parquet(output_path, compression="zstd", index=False)
    return output_path


def _reproject_sar_tile_centroids(root: Path, states_path: str) -> list[dict[str, Any]]:
    """Reproject ALOS and NISAR tile centroids from UTM/EPSG to WGS84 (lon, lat) and map to states."""
    from pyproj import Transformer

    states, _ = load_states(states_path)
    events: list[dict[str, Any]] = []
    for sensor, clean_dir, default_date in (
        ("ALOS PALSAR", root / "data" / "interim" / "alos_clean", "2011-04-21"),
        ("NISAR GCOV", root / "data" / "interim" / "nisar_clean", "2026-11-06"),
    ):
        if not clean_dir.exists():
            continue
        for index, npz_path in enumerate(sorted(clean_dir.glob("*.clean.npz"))):
            with np.load(npz_path, allow_pickle=False) as data:
                if "x" not in data or "y" not in data:
                    continue
                x_mid = float(np.nanmean(data["x"]))
                y_mid = float(np.nanmean(data["y"]))
                epsg = int(data["epsg"].item()) if "epsg" in data else 32614
                date_str = str(data["fecha"].item()) if "fecha" in data else default_date
                co_pol = np.asarray(data.get("co_pol", [0.0]), dtype=np.float32)
                cross_pol = np.asarray(data.get("cross_pol", [1.0]), dtype=np.float32)
                denom = np.maximum(np.abs(cross_pol), 1e-6)
                log_ratio = float(np.nanmean(np.log1p(np.abs(co_pol / denom))))
            if epsg != 4326 and (abs(x_mid) > 180 or abs(y_mid) > 90):
                transformer = Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)
                lon, lat = transformer.transform(x_mid, y_mid)
            else:
                lon, lat = x_mid, y_mid
            assigned = assign_states(states_path, np.array([lon]), np.array([lat]), max_distance_degrees=0.8)
            if assigned[0] < 0:
                continue
            st = states[int(assigned[0])]
            period = date_str[:7]
            severity = round(float(np.clip(log_ratio * 4.2, 3.5, 8.8)), 1)
            events.append(
                {
                    "event_id": f"sar-{sensor.split()[0].lower()}-{period}-{st.clave}-{index:02d}",
                    "period": period,
                    "date": date_str,
                    "hazard_type": "sismo",
                    "name": f"Screening SAR {sensor} · {st.nombre}",
                    "state_clave": st.clave,
                    "state_name": st.nombre,
                    "longitude": round(float(lon), 5),
                    "latitude": round(float(lat), 5),
                    "severity": severity,
                    "radius_km": 45,
                    "score": round(log_ratio, 4),
                    "probability": round(float(np.clip(severity / 10.0, 0.25, 0.88)), 4),
                    "evidence": "proxy",
                    "observed": False,
                    "source": f"{sensor} ({npz_path.name})",
                }
            )
    return events


def build_spatial_hazard_catalog(
    root: str | Path,
    state_features_path: str | Path,
    output: str | Path,
) -> Path:
    """Build the multi-state TimeMap catalog with exact coordinates across all 32 Mexican states."""
    root = Path(root).resolve()
    states_path = str(prepare_state_geometries(root))
    states, _ = load_states(states_path)
    state_by_clave = {s.clave: s for s in states}
    external_dir = root / "data" / "interim" / "external"

    events: list[dict[str, Any]] = []

    # 1. Observed USGS Earthquakes (M >= 4.5) mapped to exact epicenters and Mexican states
    usgs_path = external_dir / "usgs_earthquakes.geojson"
    if usgs_path.exists():
        payload = json.loads(usgs_path.read_text(encoding="utf-8"))
        quake_rows = []
        for feat in payload.get("features", []):
            props = feat.get("properties") or {}
            geom = feat.get("geometry") or {}
            coords = geom.get("coordinates") or []
            mag = props.get("mag")
            ts = props.get("time")
            if mag is None or ts is None or len(coords) < 2 or float(mag) < 4.5:
                continue
            dt = pd.to_datetime(ts, unit="ms", utc=True)
            quake_rows.append(
                {
                    "lon": float(coords[0]),
                    "lat": float(coords[1]),
                    "mag": float(mag),
                    "date": dt.strftime("%Y-%m-%d"),
                    "period": dt.strftime("%Y-%m"),
                    "place": str(props.get("place") or ""),
                }
            )
        if quake_rows:
            qdf = pd.DataFrame(quake_rows)
            idx = assign_states(states_path, qdf["lon"].to_numpy(), qdf["lat"].to_numpy(), max_distance_degrees=1.2)
            qdf["state_idx"] = idx
            qdf = qdf[qdf["state_idx"] >= 0].copy()
            # Keep strongest earthquake per state and month to keep the TimeMap clean and informative
            qdf = qdf.sort_values("mag", ascending=False).groupby(["period", "state_idx"], as_index=False).first()
            for _, row in qdf.iterrows():
                st = states[int(row["state_idx"])]
                mag = float(row["mag"])
                sev = round(float(np.clip((mag - 3.6) * 2.1, 2.5, 10.0)), 1)
                events.append(
                    {
                        "event_id": f"sismo-{row['period']}-{st.clave}",
                        "period": str(row["period"]),
                        "date": str(row["date"]),
                        "hazard_type": "sismo",
                        "name": f"Sismo M{mag:.1f} · {st.nombre}",
                        "state_clave": st.clave,
                        "state_name": st.nombre,
                        "longitude": round(float(row["lon"]), 5),
                        "latitude": round(float(row["lat"]), 5),
                        "severity": sev,
                        "radius_km": int(np.clip((mag - 3.5) * 45, 35, 220)),
                        "score": round(mag, 2),
                        "probability": 1.0,
                        "evidence": "observed",
                        "observed": True,
                        "source": "USGS Earthquake Catalog",
                    }
                )

    # 2. ALOS & NISAR SAR backscatter anomalies reprojected to WGS84
    events.extend(_reproject_sar_tile_centroids(root, states_path))

    # 3. Observed Tropical Cyclones / Hurricanes (NOAA IBTrACS NA + EP basins)
    ib_files = [p for p in (external_dir / "ibtracs_na.csv", external_dir / "ibtracs_ep.csv") if p.exists()]
    if ib_files:
        ib_frames = [
            pd.read_csv(
                p,
                skiprows=[1],
                low_memory=False,
                usecols=lambda c: c in {"SID", "NAME", "ISO_TIME", "USA_LAT", "USA_LON", "LAT", "LON", "USA_WIND", "WMO_WIND"},
            )
            for p in ib_files
        ]
        ib = pd.concat(ib_frames, ignore_index=True)
        ib["lat"] = pd.to_numeric(ib.get("USA_LAT"), errors="coerce").fillna(pd.to_numeric(ib.get("LAT"), errors="coerce"))
        ib["lon"] = pd.to_numeric(ib.get("USA_LON"), errors="coerce").fillna(pd.to_numeric(ib.get("LON"), errors="coerce"))
        ib["wind"] = pd.to_numeric(ib.get("USA_WIND"), errors="coerce").fillna(pd.to_numeric(ib.get("WMO_WIND"), errors="coerce")).fillna(35.0)
        ib["ts"] = pd.to_datetime(ib.get("ISO_TIME"), errors="coerce", utc=True)
        ib = ib[
            ib["lat"].between(13.5, 33.0)
            & ib["lon"].between(-118.5, -85.5)
            & ib["ts"].notna()
            & (ib["ts"].dt.year >= 2010)
        ].copy()
        if not ib.empty:
            ib["state_idx"] = assign_states(states_path, ib["lon"].to_numpy(), ib["lat"].to_numpy(), max_distance_degrees=1.2)
            ib = ib[ib["state_idx"] >= 0].copy()
            ib["period"] = ib["ts"].dt.strftime("%Y-%m")
            ib["date"] = ib["ts"].dt.strftime("%Y-%m-%d")
            ib = ib.sort_values("wind", ascending=False).groupby(["period", "state_idx"], as_index=False).first()
            for _, row in ib.iterrows():
                st = states[int(row["state_idx"])]
                wind = float(row["wind"])
                storm_name = str(row.get("NAME") or "Tropical").strip().title()
                if storm_name in {"Not_Named", "Unnamed", "Nan", ""}:
                    storm_name = "Ciclón Tropical"
                else:
                    storm_name = f"Ciclón {storm_name}"
                sev = round(float(np.clip(wind / 14.0, 3.0, 10.0)), 1)
                events.append(
                    {
                        "event_id": f"huracan-{row['period']}-{st.clave}",
                        "period": str(row["period"]),
                        "date": str(row["date"]),
                        "hazard_type": "huracan",
                        "name": f"{storm_name} ({int(wind)} kt) · {st.nombre}",
                        "state_clave": st.clave,
                        "state_name": st.nombre,
                        "longitude": round(float(row["lon"]), 5),
                        "latitude": round(float(row["lat"]), 5),
                        "severity": sev,
                        "radius_km": int(np.clip(wind * 2.2, 80, 320)),
                        "score": round(wind, 1),
                        "probability": 1.0,
                        "evidence": "observed",
                        "observed": True,
                        "source": "NOAA IBTrACS v04r01 (NA + EP)",
                    }
                )

    # 4. Observed Wildfires (NASA EONET v3 + Local NASA FIRMS VIIRS)
    eonet_path = external_dir / "eonet_wildfires.json"
    if eonet_path.exists():
        epayload = json.loads(eonet_path.read_text(encoding="utf-8"))
        erows = []
        for ev in epayload.get("events", []):
            title = str(ev.get("title") or "Incendio forestal").replace("Wildfire", "Incendio").strip()
            for geom in ev.get("geometry", []):
                coords = geom.get("coordinates")
                d_str = geom.get("date")
                if not d_str or not isinstance(coords, list) or len(coords) < 2 or not isinstance(coords[0], (int, float)):
                    continue
                dt = pd.to_datetime(d_str, errors="coerce", utc=True)
                if pd.isna(dt) or dt.year < 2010:
                    continue
                mag_val = float(geom.get("magnitudeValue") or 500.0)
                erows.append(
                    {
                        "lon": float(coords[0]),
                        "lat": float(coords[1]),
                        "date": dt.strftime("%Y-%m-%d"),
                        "period": dt.strftime("%Y-%m"),
                        "title": title,
                        "mag": mag_val,
                    }
                )
        if erows:
            edf = pd.DataFrame(erows)
            edf["state_idx"] = assign_states(states_path, edf["lon"].to_numpy(), edf["lat"].to_numpy(), max_distance_degrees=0.15)
            edf = edf[edf["state_idx"] >= 0].copy()
            edf = edf.sort_values("mag", ascending=False).groupby(["period", "state_idx"], as_index=False).first()
            for _, row in edf.iterrows():
                st = states[int(row["state_idx"])]
                sev = round(float(np.clip(np.log10(max(float(row["mag"]), 10.0)) * 2.3, 4.5, 9.8)), 1)
                events.append(
                    {
                        "event_id": f"incendio-obs-{row['period']}-{st.clave}",
                        "period": str(row["period"]),
                        "date": str(row["date"]),
                        "hazard_type": "incendio",
                        "name": f"Incendio forestal observado · {st.nombre}",
                        "state_clave": st.clave,
                        "state_name": st.nombre,
                        "longitude": round(float(row["lon"]), 5),
                        "latitude": round(float(row["lat"]), 5),
                        "severity": sev,
                        "radius_km": 65,
                        "score": round(float(row["mag"]), 1),
                        "probability": 1.0,
                        "evidence": "observed",
                        "observed": True,
                        "source": "NASA EONET v3 Historical Wildfires",
                    }
                )

    firms_parquet = root / "data" / "interim" / "firms.parquet"
    if firms_parquet.exists():
        fdf = pd.read_parquet(firms_parquet)
        fdf = fdf[
            fdf["latitude"].between(MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"])
            & fdf["longitude"].between(MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"])
        ].copy()
        if not fdf.empty:
            fdf["state_idx"] = assign_states(states_path, fdf["longitude"].to_numpy(), fdf["latitude"].to_numpy())
            fdf = fdf[fdf["state_idx"] >= 0].copy()
            fdf["period"] = pd.to_datetime(fdf["acq_date"], errors="coerce").dt.strftime("%Y-%m")
            grouped = (
                fdf.groupby(["period", "state_idx"], as_index=False)
                .agg(
                    lon=("longitude", "mean"),
                    lat=("latitude", "mean"),
                    frp_max=("frp", "max"),
                    count=("frp", "size"),
                    date=("acq_date", "max"),
                )
            )
            for _, row in grouped.iterrows():
                st = states[int(row["state_idx"])]
                cnt = int(row["count"])
                sev = round(float(np.clip(np.log1p(cnt) * 1.9, 3.5, 10.0)), 1)
                events.append(
                    {
                        "event_id": f"incendio-firms-{row['period']}-{st.clave}",
                        "period": str(row["period"]),
                        "date": str(row["date"]),
                        "hazard_type": "incendio",
                        "name": f"Focos activos VIIRS ({cnt} detecciones) · {st.nombre}",
                        "state_clave": st.clave,
                        "state_name": st.nombre,
                        "longitude": round(float(row["lon"]), 5),
                        "latitude": round(float(row["lat"]), 5),
                        "severity": sev,
                        "radius_km": 75,
                        "score": round(float(row["frp_max"]), 2),
                        "probability": 1.0,
                        "evidence": "observed",
                        "observed": True,
                        "source": "NASA FIRMS VIIRS",
                    }
                )

    # 5. State-level calibrated predictions and anomalies across all 32 states (2010–2027)
    state_df = pd.read_parquet(state_features_path)
    state_df = _extend_state_features_through_2027(state_df)
    state_df = _engineer_temporal_features(state_df, group_col="state_clave")

    fire_state_features = [
        "fire_physical_index",
        "drought_physical_index",
        "modis_lst_day_mean_gz",
        "modis_lst_day_p95_gz",
        "modis_lst_day_mean_z",
        "diurnal_temp_range_gz",
        "gpm_precip_mean_gz",
        "gldas_soil_moisture_mean_gz",
        "soil_moisture_3m_gz",
        "soil_moisture_3m_z",
        "month_sin",
        "month_cos",
    ]
    flood_state_features = [
        "flood_physical_index",
        "gpm_precip_p95_z",
        "gpm_precip_p95_gz",
        "gpm_precip_mean_z",
        "gpm_precip_mean_gz",
        "gldas_runoff_surface_p95_z",
        "gldas_runoff_surface_p95_gz",
        "gldas_rain_p95_z",
        "rain_intensity_ratio_z",
        "month_sin",
        "month_cos",
    ]

    state_df["fire_calibrated_score"], state_df["fire_calibrated_prob"] = _fit_state_ensemble_model(
        state_df,
        external_dir,
        "incendio",
        "firms_labels.parquet",
        fire_state_features,
        "fire_physical_index",
    )
    state_df["flood_calibrated_score"], state_df["flood_calibrated_prob"] = _fit_state_ensemble_model(
        state_df,
        external_dir,
        "inundacion",
        "ibtracs_labels.parquet",
        flood_state_features,
        "flood_physical_index",
    )
    state_df["drought_calibrated_prob"] = 1.0 / (
        1.0 + np.exp(-state_df["drought_physical_index"].astype(float).clip(-15, 15))
    )

    hazard_specs = [
        (
            "incendio",
            "fire_calibrated_score",
            "fire_calibrated_prob",
            "modis_lst_day_max_lon",
            "modis_lst_day_max_lat",
            "Riesgo de incendio",
            "supervised",
            70,
        ),
        (
            "sequia",
            "drought_physical_index",
            "drought_calibrated_prob",
            "gldas_soil_moisture_min_lon",
            "gldas_soil_moisture_min_lat",
            "Estrés hídrico / Sequía",
            "proxy",
            110,
        ),
        (
            "inundacion",
            "flood_calibrated_score",
            "flood_calibrated_prob",
            "gpm_precip_max_lon",
            "gpm_precip_max_lat",
            "Riesgo hidrometeorológico de inundación",
            "supervised",
            95,
        ),
    ]

    existing_keys = {(e["period"], e["hazard_type"], e["state_clave"]) for e in events}
    for hazard_type, score_col, prob_col, lon_col, lat_col, label_prefix, evidence_kind, radius_km in hazard_specs:
        valid = state_df.dropna(subset=[score_col]).copy()
        if valid.empty:
            continue

        hist_valid = valid[~valid["is_forecast"]].copy()
        fcst_valid = valid[valid["is_forecast"] & (~valid["month"].astype(str).str.startswith("2027-"))].copy()

        selected_parts = []
        if not hist_valid.empty:
            q75 = float(hist_valid[score_col].quantile(0.75))
            hist_sel = (
                hist_valid[hist_valid[score_col] >= max(0.55, q75)]
                .sort_values(score_col, ascending=False)
                .groupby("month", as_index=False)
                .head(8)
            )
            selected_parts.append(hist_sel)

        if not fcst_valid.empty:
            # For 2026-11..2026-12 closure horizon, surface top elevated-risk states per month
            fcst_ranked = fcst_valid.sort_values([prob_col, score_col], ascending=[False, False])
            fcst_sel = fcst_ranked[fcst_ranked[prob_col] >= 0.35].groupby("month", as_index=False).head(6)
            if len(fcst_sel["month"].unique()) < len(fcst_valid["month"].unique()):
                covered_months = set(fcst_sel["month"].unique())
                fallback_fcst = (
                    fcst_ranked[~fcst_ranked["month"].isin(covered_months)]
                    .groupby("month", as_index=False)
                    .head(4)
                )
                fcst_sel = pd.concat([fcst_sel, fallback_fcst], ignore_index=True)
            selected_parts.append(fcst_sel)

        if not selected_parts:
            continue
        selected = pd.concat(selected_parts, ignore_index=True)

        for _, row in selected.iterrows():
            clave = str(row["state_clave"]).zfill(2)
            period = str(row["month"])
            if (period, hazard_type, clave) in existing_keys:
                continue
            st = state_by_clave.get(clave)
            if st is None:
                continue
            raw_score = float(row[score_col])
            prob = float(np.clip(row[prob_col], 0.01, 0.99))
            sev = round(float(np.clip(prob * 7.2 + np.maximum(raw_score, 0.0) * 1.1 + 1.8, 2.5, 9.9)), 1)
            lon = float(row[lon_col]) if lon_col in row and pd.notna(row[lon_col]) else st.lon
            lat = float(row[lat_col]) if lat_col in row and pd.notna(row[lat_col]) else st.lat
            is_fcst = bool(row.get("is_forecast", False))
            if period.startswith("2027-"):
                source_text = "Pronóstico 2027 · Ensamble multisensor estatal (GPM + MODIS + GLDAS)"
            elif is_fcst:
                source_text = "Pronóstico cierre 2026 · Ensamble multisensor estatal (GPM + MODIS + GLDAS)"
            else:
                source_text = "Modelo multisensor estatal (GPM + MODIS + GLDAS)"
            events.append(
                {
                    "event_id": f"{hazard_type}-{period}-{clave}",
                    "period": period,
                    "date": f"{period}-15",
                    "hazard_type": hazard_type,
                    "name": f"{label_prefix} · {st.nombre}",
                    "state_clave": clave,
                    "state_name": st.nombre,
                    "longitude": round(lon, 5),
                    "latitude": round(lat, 5),
                    "severity": sev,
                    "radius_km": radius_km,
                    "score": round(raw_score, 4),
                    "probability": round(prob, 4),
                    "evidence": evidence_kind,
                    "observed": False,
                    "source": source_text,
                }
            )

    # 6. Full 32-state 2027 monthly forecast layer (exactamente 32 predicciones estatales por mes)
    fcst_2027 = state_df[state_df["month"].astype(str).str.startswith("2027-")].copy()
    if not fcst_2027.empty:
        spec_by_hazard = {
            h_type: (score_col, prob_col, lon_col, lat_col, label_prefix, evidence_kind, radius_km)
            for h_type, score_col, prob_col, lon_col, lat_col, label_prefix, evidence_kind, radius_km in hazard_specs
        }
        candidates = []
        for h_type, (score_col, prob_col, lon_col, lat_col, _, _, _) in spec_by_hazard.items():
            part = fcst_2027[["state_clave", "month", score_col, prob_col, lon_col, lat_col]].copy()
            part = part.rename(columns={score_col: "score", prob_col: "prob", lon_col: "lon", lat_col: "lat"})
            part["hazard_type"] = h_type
            candidates.append(part)
        combined_2027 = pd.concat(candidates, ignore_index=True).dropna(subset=["prob", "score"])
        top32_2027 = (
            combined_2027.sort_values(["prob", "score"], ascending=[False, False])
            .groupby(["month", "state_clave"], as_index=False)
            .first()
        )
        for _, row in top32_2027.iterrows():
            clave = str(row["state_clave"]).zfill(2)
            period = str(row["month"])
            h_type = str(row["hazard_type"])
            if (period, h_type, clave) in existing_keys:
                continue
            st = state_by_clave.get(clave)
            if st is None:
                continue
            _, _, _, _, label_prefix, evidence_kind, radius_km = spec_by_hazard[h_type]
            raw_score = float(row["score"])
            prob = float(np.clip(row["prob"], 0.01, 0.99))
            sev = round(float(np.clip(prob * 7.2 + np.maximum(raw_score, 0.0) * 1.1 + 1.8, 2.5, 9.9)), 1)
            lon = float(row["lon"]) if pd.notna(row["lon"]) else st.lon
            lat = float(row["lat"]) if pd.notna(row["lat"]) else st.lat
            events.append(
                {
                    "event_id": f"{h_type}-{period}-{clave}",
                    "period": period,
                    "date": f"{period}-15",
                    "hazard_type": h_type,
                    "name": f"{label_prefix} · {st.nombre}",
                    "state_clave": clave,
                    "state_name": st.nombre,
                    "longitude": round(lon, 5),
                    "latitude": round(lat, 5),
                    "severity": sev,
                    "radius_km": radius_km,
                    "score": round(raw_score, 4),
                    "probability": round(prob, 4),
                    "evidence": evidence_kind,
                    "observed": False,
                    "source": "Pronóstico 2027 · Ensamble multisensor estatal (GPM + MODIS + GLDAS)",
                }
            )

    catalog_df = pd.DataFrame(events).sort_values(["period", "severity"], ascending=[True, False]).reset_index(drop=True)
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    catalog_df.to_parquet(output_path, compression="zstd", index=False)
    LOGGER.info(
        "spatial hazard catalog written rows=%d states=%d months=%d",
        len(catalog_df),
        catalog_df["state_clave"].nunique() if not catalog_df.empty else 0,
        catalog_df["period"].nunique() if not catalog_df.empty else 0,
    )
    return output_path
