from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from .hardware_runtime import RuntimeConfig, configure_reproducibility, load_runtime_config
from .paths import DataPaths, resolve_data_paths

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class PipelineConfig:
    root: Path
    data_root: Path
    interim_root: Path
    output_root: Path
    runtime: RuntimeConfig
    data_paths: DataPaths

    @classmethod
    def from_root(cls, root: str | Path = ".") -> "PipelineConfig":
        root = Path(root).resolve()
        package_root = Path(__file__).resolve().parents[1]
        yaml_path = package_root / "config" / "hardware.yaml"
        if not yaml_path.exists():
            yaml_path = root / "config" / "hardware.yaml"
        runtime = load_runtime_config(yaml_path)
        configure_reproducibility(runtime)
        config = cls(
            root=root,
            data_root=root,
            interim_root=root / "data" / "interim",
            output_root=root / "data" / "processed",
            runtime=runtime,
            data_paths=resolve_data_paths(root),
        )
        config.interim_root.mkdir(parents=True, exist_ok=True)
        config.output_root.mkdir(parents=True, exist_ok=True)
        return config
