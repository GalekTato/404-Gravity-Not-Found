# Earth Symphony · México

Arquitectura inicial: React 19, TypeScript estricto, Vite 8, Tailwind CSS 4, React Router y PWA. La aplicación se desarrolla directamente en `front404`.

## Comandos pnpm

Requiere Node.js compatible con Vite 8 (20.19+ o 22.12+) y pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm datos:verificar
pnpm build
pnpm preview
```

`build` comprueba TypeScript y genera `dist/` con manifiesto y service worker. `preview` sirve esa compilación.

## Estructura

```text
public/
  assets/             Política de recursos propios
  data/               Política de datos estáticos futuros
  geojson/            Contrato de límites oficiales pendientes
src/
  app/                App y router
  componentes/
    estructura/       Layout, navegación y página 404
    ui/               Iconos compartidos
  funcionalidades/
    inicio/
      paginas/        Portada espacial
      componentes/    SpaceGlobe y controles
      servicios/      Escena Three.js y modelo NISAR
      tipos/          Contrato de la escena
    explorar/
      paginas/
      componentes/    MexicoMap, GlobeControls, RegionMarkers,
                      RegionInfoPanel y MexicoBoundary
      hooks/          useGeografia, useMunicipios y useMapaMexico
      servicios/      Validación GeoJSON y capas MapLibre
      tipos/          Contratos de entidades, municipios y mapa
    observaciones/
      paginas/
      componentes/    Filtros, vista SAR y metadatos
      tipos/          Observacion, Polarizacion y filtros
    aprendamos/
      paginas/
      servicios/      Catálogo editorial
      tipos/          TemaEducativo
  configuracion/      Navegación declarativa
  servicios/          Contrato del futuro repositorio de observaciones
  tipos/              Coordenadas, regiones y cámara
  estilos/            Tema responsive
  index.css           Entrada Tailwind
  main.tsx
 docs/                Decisiones y evolución
```

Las carpetas están en español; se conservan `app`, nombres de componentes solicitados y convenciones de herramientas. Cada módulo admite `paginas`, `componentes`, `hooks`, `servicios` y `tipos`; solo se crean cuando tienen una responsabilidad real. No se crean carpetas vacías ni módulos de análisis y regiones fuera de alcance. Más detalles en [arquitectura](docs/arquitectura.md).

## Rutas

| Ruta | Módulo |
| --- | --- |
| `/` | Inicio |
| `/explorar` | Explorar |
| `/observar` | Observaciones |
| `/learn` | Aprendamos |
| `*` | Página 404 |

Layout con navegación activa, menú móvil, salto al contenido, controles etiquetados y respeto a movimiento reducido.

## Alcance de la demostración

El explorador utiliza MapLibre GL JS, con cartografía vectorial local del INEGI: 32 entidades y 2,478 municipios o demarcaciones del Marco Geoestadístico de diciembre de 2025, según los metadatos del servicio. Cesium y su complemento de copia se retiraron.

La portada utiliza Three.js para un globo terrestre 3D con textura NASA Blue Marble local, fondo negro, estrellas generadas mediante shaders y un modelo estilizado de NISAR que recorre una órbita ilustrativa. Permite girar con ratón/táctil y flechas, acercar, alejar, pausar/reanudar y volver a la vista inicial de México. El modelo y la órbita no son a escala, no usan telemetría y no representan posiciones o tiempos reales de la misión. La textura es un mosaico histórico de julio de 2004, no una observación actual ni NISAR. Ver [procedencia](public/assets/espacio/README.md).

El motor 3D se carga solo al abrir Inicio, sin importar MapLibre ni los GeoJSON del explorador. La escena respeta movimiento reducido, se detiene fuera de pantalla o con la pestaña oculta y limita la densidad de píxeles y la frecuencia de renderizado. Al salir libera geometrías, materiales, texturas, controles, observers, eventos y contexto WebGL. Los fallos de textura/WebGL permiten reintentar. El encuadre se adapta a móvil para mantener visibles el globo y el satélite.

Incluye contornos y nombres de estados, selección con clic o mediante un selector accesible, acercamiento a la entidad, panel con clave geoestadística, carga municipal por entidad, selección de municipios, controles de zoom y regreso a México. El mapa ocupa toda la pantalla, con navegación inferior y panel desplegable. Los contornos municipales se muestran al seleccionar una entidad, sin un mínimo de zoom que los oculte en móvil; sus nombres aparecen desde zoom 7. El selector municipal permite elegir áreas pequeñas sin depender de acertar sobre el mapa.

La vista inicial encuadra México con margen y la navegación se limita a una caja geográfica alrededor del país, que incluye mar y márgenes vecinos. No es una restricción exacta por polígono. El fondo topográfico usa la capa TOPO-WMS del servicio público de terrestris, con relieve SRTM/NASA procesado por mundialis; necesita Internet y no requiere token. Es relieve sombreado en 2D, no imágenes satelitales ni terreno 3D. Los rellenos de los polígonos son transparentes para conservar el relieve visible. Las áreas geoestadísticas no determinan límites político-administrativos con valor legal.

Fuente del fondo: [WMS de terrestris](https://terrestris.de/en/products/free-osm-wms/) y [cartografía topográfica de mundialis](https://www.mundialis.de/en/software/web-map-services-wms/). Los créditos permanecen visibles. El servicio público no tiene disponibilidad garantizada: si falla, se informa sin bloquear las divisiones locales y se ofrece reintento. No se precargan ni se almacenan masivamente teselas de ese proveedor; se respeta la caché HTTP del navegador. Los GeoJSON del INEGI y las fuentes de las etiquetas siguen siendo locales.

El catálogo científico de regiones sigue pendiente; RegionMarkers está preparado para MapLibre sin inventar regiones. Las fechas de Observaciones se editan sin consultas. SAR y metadatos muestran estados vacíos. Aprendamos presenta temas en preparación. El explorador se conecta al backend de indicadores científicos; no hay autenticación, observaciones ni resultados NISAR inventados.

## Indicadores científicos conectados al backend

El explorador consume `GET /api/predictions/?date=YYYY-MM-DD` del proyecto `backend_nasa` (Django REST Framework). La respuesta es un `FeatureCollection` GeoJSON con puntos, tipo de amenaza, severidad, radio estimado y fecha. El frontend valida ese contrato antes de dibujarlo, colorea por tipo, dimensiona por severidad y muestra el detalle al hacer clic en un punto.

En desarrollo, Vite reenvía `/api` a `http://127.0.0.1:8000` mediante `server.proxy` (ver `vite.config.ts`), así que no hace falta configurar CORS ni cambiar la URL del frontend. Para usar otro origen, define `VITE_API_PREDICCIONES` con la URL completa del endpoint al iniciar Vite. La fecha se cambia desde la barra del mapa y, por defecto, se consulta el día siguiente. Si el backend falla, la barra informa el problema y permite reintentar sin ocultar los límites locales.

