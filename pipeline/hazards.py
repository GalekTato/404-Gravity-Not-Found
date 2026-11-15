from __future__ import annotations

from pathlib import Path

import numpy as np


def build_hazard_catalog(
    monthly_features: str | Path,
    output: str | Path,
    sar_features: tuple[str | Path, ...] = (),
) -> Path:
    """Create explainable, monthly hazard indicators with evidence labels."""
    import pandas as pd

    source = pd.read_parquet(monthly_features)
    numeric = source.select_dtypes(include=[np.number]).columns
    rows = []
    for month, group in source.groupby("month", dropna=True):
        row = {"month": month}
        for column in numeric:
            row[column] = group[column].mean()
        rows.append(row)
    frame = pd.DataFrame(rows).sort_values("month").reset_index(drop=True)
    frame["month_num"] = pd.to_datetime(frame["month"]).dt.month
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
            sar_summary = pd.concat(sar_frames, ignore_index=True).groupby("month", as_index=False).mean(numeric_only=True)
            frame = frame.merge(sar_summary, on="month", how="left")

    def seasonal_z(column: str) -> pd.Series:
        if column not in frame:
            return pd.Series(np.nan, index=frame.index)
        baseline = frame.groupby("month_num")[column].transform("mean")
        scale = frame.groupby("month_num")[column].transform("std").replace(0, np.nan)
        return (frame[column] - baseline) / scale

    fire = frame.get("firms_fire_count", pd.Series(0.0, index=frame.index)).fillna(0)
    frame["fire_observed"] = fire > 0
    frame["fire_evidence"] = np.where(frame["fire_observed"], "observed", "no_confirmable")
    frame["fire_risk_score_proxy"] = (
        seasonal_z("modis_lst_day_mean")
        - seasonal_z("gpm_precip_mean")
        - seasonal_z("gldas_soil_moisture_mean")
    )
    frame["fire_risk_evidence"] = "proxy"
    frame["drought_score_proxy"] = (
        -seasonal_z("gpm_precip_mean")
        - seasonal_z("gldas_soil_moisture_mean")
    )
    frame["drought_evidence"] = "proxy"
    frame["flood_score_proxy"] = (
        seasonal_z("gpm_precip_p95")
        + seasonal_z("gldas_runoff_surface_p95")
        + seasonal_z("gldas_rain_p95")
    )
    frame["flood_evidence"] = "proxy"
    frame["tectonic_score_proxy"] = seasonal_z("sar_log_ratio_mean")
    frame["tectonic_evidence"] = np.where(
        frame["tectonic_score_proxy"].notna(), "proxy", "no_confirmable"
    )
    frame["tectonic_reason"] = (
        "Screening SAR: no hay pares temporales co-registrados ni catálogo sísmico; "
        "no debe interpretarse como detección confirmada."
    )
    numeric_cols = frame.select_dtypes(include=[np.number]).columns
    from sklearn.ensemble import IsolationForest

    model_values = frame[numeric_cols].replace([np.inf, -np.inf], np.nan).fillna(0)
    if len(frame) >= 3:
        model = IsolationForest(n_estimators=200, random_state=20261115, n_jobs=-1)
        model.fit(model_values)
        frame["multisensor_anomaly_score"] = model.decision_function(model_values)
        frame["multisensor_is_anomaly"] = model.predict(model_values) == -1
        frame["multisensor_anomaly_evidence"] = "proxy"
    else:
        frame["multisensor_anomaly_score"] = np.nan
        frame["multisensor_is_anomaly"] = False
        frame["multisensor_anomaly_evidence"] = "no_confirmable"
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    frame.to_parquet(output, compression="zstd", index=False)
    return output
