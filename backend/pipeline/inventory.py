from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from .paths import resolve_data_paths


def _npz_summary(path: Path) -> dict[str, Any]:
    with np.load(path, allow_pickle=False) as data:
        arrays = {}
        for key in data.files:
            value = data[key]
            arrays[key] = {"shape": list(value.shape), "dtype": str(value.dtype)}
        return {"path": str(path), "format": "npz", "arrays": arrays}


def _text_summary(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8", errors="replace") as stream:
        header = stream.readline().strip().split(",")
    return {"path": str(path), "format": "csv", "columns": header}


def build_inventory(root: str | Path = ".") -> dict[str, Any]:
    root = Path(root)
    groups = resolve_data_paths(root).as_dict()
    warnings: list[str] = []
    result: dict[str, Any] = {"groups": {}, "warnings": warnings}
    for name, directory in groups.items():
        files = sorted(path for path in directory.glob("*") if path.is_file()) if directory.exists() else []
        total_bytes = sum(path.stat().st_size for path in files)
        if not files:
            warnings.append(f"Expected dataset source '{name}' has no files at {directory}")
        samples = []
        for path in files[:3]:
            if path.suffix.lower() == ".npz":
                samples.append(_npz_summary(path))
            elif path.suffix.lower() == ".txt":
                samples.append(_text_summary(path))
            else:
                samples.append({"path": str(path), "format": path.suffix.lower() or "unknown"})
        result["groups"][name] = {
            "resolved_path": str(directory),
            "available": len(files) > 0,
            "count": len(files),
            "total_bytes": total_bytes,
            "samples": samples,
        }
    return result


if __name__ == "__main__":
    print(json.dumps(build_inventory(), indent=2, ensure_ascii=False))
