"""Dynamic CPU/RAM/GPU runtime configuration for the data pipeline.

The module is intentionally optional-dependency friendly: CPU-only machines can
import it without PyTorch, Dask, Zarr, or CuPy installed. Pipeline stages can
use ``detect_hardware`` and ``HardwareRuntime`` at startup and keep their own
domain-specific processing logic.
"""

from __future__ import annotations

import contextlib
import json
import logging
import os
import random
import subprocess
import threading
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Callable, Iterator, TypeVar

LOGGER = logging.getLogger("pipeline.hardware")
T = TypeVar("T")


def _optional_import(name: str) -> Any:
    try:
        return __import__(name)
    except ImportError:
        return None


def _nvidia_memory() -> tuple[int, int]:
    """Return (free_bytes, total_bytes), or (0, 0) when NVIDIA is unavailable."""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.free,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            check=True,
            timeout=3,
        )
        values = result.stdout.splitlines()[0].split(",")
        free_mib, total_mib = (int(value.strip()) for value in values[:2])
        return free_mib * 1024**2, total_mib * 1024**2
    except (OSError, ValueError, IndexError, subprocess.SubprocessError):
        return 0, 0


def _nvidia_name() -> str | None:
    """Return the first NVIDIA device name when nvidia-smi is available."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            check=True,
            timeout=3,
        )
        name = result.stdout.splitlines()[0].strip()
        return name or None
    except (OSError, IndexError, subprocess.SubprocessError):
        return None


@dataclass(frozen=True)
class HardwareInfo:
    cpu_count: int
    workers: int
    total_ram_bytes: int
    available_ram_bytes: int
    ram_budget_bytes: int
    gpu_available: bool
    cuda_available: bool
    gpu_name: str | None
    gpu_free_bytes: int
    gpu_total_bytes: int

    def as_log_dict(self) -> dict[str, Any]:
        value = asdict(self)
        for key in ("total_ram_bytes", "available_ram_bytes", "ram_budget_bytes",
                    "gpu_free_bytes", "gpu_total_bytes"):
            value[key.replace("_bytes", "_gb")] = round(value.pop(key) / 1024**3, 2)
        return value


def detect_hardware(
    *,
    ram_fraction: float = 0.78,
    max_workers: int = 16,
    reserve_cpus: int = 2,
) -> HardwareInfo:
    """Detect resources without requiring optional ML/data-science packages."""
    cpu_count = os.cpu_count() or 1
    workers = max(1, min(max_workers, cpu_count - reserve_cpus))

    psutil = _optional_import("psutil")
    if psutil is not None:
        memory = psutil.virtual_memory()
        total_ram, available_ram = int(memory.total), int(memory.available)
    else:
        total_ram = 0
        available_ram = 0
    if total_ram:
        ram_budget = min(int(total_ram * ram_fraction), int(available_ram * ram_fraction))
    else:
        ram_budget = 0

    torch = _optional_import("torch")
    torch_cuda = bool(torch is not None and torch.cuda.is_available())
    gpu_free, gpu_total = _nvidia_memory()
    gpu_name = _nvidia_name() if gpu_total else None
    if torch_cuda:
        gpu_name = str(torch.cuda.get_device_name(0))
        if not gpu_total:
            gpu_total = int(torch.cuda.get_device_properties(0).total_memory)
            gpu_free = int(torch.cuda.mem_get_info(0)[0])

    info = HardwareInfo(
        cpu_count=cpu_count,
        workers=workers,
        total_ram_bytes=total_ram,
        available_ram_bytes=available_ram,
        ram_budget_bytes=ram_budget,
        gpu_available=torch_cuda or gpu_total > 0,
        cuda_available=torch_cuda,
        gpu_name=gpu_name,
        gpu_free_bytes=gpu_free,
        gpu_total_bytes=gpu_total,
    )
    LOGGER.info("hardware detected: %s", json.dumps(info.as_log_dict(), sort_keys=True))
    return info


def _read_yaml(path: Path) -> dict[str, Any]:
    yaml = _optional_import("yaml")
    if yaml is not None:
        with path.open(encoding="utf-8") as stream:
            result = yaml.safe_load(stream) or {}
    else:
        # The bundled config uses a deliberately simple YAML subset so the
        # runtime remains usable on a fresh CPU-only Windows install.
        result = {}
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if not line or ":" not in line:
                continue
            key, value = (part.strip() for part in line.split(":", 1))
            if value == "auto":
                parsed: Any = value
            elif value.lower() in {"true", "false"}:
                parsed = value.lower() == "true"
            else:
                try:
                    parsed = float(value) if "." in value else int(value)
                except ValueError:
                    parsed = value.strip("'\"")
            result[key] = parsed
    if not isinstance(result, dict):
        raise ValueError(f"Hardware config must contain a mapping: {path}")
    return result


@dataclass(frozen=True)
class RuntimeConfig:
    workers: int
    ram_fraction: float
    ram_budget_bytes: int
    chunk_size: int
    batch_size: int
    gpu_enabled: bool
    gpu_device: int
    pin_memory: bool
    persistent_workers: bool
    prefetch_factor: int
    seed: int
    deterministic: bool
    cpu_scheduler: str
    io_scheduler: str
    cache_format: str
    cache_compression: str
    profiling_enabled: bool
    monitor_interval_seconds: int
    parallel_min_files: int
    parallel_min_bytes: int


def load_runtime_config(path: str | os.PathLike[str] = "config/hardware.yaml") -> RuntimeConfig:
    """Resolve ``auto`` values from the current machine at process startup."""
    raw = _read_yaml(Path(path))
    fraction = float(raw.get("ram_fraction", 0.78))
    info = detect_hardware(ram_fraction=fraction)
    budget = info.ram_budget_bytes or 1024**3
    requested_gpu = raw.get("gpu_enabled", "auto")
    gpu_enabled = info.cuda_available if requested_gpu == "auto" else bool(requested_gpu) and info.cuda_available
    chunk = raw.get("chunk_size", "auto")
    batch = raw.get("batch_size", "auto")
    # Keep defaults conservative for 16 GB/6 GB systems; stages may reduce them.
    chunk_size = max(1, int(chunk if chunk != "auto" else min(1_000_000, budget // 64)))
    batch_size = max(1, int(batch if batch != "auto" else (32 if gpu_enabled else 8)))
    minimum_files = raw.get("parallel_min_files", "auto")
    minimum_bytes_mb = raw.get("parallel_min_bytes_mb", "auto")
    parallel_min_files = max(
        1,
        int(minimum_files if minimum_files != "auto" else 8),
    )
    parallel_min_bytes = max(
        1,
        int(
            float(minimum_bytes_mb) * 1024**2
            if minimum_bytes_mb != "auto"
            else min(512 * 1024**2, max(64 * 1024**2, budget // 8))
        ),
    )
    pin = raw.get("pin_memory", "auto")
    pin_memory = gpu_enabled if pin == "auto" else bool(pin)
    return RuntimeConfig(
        workers=max(1, int(raw.get("workers", "auto") if raw.get("workers", "auto") != "auto" else info.workers)),
        ram_fraction=fraction,
        ram_budget_bytes=(
            budget
            if raw.get("ram_budget_gb", "auto") == "auto"
            else max(1, int(float(raw["ram_budget_gb"]) * 1024**3))
        ),
        chunk_size=chunk_size,
        batch_size=batch_size,
        gpu_enabled=gpu_enabled,
        gpu_device=int(raw.get("gpu_device", 0)),
        pin_memory=pin_memory,
        persistent_workers=bool(raw.get("persistent_workers", True)),
        prefetch_factor=max(1, int(raw.get("prefetch_factor", 2))),
        seed=int(raw.get("seed", 20261115)),
        deterministic=bool(raw.get("deterministic", True)),
        cpu_scheduler=str(raw.get("cpu_scheduler", "processes")),
        io_scheduler=str(raw.get("io_scheduler", "threads")),
        cache_format=str(raw.get("cache_format", "zarr")),
        cache_compression=str(raw.get("cache_compression", "zstd")),
        profiling_enabled=bool(raw.get("profiling_enabled", True)),
        monitor_interval_seconds=max(1, int(raw.get("monitor_interval_seconds", 10))),
        parallel_min_files=parallel_min_files,
        parallel_min_bytes=parallel_min_bytes,
    )


def seed_worker(worker_id: int, base_seed: int) -> None:
    """Deterministically seed Python, NumPy, and Torch in a spawned worker."""
    seed = (int(base_seed) + int(worker_id)) % (2**32)
    random.seed(seed)
    numpy = _optional_import("numpy")
    if numpy is not None:
        numpy.random.seed(seed)
    torch = _optional_import("torch")
    if torch is not None:
        torch.manual_seed(seed)


def configure_reproducibility(config: RuntimeConfig) -> None:
    random.seed(config.seed)
    os.environ.setdefault("PYTHONHASHSEED", str(config.seed))
    torch = _optional_import("torch")
    if torch is not None:
        torch.manual_seed(config.seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(config.seed)
        if config.deterministic:
            torch.use_deterministic_algorithms(True, warn_only=True)
            torch.backends.cudnn.benchmark = False


def adaptive_batch(
    operation: Callable[[int], T],
    initial_batch: int,
    *,
    minimum: int = 1,
) -> tuple[T, int]:
    """Retry an operation with smaller batches only after an OOM."""
    batch = max(minimum, int(initial_batch))
    while True:
        try:
            return operation(batch), batch
        except RuntimeError as error:
            message = str(error).lower()
            if "out of memory" not in message and "cuda" not in message:
                raise
            if batch <= minimum:
                raise
            batch = max(minimum, batch // 2)
            torch = _optional_import("torch")
            if torch is not None and torch.cuda.is_available():
                torch.cuda.empty_cache()
            LOGGER.warning("OOM; retrying with batch_size=%d", batch)


class ResourceMonitor:
    """Periodic RAM/CPU/VRAM logging and memory-pressure signal."""

    def __init__(self, interval_seconds: int = 10, ram_fraction: float = 0.78):
        self.interval_seconds = interval_seconds
        self.ram_fraction = ram_fraction
        self.pressure = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def _sample(self) -> None:
        psutil = _optional_import("psutil")
        while not self._stop.wait(self.interval_seconds):
            if psutil is None:
                continue
            memory = psutil.virtual_memory()
            cpu = psutil.cpu_percent(interval=None)
            over_budget = memory.percent / 100 >= self.ram_fraction
            self.pressure.set() if over_budget else self.pressure.clear()
            LOGGER.info(
                "resources ram=%.1f%% cpu=%.1f%% vram=%s",
                memory.percent,
                cpu,
                json.dumps({k: round(v / 1024**3, 2) for k, v in zip(
                    ("free_gb", "total_gb"), _nvidia_memory()
                )}),
            )

    def __enter__(self) -> "ResourceMonitor":
        self._thread = threading.Thread(target=self._sample, name="resource-monitor", daemon=True)
        self._thread.start()
        return self

    def __exit__(self, *_: Any) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=self.interval_seconds + 1)


@contextlib.contextmanager
def profile_stage(name: str, enabled: bool = True) -> Iterator[None]:
    """Emit wall time for every stage; cProfile is opt-in via the caller."""
    started = time.perf_counter()
    try:
        yield
    finally:
        LOGGER.info("stage=%s elapsed_seconds=%.3f", name, time.perf_counter() - started)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    config = load_runtime_config()
    configure_reproducibility(config)
    LOGGER.info("resolved config: %s", json.dumps(asdict(config), sort_keys=True))
