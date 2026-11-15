# Antigravity CLI Handoff

## Purpose

This file is the complete working context for continuing the geospatial
pipeline and frontend/backend integration from Antigravity CLI.

Workspaces:

- Pipeline: `D:\Hack`
- Integrated application: `D:\Hack\404-Gravity-Not-Found`
- Session plan: `C:\Users\const\.copilot\session-state\e388591f-e86a-435f-a9d0-146925863128\plan.md`

Do not reset, discard, or overwrite the existing dirty worktree. There are
staged, unstaged, generated, and untracked files from the integration effort.
Do not claim scientific validation when the evidence below says a result is
not evaluable.

## Original objective

Build and prepare for production a multisensor geospatial pipeline for Mexico
that:

- Uses CPU, RAM, GPU, workers, chunks, and cache dynamically.
- Runs correctly on Windows 64-bit with multiprocessing `spawn`.
- Supports CPU-only fallback and CUDA/AMP acceleration when available.
- Uses the available local datasets:
  - ALOS
  - NISAR
  - FIRMS
  - GPM
  - MODIS
  - GLDAS
- Produces explainable monthly hazard indicators for:
  - Fire
  - Drought
  - Flood
  - Tectonic screening
  - Multisensor anomalies
- Serves the scientific catalog through the Django backend.
- Displays evidence and scores through the React/MapLibre frontend.
- Keeps scientific observations, proxies, and unconfirmable signals distinct.
- Uses provenance, reproducibility, temporal backtesting, benchmarks, and
  deployment checks.
- Does not change the visual design unless a functional defect requires it.

Hardware target:

- AMD Ryzen 7 7435HS, 8 cores / 16 threads.
- 16 GB RAM.
- NVIDIA RTX 4050 Laptop GPU, approximately 6 GB VRAM.
- Windows 64-bit.

Language policy:

- Code identifiers, comments, docstrings, technical logs, and developer-facing
  documentation introduced by the work are in English.
- Scientific data values, domain labels, and existing Spanish user-facing
  product copy remain unchanged unless a defect requires otherwise.

## Chronological history

### Phase 1: Initial resource-aware pipeline

The initial implementation created:

- `hardware_runtime.py`
- `config/hardware.yaml`
- `pipeline/`
- `tests/`
- `pyproject.toml`

The first pipeline included:

- Dynamic CPU/RAM/GPU detection.
- Configurable workers and chunks.
- NPZ cleaning.
- Tile features.
- FIRMS conversion.
- IsolationForest training and inference.
- Basic benchmarks.
- A neural route in `pipeline/neural.py`.

The first audit found that ALOS and FIRMS were being used while GPM, MODIS,
GLDAS, and NISAR were primarily inventoried or not fully integrated.

### Phase 2: Scientific multisensor integration

The pipeline was expanded to process all intended local data sources:

- ALOS and NISAR NPZ tiles.
- FIRMS text/CSV observations.
- GPM HDF5.
- MODIS HDF4.
- GLDAS NetCDF4.

The scientific path:

- Reads raster/series inputs by file and Mexico bounding box.
- Avoids loading the complete historical archive into memory.
- Aggregates to monthly features.
- Stores intermediate results in Parquet.
- Uses atomic output and manifests for cache reuse.
- Produces `hazard_catalog.parquet`.

The catalog contains approximately 203 months and 91 columns in the latest
validated run.

### Phase 3: Frontend/backend integration

The repository `GalekTato/404-Gravity-Not-Found` was cloned to:

`D:\Hack\404-Gravity-Not-Found`

The local integration combined the frontend and backend branches into an
`integration` working state.

Frontend:

- React 19.
- Vite.
- TypeScript.
- MapLibre.
- Existing visual design preserved.

Backend:

- Django.
- Django REST Framework.
- OpenAPI-related configuration.
- PostgreSQL through environment variables in Docker.
- SQLite fallback for local development.

