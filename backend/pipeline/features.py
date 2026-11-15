from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Any

import numpy as np

from .execution import select_workers


def _tile_features(path: str) -> dict[str, Any]:
    with np.load(path, allow_pickle=False) as data:
        result: dict[str, Any] = {"path": path}
        for name in ("co_pol", "cross_pol"):
            if name not in data:
                continue
            values = np.asarray(data[name], dtype=np.float32)
            finite = values[np.isfinite(values)]
            if finite.size == 0:
                finite = np.zeros(1, dtype=np.float32)
            result[f"{name}_mean"] = float(finite.mean())
            result[f"{name}_std"] = float(finite.std())
            result[f"{name}_p05"] = float(np.quantile(finite, 0.05))
            result[f"{name}_p95"] = float(np.quantile(finite, 0.95))
            result[f"{name}_valid_fraction"] = float(np.isfinite(values).mean())
        if "co_pol" in data and "cross_pol" in data:
            denominator = np.maximum(np.abs(data["cross_pol"]).astype(np.float32), 1e-6)
            ratio = np.divide(data["co_pol"], denominator, dtype=np.float32)
            result["log_ratio_mean"] = float(np.nanmean(np.log1p(np.abs(ratio))))
        for scalar in ("epsg", "pol_tipo", "fecha"):
            if scalar in data:
                result[scalar] = data[scalar].item()
    return result


def build_features(
    clean_dir: str | Path,
    output: str | Path,
    *,
    workers: int,
    minimum_files: int = 8,
    minimum_bytes: int = 256 * 1024 * 1024,
) -> Path:
    files = sorted(Path(clean_dir).glob("*.clean.npz"))
    effective_workers = select_workers(
        files,
        workers,
        minimum_files=minimum_files,
        minimum_bytes=minimum_bytes,
    )
    if effective_workers <= 1:
        rows = [_tile_features(str(path)) for path in files]
    else:
        context = __import__("multiprocessing").get_context("spawn")
        with ProcessPoolExecutor(max_workers=effective_workers, mp_context=context) as pool:
            rows = list(pool.map(_tile_features, map(str, files)))
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    import pandas as pd

    pd.DataFrame(rows).to_parquet(output, compression="zstd", index=False)
    return output


def read_features(path: str | Path):
    import pandas as pd

    return pd.read_parquet(path)
