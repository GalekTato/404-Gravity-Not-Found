from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np

from .scientific import MEXICO_BBOX, _slice, _stats, aggregate_gpm


def benchmark_gpm_backends(source: str | Path, output: str | Path) -> Path:
    """Compare direct streaming against a Dask-backed HDF5 slice."""
    source, output = Path(source), Path(output)
    measurements: list[dict[str, object]] = []

    started = time.perf_counter()
    aggregate_gpm(source)
    measurements.append({"backend": "h5py-streaming", "seconds": time.perf_counter() - started})

    try:
        import dask.array as da
        import h5py
    except ImportError:
        measurements.append({"backend": "dask", "available": False})
    else:
        started = time.perf_counter()
        with h5py.File(source, "r") as handle:
            lat = handle["Grid/lat"][:]
            lon = handle["Grid/lon"][:]
            lat_slice = _slice(lat, MEXICO_BBOX["lat_min"], MEXICO_BBOX["lat_max"])
            lon_slice = _slice(lon, MEXICO_BBOX["lon_min"], MEXICO_BBOX["lon_max"])
            values = da.from_array(
                handle["Grid/precipitation"],
                chunks=(1, min(512, len(lon)), min(512, len(lat))),
            )[0, lon_slice, lat_slice]
            result = _stats(values.compute(), "gpm_precip", fill=-9999.9)
            if not np.isfinite(result["gpm_precip_mean"]):
                raise ValueError("Dask benchmark produced a non-finite result.")
        measurements.append({"backend": "dask", "available": True, "seconds": time.perf_counter() - started})

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"source": str(source), "measurements": measurements}, indent=2), encoding="utf-8")
    return output