The backend was changed from synthetic disaster generation to reading the
scientific Parquet catalog.

The frontend was changed to consume the GeoJSON contract with scientific
evidence, score, month, observation state, and source.

### Phase 4: Audit and remediation

Before code corrections, English AI-use manifests were created:

- `D:\Hack\AI_USAGE_MANIFEST.md`
- `D:\Hack\404-Gravity-Not-Found\AI_USAGE_MANIFEST.md`

The audit corrected or added:

- CUDA capability reporting.
- GPU fallback behavior.
- Dynamic resource detection.
- Windows process spawning.
- Cache invalidation and atomic writes.
- Descending-coordinate slicing.
- Empty feature exports.
- Model artifact validation.
- Backend secret and database configuration.
- Removal of synthetic events.
- Frontend/backend scientific evidence contract.
- Regression tests.

### Phase 5: Production validation

The following were implemented:

- USGS earthquake catalog download and normalization.
- NOAA IBTrACS North Atlantic download and normalization.
- Local FIRMS label normalization.
- Chronological backtesting.
- Dask versus streaming benchmark.
- CUDA/AMP validation.
- Adaptive batch behavior.
- Resource monitoring.
- Production evidence artifacts.

The latest work additionally implemented:

- `pipeline/paths.py`
  - Resolves both direct ALOS/NISAR roots and `Hack\Datos`.
- `pipeline/execution.py`
  - Selects sequential versus parallel execution based on file count and total
    bytes.
- Adaptive cleaning and feature thresholds in `config/hardware.yaml`.
- Training job selection that avoids estimator parallelism for tiny datasets.
- `data/processed/data_inventory.json`.
- Updated production evidence and AI-use manifests.

## Current local data layout

The current verified locations are:

```text
D:\Hack\alos_mexico_reducido\content\hackaton_alos\datos_reducidos
D:\Hack\nisar_mexico_reducido\content\hackaton_nisar\datos_reducidos
D:\Hack\Hack\Datos\datos_firms_incendios
D:\Hack\Hack\Datos\datos_gpm_mexico
D:\Hack\Hack\Datos\datos_modis_temperatura
D:\Hack\Hack\Datos\datos_gldas_mexico
```

There is no `D:\Hack\Datos` directory in the current layout. The canonical
scientific archive is `D:\Hack\Hack\Datos`.

The resolver supports:

- Direct roots under `D:\Hack`.
- `D:\Hack\Hack\Datos`.
- `D:\Hack\Datos` if that layout is used later.

Latest verified inventory:

| Source | Files |
|---|---:|
| ALOS | 15 |
| NISAR | 15 |
| FIRMS | 6 |
| GPM | 197 |
| MODIS | 206 |
| GLDAS | 199 |

Generated inventory:

`D:\Hack\data\processed\data_inventory.json`

The complete pipeline generated this inventory before processing.

## Pipeline architecture

### Runtime and hardware

`D:\Hack\hardware_runtime.py`

Responsibilities:

- Detect CPU count.
- Detect RAM and available RAM through `psutil`.
- Detect CUDA through PyTorch.
- Detect NVIDIA name and VRAM through `nvidia-smi`.
- Calculate RAM budget dynamically.
- Configure workers, chunks, batch, pinning, and persistence.
- Configure deterministic seeds.
- Monitor RAM, CPU, and VRAM.
- Reduce batch size after CUDA out-of-memory errors.

Latest verified runtime:

- CPU count: 16.
- Dynamic worker count: 14.
- RAM budget fluctuates with currently available memory.
- GPU: NVIDIA GeForce RTX 4050 Laptop GPU.
- GPU memory: approximately 6 GB total.
- CUDA: available.
- PyTorch: `2.11.0+cu128`.

### Configuration

`D:\Hack\config\hardware.yaml`

Important values:

