# 404 Gravity Not Found — Earth Symphony México

Plataforma web para explorar el territorio mexicano y visualizar indicadores geoespaciales de amenazas. Integra un frontend React con mapas MapLibre y una escena Three.js, una API Django REST, un catálogo preparado por el pipeline y experiencias de sonificación interactiva.

> Los indicadores y su sonificación son una herramienta de exploración, no alertas oficiales ni sustituyen fuentes de Protección Civil. La representación orbital de NISAR es ilustrativa: no muestra telemetría ni posiciones reales.

## Funcionalidades

### Inicio espacial

- Globo 3D con Three.js, textura local NASA Blue Marble, estrellas y una representación visual de NISAR.
- Giro con ratón, táctil y teclado; controles para zoom, pausa y vista inicial.
- Carga diferida de la escena, preferencia de movimiento reducido y liberación de recursos al salir de la página.

### Explorar México

- Mapa interactivo MapLibre con límites estatales y municipales locales del INEGI.
- Capa topográfica SRTM/NASA servida por terrestris/mundialis; requiere conexión a Internet.
- Selector accesible de entidades y municipios, panel territorial, controles de zoom y regreso a la vista nacional.
- Colección municipal cargada únicamente para la entidad seleccionada.
- Capa de eventos GeoJSON con color por tipo y tamaño según severidad. El popup detalla amenaza, fecha, evidencia, probabilidad, score y fuente.
- Filtros para Sismo, Huracán, Sequía, Inundación e Incendio.

### TimeMap histórico

- Cronología por periodo con 203 meses posibles entre 2010 y 2026, dependiendo del catálogo instalado.
- Navegación entre meses y reproducción secuencial de la línea de tiempo.
- Filtros por tipo de amenaza, eventos, estados afectados, severidad máxima y titular del periodo.
- Barras que comparan visualmente periodos y amenazas.

### Sonificación

- Cada amenaza tiene su propio patrón rítmico, tempo y timbre sintetizado. Las melodías se basan en una escala pentatónica construida por quintas.
- Al hacer clic en un círculo del mapa comienza el motivo del evento en bucle. Otro clic en ese círculo detiene el sonido; seleccionar otro evento cambia la melodía y detiene la anterior.
- El control **Escuchar gráfica** transforma todos los periodos del TimeMap en una melodía continua. Severidad, densidad de eventos, tipo dominante y patrón temporal cambian notas, intensidad, ritmo y acompañamiento.
- El botón de la gráfica alterna entre reproducir y detener. Al salir del mapa se liberan los recursos de audio.
- El sonido se sintetiza localmente con Web Audio; no se descargan pistas ni se requiere un servicio de audio. El navegador exige una interacción del usuario para iniciar el sonido.

### Observar y aprender

- Página de observaciones con filtros de fecha y polarización SAR, vista previa y metadatos preparados para un catálogo futuro.
- Biblioteca de aprendizaje con temas de radar, misiones satelitales y NISAR; los contenidos pendientes se identifican como tales.
- Navegación responsive con rutas Inicio, Explorar, Observaciones y Aprendamos; página 404 accesible.

### PWA

- Manifiesto e iconos instalables, actualizaciones del service worker y recursos de aplicación precargados.
- GeoJSON cacheado bajo demanda con NetworkFirst, hasta 40 entradas por 30 días.
- Los datos visitados previamente pueden seguir disponibles sin conexión.

## Arquitectura

```text
docker-compose.yml       Servicios Django, PostgreSQL y Redis
Dockerfile               Imagen del backend
requirements.txt         Dependencias Python
nasa_api/                API Django REST, autenticación y catálogo
pipeline/                Preparación de datos geoespaciales
data/processed/          Catálogos Parquet que consume el backend
public/geojson/          Límites del INEGI y metadatos de procedencia
public/assets/           Textura terrestre y recursos visuales
scripts/                 Importación y verificación de cartografía
docs/                    Decisiones y arquitectura
src/
  app/                   Aplicación y router
  componentes/           Layout, navegación e iconos
  funcionalidades/
    inicio/              Portada y escena espacial Three.js
    explorar/            Mapa, predicciones, panel y TimeMap
    observaciones/       Filtros, vista SAR y metadatos
    aprendamos/          Biblioteca educativa
  utils/                 Sonificación con Web Audio
  estilos/               Tema responsive
```

### Tecnologías

- React 19, TypeScript estricto, React Router 7, Vite 8 y Tailwind CSS 4.
- MapLibre GL JS 6 para mapas y Three.js para la escena espacial.
- Web Audio API para los instrumentos sintetizados y sus secuencias.
- Django 6, Django REST Framework, PostgreSQL 16, Redis 7, pandas y PyArrow.
- Docker Compose para el backend local.

## Requisitos

