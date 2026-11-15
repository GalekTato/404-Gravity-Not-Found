from __future__ import annotations

import hashlib
import logging
import multiprocessing as mp
import tempfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import numpy as np

from .execution import select_workers

LOGGER = logging.getLogger(__name__)


def _output_for(source: Path, output_dir: Path) -> Path:
    return output_dir / f"{source.stem}.clean.npz"


def _clean_npz(source: str, output_dir: str) -> dict[str, Any]:
    source_path = Path(source)
    output_path = _output_for(source_path, Path(output_dir))
    digest = hashlib.sha256()
    with source_path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    source_digest = digest.hexdigest()
    if output_path.exists():
        try:
            with np.load(output_path, allow_pickle=False) as cached:
                if str(cached["source_sha256"]) == source_digest:
                    return {"source": str(source_path), "output": str(output_path), "cached": True}
        except (OSError, KeyError, ValueError):
            output_path.unlink(missing_ok=True)

    with np.load(source_path, allow_pickle=False) as data:
        result: dict[str, Any] = {}
        for key in data.files:
            value = data[key]
            if np.issubdtype(value.dtype, np.floating):
                result[key] = np.nan_to_num(value.astype(np.float32, copy=False), nan=0.0, posinf=0.0, neginf=0.0)
            else:
                result[key] = value
        result["source_sha256"] = np.asarray(source_digest)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            prefix=f"{output_path.stem}.",
            suffix=".npz",
            dir=output_path.parent,
            delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
        try:
            np.savez_compressed(temporary_path, **result)
            temporary_path.replace(output_path)
        finally:
            temporary_path.unlink(missing_ok=True)
    return {"source": str(source_path), "output": str(output_path), "cached": False}


def clean_npz_directory(
    source_dir: str | Path,
    output_dir: str | Path,
    *,
    workers: int,
    minimum_files: int = 8,
    minimum_bytes: int = 256 * 1024 * 1024,
) -> list[dict[str, Any]]:
    """Clean NPZ tiles with Windows-safe spawn multiprocessing."""
    sources = sorted(Path(source_dir).glob("*.npz"))
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    if not sources:
        return []
    effective_workers = select_workers(
        sources,
        workers,
        minimum_files=minimum_files,
        minimum_bytes=minimum_bytes,
    )
    if effective_workers <= 1:
        return sorted(
            [_clean_npz(str(path), str(output_dir)) for path in sources],
            key=lambda row: row["source"],
        )
    context = mp.get_context("spawn")
    results: list[dict[str, Any]] = []
    with ProcessPoolExecutor(max_workers=effective_workers, mp_context=context) as pool:
        futures = [pool.submit(_clean_npz, str(path), str(output_dir)) for path in sources]
        for future in as_completed(futures):
            results.append(future.result())
    return sorted(results, key=lambda row: row["source"])


def clean_firms_csv(source_dir: str | Path, output_dir: str | Path) -> Path | None:
    """Convert FIRMS CSV text to compressed Parquet when pandas/pyarrow exist."""
    import pandas as pd

    files = sorted(Path(source_dir).glob("*.txt"))
    if not files:
        return None
    output = Path(output_dir) / "firms.parquet"
    output.parent.mkdir(parents=True, exist_ok=True)
    frames = [pd.read_csv(path) for path in files]
    frame = pd.concat(frames, ignore_index=True)
    for column in ("latitude", "longitude", "bright_ti4", "bright_ti5", "frp"):
        if column in frame:
            frame[column] = pd.to_numeric(frame[column], errors="coerce").astype("float32")
    frame.to_parquet(output, compression="zstd", index=False)
    return output