- `workers: auto`
- `ram_fraction: 0.78`
- `chunk_size: auto`
- `batch_size: auto`
- `gpu_enabled: auto`
- `persistent_workers: true`
- `deterministic: true`
- `parallel_min_files: auto`
- `parallel_min_bytes_mb: auto`

The current dynamic threshold resolved to approximately:

- Minimum files: 8.
- Minimum bytes: 512 MiB on the latest run.

The exact byte threshold depends on the detected RAM budget.

### Data path resolution

`D:\Hack\pipeline\paths.py`

Defines `DataPaths` and `resolve_data_paths()`.

### Adaptive execution

`D:\Hack\pipeline\execution.py`

Rules:

- Small or cached inputs use one process.
- Larger inputs may use configured `spawn` workers.
- Tiny IsolationForest datasets use `n_jobs=1`.
- Larger datasets use estimator parallelism.

This prevents the previously measured multiprocessing overhead from slowing
small workloads.

### Cleaning

`D:\Hack\pipeline\cleaning.py`

Features:

- NPZ processing.
- Streaming SHA-256 source hash.
- Atomic temporary output.
- Float32 conversion.
- NaN and infinity normalization.
- Windows-safe `spawn`.
- Adaptive worker selection.

### Features

`D:\Hack\pipeline\features.py`

Features:

- Per-tile statistics.
- Float32 arrays.
- Finite-value filtering.
- Percentiles and valid fractions.
- Log-ratio feature.
- Adaptive worker selection.
- Empty Parquet output support.

### Scientific aggregation

`D:\Hack\pipeline\scientific.py`

Readers:

- GPM via HDF5.
- MODIS via HDF4.
- GLDAS via NetCDF4.
- FIRMS via CSV/text.

All source files are processed by file, cropped/statistically summarized to
the Mexico bounding box, and aggregated by month.

### Hazard catalog

`D:\Hack\pipeline\hazards.py`

Current hazard semantics:

- Fire:
  - FIRMS observed fire count where available.
  - Multisensor fire risk proxy.
- Drought:
  - GPM precipitation and GLDAS soil moisture proxy.
- Flood:
  - GPM precipitation and GLDAS runoff/rain proxy.
- Tectonic:
  - SAR log-ratio screening proxy.
  - Usually `no_confirmable` because valid co-registered temporal SAR pairs
    are not available.
- Multisensor anomaly:
  - IsolationForest proxy.

Do not describe proxy indicators as confirmed predictions.

### Model

`D:\Hack\pipeline\models.py`

The main classical model remains IsolationForest because the current catalog
does not have sufficient authoritative supervised labels for all hazards.

Current behavior:

- Uses numeric features.
- Replaces invalid values.
- Stores model and feature columns in a Joblib artifact.
- Validates columns at inference.
- Uses estimator parallelism only when sample volume justifies it.

### Neural path

`D:\Hack\pipeline/neural.py`

Optional PyTorch route:

- CUDA when available.
- CPU fallback.
- AMP.
- DataLoader workers.
- `pin_memory`.
- Persistent workers.
- Gradient accumulation.
- Adaptive batch reduction after OOM.

The neural path is optional and is not the primary catalog model.

### CLI

`D:\Hack\pipeline\cli.py`

Commands:

```powershell
python -m pipeline.cli inventory --root D:\Hack
python -m pipeline.cli run --root D:\Hack
python -m pipeline.cli benchmark --root D:\Hack
python -m pipeline.cli ground-truth --root D:\Hack
python -m pipeline.cli backtest --root D:\Hack
python -m pipeline.cli lazy-benchmark --root D:\Hack
```

The `run` command:

1. Writes the data inventory.
2. Cleans ALOS and NISAR.
3. Converts FIRMS.
4. Builds ALOS and NISAR features.
5. Aggregates GPM, MODIS, GLDAS, and FIRMS.
6. Builds the hazard catalog.
7. Trains the anomaly model.
8. Runs inference.

## External data and backtesting

### Acquired

USGS:

