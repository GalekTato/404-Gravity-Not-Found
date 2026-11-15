from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Iterable


def source_manifest(paths: Iterable[str | Path]) -> list[dict[str, int | str]]:
    return [
        {"path": str(path), "size": path.stat().st_size, "mtime_ns": path.stat().st_mtime_ns}
        for path in sorted((Path(path) for path in paths), key=str)
    ]


def write_manifest(path: str | Path, sources: Iterable[str | Path], **metadata: object) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"sources": source_manifest(sources), "metadata": metadata}
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return path


def manifest_matches(path: str | Path, sources: Iterable[str | Path], **metadata: object) -> bool:
    path = Path(path)
    if not path.exists():
        return False
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return False
    if payload.get("sources") != source_manifest(sources):
        return False
    stored_metadata = payload.get("metadata", {})
    return all(stored_metadata.get(key) == value for key, value in metadata.items())


def atomic_replace(source: str | Path, destination: str | Path) -> Path:
    """Replace a result only after it has been completely written."""
    source, destination = Path(source), Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    os.replace(source, destination)
    return destination
