from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DataPaths:
    alos: Path
    nisar: Path
    firms: Path
    gpm: Path
    modis: Path
    gldas: Path

    def as_dict(self) -> dict[str, Path]:
        return {
            "alos": self.alos,
            "nisar": self.nisar,
            "firms": self.firms,
            "gpm": self.gpm,
            "modis": self.modis,
            "gldas": self.gldas,
        }


def _first_existing(root: Path, candidates: tuple[Path, ...]) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def resolve_data_paths(root: str | Path) -> DataPaths:
    """Resolve both the canonical archive and direct dataset layouts."""
    root = Path(root).resolve()
    archive = root / "Hack" / "Datos"
    direct_archive = root / "Datos"

    alos = _first_existing(
        root,
        (
            root / "alos_mexico_reducido" / "content" / "hackaton_alos" / "datos_reducidos",
            archive / "alos_mexico_reducido" / "content" / "hackaton_alos" / "datos_reducidos",
        ),
    )
    nisar = _first_existing(
        root,
        (
            root / "nisar_mexico_reducido" / "content" / "hackaton_nisar" / "datos_reducidos",
            archive / "nisar_mexico_reducido" / "content" / "hackaton_nisar" / "datos_reducidos",
        ),
    )

    def source(name: str) -> Path:
        return _first_existing(
            root,
            (
                archive / name,
                direct_archive / name,
                root / "Hack" / name,
            ),
        )

    return DataPaths(
        alos=alos,
        nisar=nisar,
        firms=source("datos_firms_incendios"),
        gpm=source("datos_gpm_mexico"),
        modis=source("datos_modis_temperatura"),
        gldas=source("datos_gldas_mexico"),
    )