- `D:\Hack\data\interim\external\usgs_earthquakes.geojson`
- `D:\Hack\data\interim\external\usgs_earthquakes.manifest.json`
- `D:\Hack\data\interim\external\usgs_earthquake_labels.parquet`

NOAA IBTrACS:

- `D:\Hack\data\interim\external\ibtracs_na.csv`
- `D:\Hack\data\interim\external\ibtracs_na.manifest.json`
- `D:\Hack\data\interim\external\ibtracs_labels.parquet`

NASA FIRMS local observations + NASA EONET v3 Historical Wildfires:

- `D:\Hack\data\interim\external\eonet_wildfires.json`
- `D:\Hack\data\interim\external\eonet_wildfires.manifest.json`
- `D:\Hack\data\interim\external\firms_labels.parquet`
- `D:\Hack\data\interim\external\firms_labels.manifest.json`

Manifests contain URL, retrieval time, coverage, and SHA-256 where applicable.

### Not available as independent ground truth

- Authoritative historical drought labels (`sequia`).
- Sufficient co-registered SAR temporal pairs for tectonic confirmation (`sismo`).

GPM and GLDAS are available as scientific indicators, but using the same
indicator family as independent ground truth would create leakage and is not
scientifically acceptable.

### Backtesting implementation

`D:\Hack\pipeline\backtesting.py`

Rules:

- Per-hazard chronological train/test split (80% / 20%) over overlapping months with finite scores and ground-truth coverage.
- Complete monthly boolean series (`observed=True/False`) generated within each external source's coverage window.
- Threshold learned only from training months.
- No test leakage.
- Precision, recall, F1, and Brier score when evaluable.
- Explicit diagnostic skip reasons when not evaluable.

Latest result:

`D:\Hack\data\processed\backtest.json`

Current result evaluates `incendio` (100 train / 25 test months against NASA FIRMS + NASA EONET v3 wildfires) and `inundacion` (151 train / 38 test months against NOAA IBTrACS v04r01 tropical cyclone tracks in Mexico), while explicitly skipping `sequia` (no independent labels) and `sismo` (zero finite SAR tectonic scores due to only 2 months of local SAR tiles).

## Generated artifacts

Important artifacts:

```text
D:\Hack\data\interim\mexico_monthly_features.parquet
D:\Hack\data\interim\mexico_monthly_features.manifest.json
D:\Hack\data\interim\alos_features.parquet
D:\Hack\data\interim\nisar_features.parquet
D:\Hack\data\interim\firms.parquet
D:\Hack\data\processed\hazard_catalog.parquet
D:\Hack\data\processed\alos_anomalies.parquet
D:\Hack\data\processed\isolation_forest.joblib
D:\Hack\data\processed\data_inventory.json
D:\Hack\data\processed\benchmark.json
D:\Hack\data\processed\backtest.json
D:\Hack\data\processed\lazy_benchmark.json
D:\Hack\data\processed\neural_benchmark.json
D:\Hack\data\processed\production_evidence.json
```

## Backend integration

Repository:

`D:\Hack\404-Gravity-Not-Found`

Important files:

- `nasa_api/settings.py`
  - Safe secret configuration.
  - Configurable `DEBUG`.
  - Configurable hosts and CORS.
  - PostgreSQL when `DATABASE_HOST` is set.
  - SQLite fallback otherwise.
- `nasa_api/services/catalog.py`
  - Reads the Parquet catalog.
  - Maps catalog rows to GeoJSON.
  - Filters invalid scores.
  - Preserves observed events.
- `nasa_api/views/Prediction.py`
  - Scientific catalog endpoint.
  - Catalog status endpoint.
  - Date validation.
  - No synthetic event generation.
- `nasa_api/urls.py`
  - Prediction and catalog routes.
- `nasa_api/test_catalog.py`
  - Catalog service and endpoint tests.
- `docker-compose.yml`
  - PostgreSQL.
  - Redis.
  - Django web service.
  - Environment-based credentials.
