from __future__ import annotations

from pathlib import Path


def select_workers(
    files: list[Path],
    configured_workers: int,
    *,
    minimum_files: int,
    minimum_bytes: int,
) -> int:
    """Use processes only when the input is large enough to amortize spawn cost."""
    if configured_workers <= 1 or len(files) < minimum_files:
        return 1
    total_bytes = sum(path.stat().st_size for path in files if path.exists())
    return configured_workers if total_bytes >= minimum_bytes else 1


def select_training_jobs(sample_count: int, configured_workers: int) -> int:
    """Avoid thread/process overhead for tiny estimators while enabling scaling."""
    if configured_workers <= 1 or sample_count < configured_workers * 32:
        return 1
    return -1