Los indicadores del mapa provienen del catálogo científico agregado generado por el pipeline. Cada evento expone una etiqueta de evidencia (`observed`, `proxy`, `supervised` o `no_confirmable`). Los indicadores proxy no son alertas oficiales ni sustituyen a Protección Civil; la actividad tectónica no se confirma sin pares SAR temporales o un catálogo sísmico.

## Datos geográficos

`public/geojson/estados.geojson` contiene las entidades, `catalogo.json` sus nombres, puntos interiores de etiqueta y encuadres, y `municipios/01.geojson` a `32.geojson` las divisiones de cada entidad. `procedencia.json` documenta las URLs originales, metadatos, fechas de descarga y SHA-256 de cada colección. Ver [la procedencia y transformaciones](public/geojson/README.md).

Se conservan todos los vértices y se redondean las coordenadas a seis decimales; no se simplifican las geometrías ni se incluyen estadísticas demográficas. El conjunto ocupa aproximadamente 113 MB sin compresión; el archivo nacional unos 24 MB. Solo se carga la colección municipal de la entidad seleccionada. En producción conviene habilitar compresión HTTP y, para mayor escala, generar teselas vectoriales. El motor simplifica visualmente sus teselas según el zoom; los archivos originales locales mantienen sus vértices.

```sh
pnpm datos:verificar   # Audita hashes, relaciones y conteos sin red
pnpm datos:geografia  # Reimporta desde INEGI, usando caché temporal de descargas
```

La importación necesita Internet; la navegación usa los archivos ya incluidos. Para forzar una nueva descarga, elimina únicamente los archivos de la caché `front404-inegi` de tu directorio temporal antes de importar. El script registra el corte que responda el servicio; revisa los nuevos metadatos antes de actualizar las etiquetas de periodo de la interfaz.

## PWA y despliegue

Se conserva `vite-plugin-pwa` con `registerType: autoUpdate`, manifiesto en español e iconos PNG propios de 192 y 512 píxeles. Se precachean el shell, los bundles y la textura del globo (máximo 4 MiB por archivo); los GeoJSON se excluyen de la descarga masiva y se cachean bajo demanda con NetworkFirst, 40 entradas y 30 días. Sin conexión solo estarán disponibles los datos previamente visitados. En desarrollo Vite no registra el service worker; para comprobar PWA usa `pnpm build` y `pnpm preview`. La instalación requiere HTTPS o localhost y depende del navegador.

MapLibre y su CSS se cargan de forma diferida al entrar al explorador. El mapa, los listeners y ResizeObserver se destruyen al salir, incluso con React StrictMode. Las cargas geográficas se cancelan al cambiar de entidad o salir, para impedir respuestas atrasadas. Los errores de mapa o datos muestran una opción de reintento.

La actualización municipal espera la promesa de `GeoJSONSource.setData()` en MapLibre 6 y comprueba después que las teselas de esa fuente estén listas en un frame de renderizado. Se serializan las escrituras por sesión y se descartan actualizaciones obsoletas; el panel distingue la descarga de datos de su dibujo en el mapa. Las capas se filtran por la entidad actual mientras se preparan sus teselas. La selección y el resaltado se aplican cuando la fuente está lista; una espera excesiva o un error permite reintentar.

MapLibre 6 requiere su worker como recurso separado. `mapaMexico.ts` lo importa con `?worker&url` y llama a `setWorkerUrl` antes de crear el mapa; Vite resuelve la ruta en desarrollo y emite un archivo con hash en producción. No necesita complementos de copia.

El trabajo actual se sirve en localhost con `pnpm dev --host 127.0.0.1`. No se publica automáticamente en Sites. Para una publicación futura, servir `dist/` como SPA con fallback a `index.html`. Se conserva `.openai/hosting.json` como configuración histórica; no es necesario para localhost.

[NASA Eyes](https://eyes.nasa.gov/apps/earth/) es inspiración visual. No se reutiliza su código, identidad ni recursos.

## Integración del pipeline geoespacial

El backend científico y los artefactos generados por el pipeline local se integrarán en esta aplicación mediante endpoints de catálogo, indicadores y estado de procesamiento.
