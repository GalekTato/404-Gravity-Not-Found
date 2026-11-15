# TerraSync — Benchmarks de Procesamiento y Minería de Datos

> **Equipo**: 404 Gravity Not Found  
> **Fecha de medición**: 15 de noviembre de 2026  
> **Cobertura**: 32 entidades federativas de México + Aguas Nacionales (ZEE 200 mn) · 216 meses (`2010-01` a `2027-12`)

---

## 1. Entorno de Hardware Perfilado (`backend/pipeline/hardware_runtime.py`)

| Recurso | Especificación Medida |
| :--- | :--- |
| **CPU** | 16 hilos lógicos (`14` workers paralelos habilitados por política adaptativa) |
| **Memoria RAM** | `16.99 GB` totales (`4.17 GB` presupuesto dinámico, techo 78% RAM libre) |
| **GPU** | `NVIDIA GeForce RTX 4050 Laptop GPU` (`6.44 GB` VRAM, CUDA disponible) |
| **Stack de Cómputo** | Python + PyTorch `2.11.0+cu128`, scikit-learn, Dask, PyArrow, h5py, netCDF4, pyhdf |
| **Base de Datos Espacial** | PostgreSQL 16 (contenedor `nasa_db`) + Redis 7 |

---

## 2. Volumen de Datos Ingestados y Catálogo Espacial

| Fuente / Archivo | Cantidad de Archivos | Rol en TerraSync |
| :--- | ---: | :--- |
| **NASA GPM IMERG v07B** (`.HDF5`) | 197 | Precipitación satelital mensual (`0.1°`) |
| **NASA Terra MODIS MOD11C3** (`.hdf`) | 206 | Temperatura superficial terrestre LST día/noche (`0.05°`) |
| **NASA GLDAS Noah v2.1** (`.nc4`) | 199 | Humedad del suelo, escurrimiento superficial y clima (`0.25°`) |
| **NASA FIRMS (VIIRS)** (`.csv`) | 6 | Focos activos de calor e incendios forestales |
| **JAXA ALOS PALSAR** (`.npz`) | 15 | Retrodispersión radar SAR polarimétrica (`EPSG:32614 -> WGS84`) |
| **NASA-ISRO NISAR GCOV** (`.npz`) | 15 | Escenas polarimétricas de radar SAR |
| **Total archivos locales** | **638** | **0 advertencias de inventario (`inventory_warnings = 0`)** |

- **Eventos georreferenciados en catálogo PostgreSQL (`SpatialHazardEvent`)**: `3,502` eventos (`216` meses de `2010-01` a `2027-12`, `32` estados cubiertos, `32` predicciones estatales por mes para todo `2027` — `384` predicciones en el año).

---

## 3. Benchmark de Procesamiento de Datos y Cómputo

| Etapa / Operación | Modo Evaluado | Tiempo Medido | Aceleración |
| :--- | :--- | ---: | ---: |
| **Limpieza y sanitización SAR (ALOS NPZ)** | Secuencial (`1` worker) | `1.0656 s` | `1.00×` |
| **Limpieza y sanitización SAR (ALOS NPZ)** | Paralelo (`14` workers `ProcessPoolExecutor`) | `0.6637 s` | **`1.61×`** |
| **Lectura de cubos NASA GPM IMERG (HDF5)** | `h5py-streaming` directo | `0.6482 s` | `1.00×` |
| **Lectura de cubos NASA GPM IMERG (HDF5)** | `Dask` lazy chunked computation | `0.0127 s` | **`51.1×`** |
| **Pipeline espacial + Ensamble 2027 (32 estados × 216 meses)** | `LR + RF + ExtraTrees` + fusión log-odds | `11.037 s` | — |
| **Detección multivariada de anomalías** | `IsolationForest` (`200` árboles) | `0.294 s` | — |
| **Autoencoder Neuronal (PyTorch, 3,750 filas × 5 épocas, batch 128)** | CPU (`float32`) | `23.697 s` | `1.00×` |
| **Autoencoder Neuronal (PyTorch, 3,750 filas × 5 épocas, batch 128)** | GPU CUDA AMP (`RTX 4050`, `float16`) | `14.247 s` | **`1.66×`** |

---

## 4. Desempeño de Modelos Predictivos (Backtesting Cronológico Estricto `80% / 20%`)

Validación estricta fuera de muestra: el **80%** cronológico inicial entrena el ensamble (`LogisticRegression` + `RandomForestClassifier` + `ExtraTreesClassifier` con calibración *log-odds* a tasa base) y el **20%** final evalúa discriminación y calibración contra catálogos independientes:

| Amenaza | Fuente de Verdad Terreno | Train / Test | ROC-AUC | F1-Score | Precisión | Recall | Brier Score (↓ mejor) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Inundaciones y Ciclones (`inundacion`)** | NOAA IBTrACS v04r01 (Atlántico Norte + Pacífico Oriental) | `151 / 38` meses (`20` pos. test) | **0.9944** | **0.9756** | **0.9524** | **1.0000** | **0.0518** |
| **Incendios Forestales (`incendio`)** | NASA FIRMS (VIIRS) + NASA EONET v3 | `92 / 23` meses (`9` pos. test) | **0.8571** | **0.5000** | **1.0000** | **0.3333** | **0.2343** |
| **Sequía / Estrés Hídrico (`sequia`)** | — | — | *Indicador físico (`proxy`)* | — | — | — | — |
| **Sismos / SAR (`sismo`)** | USGS Earthquake Catalog | — | *Histórico `observed` + screening SAR* | — | — | — | — |

---

## 5. Latencia de API y Base de Datos PostgreSQL 16

| Consulta / Endpoint | Resultado | Latencia Medida |
| :--- | :--- | ---: |
| **Consulta mensual filtrada (`/api/predictions/?period=2027-08`)** | `32` predicciones estatales de agosto 2027 | **`23.12 ms`** |
| **Agregación completa de línea del tiempo (`/api/timemap/`)** | `216` periodos (`2010-01` – `2027-12`, `3,502` registros) | **`287.51 ms`** |
| **Almacenamiento espacial** | Índices compuestos B-tree `(period, hazard_type)` y `(state_clave, period)` | Solo PostgreSQL 16 |
