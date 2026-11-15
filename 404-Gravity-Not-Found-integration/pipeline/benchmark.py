from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Callable


def benchmark(name: str, operation: Callable[[], object], repeats: int = 1) -> dict[str, float | str]:
    elapsed = []
    for _ in range(repeats):
        started = time.perf_counter()
        operation()
        elapsed.append(time.perf_counter() - started)
    return {"name": name, "seconds": min(elapsed), "repeats": repeats}


def write_benchmark(results: list[dict[str, float | str]], output: str | Path) -> Path:
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(results, indent=2), encoding="utf-8")
    return output


def compare_cpu_modes(
    name: str,
    operation: Callable[[int], object],
    *,
    parallel_workers: int,
) -> list[dict[str, float | str]]:
    """Measure the same operation with one worker and configured parallelism."""
    return [
        benchmark(f"{name}-sequential", lambda: operation(1)),
        benchmark(f"{name}-parallel", lambda: operation(parallel_workers)),
    ]