- `.env.example`
  - Technical environment variables without insecure credentials.

Expected API routes:

```text
/api/predictions/
/api/catalog/status/
```

The backend uses:

```text
PIPELINE_DATA_ROOT=D:\Hack
```

The backend returns aggregated representative Mexico coordinates. This is not
precise event geolocation and must not be presented as precise localization.

## Frontend integration

Important files:

- `src/funcionalidades/explorar/servicios/predicciones.ts`
  - Runtime validation of GeoJSON and evidence fields.
- `src/funcionalidades/explorar/componentes/PredictionMarkers.tsx`
  - Popup with evidence, score, month, observation, and source.
- `src/funcionalidades/explorar/componentes/MexicoMap.tsx`
  - Scientific indicator status text.
- `src/servicios/contratoObservaciones.ts`
  - Shared observation contract.

Do not change visual design unless necessary for a functional bug.

## Docker status

Docker Desktop and Docker Compose are installed and verified on the host:

- `Docker version 29.9.3, build 5457199`
- `Docker Compose version v5.7.0`

`D:\Hack\404-Gravity-Not-Found\docker-compose.yml` mounts `../data:/pipeline_data/data:ro` into the `web` container and configures `PIPELINE_DATA_ROOT=${PIPELINE_DATA_ROOT:-/pipeline_data}`.

Verified container commands and smoke checks:

```powershell
docker --version
docker compose version
docker compose -f D:\Hack\404-Gravity-Not-Found\docker-compose.yml config
docker compose -f D:\Hack\404-Gravity-Not-Found\docker-compose.yml up --build -d
docker compose -f D:\Hack\404-Gravity-Not-Found\docker-compose.yml ps
docker compose -f D:\Hack\404-Gravity-Not-Found\docker-compose.yml logs web
Invoke-RestMethod -Uri "http://localhost:8000/api/catalog/status/"
Invoke-RestMethod -Uri "http://localhost:8000/api/predictions/?date=2020-09-15"
```

All PostgreSQL migrations (`admin`, `auth`, `authtoken`, `contenttypes`, `sessions`), container healthchecks (`nasa_db`, `nasa_redis`, `nasa_web`), and HTTP API smoke tests passed. Do not commit `.env` or credentials.

## Validation already completed

Pipeline:

- `python -m pytest -q`
  - Latest result: 13 passed.
- `python -m compileall -q D:\Hack\pipeline D:\Hack\hardware_runtime.py`
  - Passed.
- Full pipeline:
  - Passed.
- Inventory:
  - Passed.
- Backtesting command:
  - Passed with explicit non-evaluable skips.
- Lazy benchmark:
  - Passed.
- CUDA:
  - PyTorch `2.11.0+cu128`.
  - `torch.cuda.is_available() == True`.
  - RTX 4050 detected.
  - AMP smoke test passed.

Frontend/backend:

- Django `manage.py check`:
  - Passed when `SECRET_KEY` and `DEBUG` are explicitly set.
- Backend catalog tests:
  - Passed.
- TypeScript typecheck:
  - Passed.
- Frontend lint:
  - Passed.
- Frontend production build:
  - Passed.
- `git diff --check` in the application repository:
  - Passed.

Warnings:

- Frontend has large chunks above 500 kB. Build still passes. Do not redesign
  or optimize bundle splitting unless explicitly requested.
- GPU was slower than CPU for the tiny neural benchmark. This is expected for
  a small workload and does not prove GPU is slower for production-scale data.
- Dask was faster in the measured small GPM sample, but the current pipeline
  still uses streaming by default unless a larger benchmark justifies a global
  backend change.

## Measured performance

Historical benchmark values:

- Small cleaning sequential: approximately 0.03 seconds.
- Small cleaning parallel: approximately 4.07 seconds.
- GPM streaming: measured in the sub-second range.
- GPM Dask sample: approximately 0.01 seconds.
- Neural CPU smoke benchmark: approximately 1.396 seconds.
- Neural GPU smoke benchmark: approximately 5.45 seconds.