- Node.js compatible con Vite 8 (20.19+ o 22.12+) y pnpm.
- Docker Desktop con Docker Compose para iniciar la API, PostgreSQL y Redis.
- Catálogos en `data/processed/` para servir indicadores y cronología geoespacial.

## Inicio rápido

### 1. Iniciar el backend

Desde la raíz del proyecto:

```powershell
docker compose up --build
```

Docker Compose:

- Inicia PostgreSQL y Redis.
- Ejecuta las migraciones de Django.
- Sirve el backend en `http://127.0.0.1:8000`.
- Monta `./data` en el contenedor como `/pipeline_data/data` en modo de solo lectura.

Comprueba el servicio y el catálogo:

- `http://127.0.0.1:8000/api/version/`
- `http://127.0.0.1:8000/api/catalog/status/`
- `http://127.0.0.1:8000/api/docs/swagger/`

El catálogo científico preparado debe incluir:

```text
data/processed/hazard_catalog.parquet
data/processed/spatial_hazard_catalog.parquet
```

Si falta alguno, el backend lo reporta en `/api/catalog/status/`; no genera una respuesta de datos exitosa de reemplazo. Antes de iniciar Compose, copia `.env.example` a `.env` y define valores propios y seguros para `DATABASE_PASSWORD` y `SECRET_KEY`; Compose se detiene si no están configurados. No publiques credenciales ni archivos `.env`.

### 2. Iniciar el frontend

En otra terminal, desde la raíz:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Vite sirve el frontend y reenvía `/api` a `http://127.0.0.1:8000`. Tanto el modo `dev` como `preview` tienen configurado ese proxy. Para probar una compilación:

```powershell
pnpm build
pnpm preview
```

Para usar otro backend, define `VITE_API_PREDICCIONES` o `VITE_API_TIMEMAP` antes de iniciar Vite.

## API

| Método y ruta | Descripción |
| --- | --- |
| `GET /api/version/` | Versión del servicio |
| `POST /api/login/` y `POST /api/logout/` | Autenticación por token |
| `GET /api/predictions/?period=YYYY-MM` | Indicadores del periodo como GeoJSON |
| `GET /api/predictions/?date=YYYY-MM-DD` | Consulta compatible por fecha |
| `GET /api/disasters/` | Alias de la colección de eventos GeoJSON |
| `GET /api/timemap/` | Resumen histórico y conteos por periodo |
| `GET /api/catalog/status/` | Disponibilidad, cobertura y metadatos del catálogo |
| `/api/docs/swagger/` y `/api/docs/redoc/` | Documentación OpenAPI |

Las predicciones aceptan filtros opcionales `type` y `state`. Los tipos son `sismo`, `huracan`, `sequia`, `inundacion` e `incendio`. El frontend valida el GeoJSON antes de cargarlo en el mapa.

Las etiquetas de evidencia incluyen `observed`, `supervised`, `proxy` y `no_confirmable`. La cobertura o un valor proxy no implican que exista una alerta oficial ni que se haya confirmado un desastre.

## Comandos

```powershell
pnpm dev               # Servidor Vite de desarrollo
pnpm typecheck         # Comprobación TypeScript
pnpm lint              # Oxlint
pnpm datos:verificar   # Verifica hashes, relaciones y conteos de la cartografía local
pnpm datos:geografia   # Reimporta los datos geográficos desde INEGI
pnpm build             # Typecheck y compilación de producción
pnpm preview           # Sirve dist/ con el proxy API de Vite
```

La importación geográfica requiere conexión a Internet; la aplicación usa los archivos ya descargados en `public/geojson/`.

## Datos y limitaciones

- `public/geojson/estados.geojson` contiene las entidades y los archivos `municipios/01.geojson` a `32.geojson` contienen divisiones municipales. `procedencia.json` y la documentación GeoJSON registran las fuentes, fechas y hashes.
- La cartografía corresponde al Marco Geoestadístico del INEGI. Son áreas geoestadísticas; no constituyen límites político-administrativos con valor legal ni incluyen datos demográficos del Censo.
- La capa topográfica es un servicio público externo y puede no estar disponible. Los límites locales y los controles del mapa siguen funcionando si falla el relieve.
- El globo y la órbita de NISAR son una representación educativa, no a escala y sin telemetría.
- Las páginas de observaciones y aprendizaje contienen espacios preparados; no se presentan datos SAR ni resultados de misión inexistentes como si fueran observaciones reales.
- Los indicadores agregados pueden ser observados o proxy. Su interpretación debe considerar la evidencia y la fuente de cada evento.

## Validación

```powershell
pnpm typecheck
pnpm lint
pnpm build
```

Para conocer decisiones del mapa y sus fuentes, consulta [docs/arquitectura.md](docs/arquitectura.md), [public/geojson/README.md](public/geojson/README.md) y [public/assets/espacio/README.md](public/assets/espacio/README.md).