Interpretation:

- Do not force multiprocessing for small input.
- NISAR is large enough to be eligible for adaptive parallel cleaning/features.
- ALOS is small enough to remain sequential.
- Keep GPU adaptive and benchmark representative workloads.

## Current task state

Completed:

- Data-root resolver.
- All-source inventory with availability flags, byte counts, and missing-source warnings.
- Adaptive cleaning/features.
- Conditional training parallelism.
- USGS acquisition (`M >= 4.0`, `2010–2026`, complete monthly series).
- FIRMS local + NASA EONET v3 historical wildfire acquisition and complete monthly label normalization.
- NOAA IBTrACS acquisition and complete monthly label normalization (`ciclon` and `inundacion`).
- Full pipeline execution.
- Per-hazard chronological backtesting execution (`incendio` and `inundacion` evaluated; `sequia` and `sismo` explicitly skipped with diagnostic reasons).
- CUDA/AMP validation.
- Frontend/backend local checks (`13 passed` pytest, Django `check`, `test_catalog`, `pnpm typecheck`, `pnpm lint`, `pnpm build`).
- Docker (`29.9.3`) and Docker Compose (`v5.7.0`) container build, PostgreSQL migrations, and live HTTP endpoint smoke tests.
- AI-use manifests and production evidence updated.

Scientific limits explicitly preserved (not fabricated):

- Authoritative independent drought (`sequia`) ground-truth labels remain unavailable locally.
- Confirmed tectonic (`sismo`) backtesting remains non-evaluable because local ALOS (`2011-04`) and NISAR (`2026-11`) tiles only cover 2 non-overlapping months without co-registered SAR interferometric pairs.

No commits have been created.

## Recommended continuation order

1. Install Docker Desktop manually with administrator approval and restart
   Windows if Docker requests it.
2. Validate Docker Engine and Compose.
3. Run Docker Compose config, build, migrations, and API smoke tests.
4. If scientific backtesting is required, obtain longer overlapping FIRMS
   coverage and authoritative drought/flood labels with licenses and
   provenance.
5. Add those labels to `pipeline/ground_truth.py` without using proxy
   indicators as labels.
6. Re-run:

```powershell
Set-Location D:\Hack
python -m pipeline.cli ground-truth --root D:\Hack
python -m pipeline.cli run --root D:\Hack
python -m pipeline.cli backtest --root D:\Hack
python -m pipeline.cli benchmark --root D:\Hack
python -m pipeline.cli lazy-benchmark --root D:\Hack
python -m pytest -q
```

7. Re-run application checks from the correct application directory:

```powershell
Set-Location D:\Hack\404-Gravity-Not-Found
$env:SECRET_KEY = "local-only-test-secret"
$env:DEBUG = "True"
$env:PIPELINE_DATA_ROOT = "D:\Hack"
python manage.py check
python -m unittest nasa_api.test_catalog -v
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

8. Update:

- `D:\Hack\data\processed\production_evidence.json`
- `D:\Hack\AI_USAGE_MANIFEST.md`
- `D:\Hack\404-Gravity-Not-Found\AI_USAGE_MANIFEST.md`
- This handoff file.

## Important scientific constraints

- IsolationForest is unsupervised and remains the connected default because
  authoritative supervised labels are incomplete.
- A proxy score is not a confirmed event.
- `no_confirmable` is an intentional scientific state.
- USGS event availability does not automatically make the tectonic score
  evaluable; the score itself must have finite overlapping values.
- GPM/GLDAS indicators cannot be used as independent labels for the same
  derived scores without leakage.
- ALOs/NISAR coverage is not sufficient by itself to confirm tectonic events.
- Backend aggregate points represent Mexico-level indicators, not precise
  event locations.
- Docker and deployment status must remain blocked until the runtime commands
  actually pass.
