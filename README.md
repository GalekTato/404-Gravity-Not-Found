# TerraSync · México

Arquitectura inicial: React 19, TypeScript estricto, Vite 8, Tailwind CSS 4, React Router y PWA. La aplicación se desarrolla directamente en `front404`.

## Funciones de la entrega

El mapa incorpora un slider temporal con teclado y arrastre, reproducción y selector de mes. Seleccionar un estado por clic o por el selector filtra los indicadores, el historial, la tabla enlazada y la exportación `.xlsx`. El historial recorre los meses disponibles para el filtro activo; no rellena huecos con datos inventados.

Los filtros se guardan en la URL (`period`, `state`, `type`), por lo que puedes compartir una selección, recargarla o ir de Observaciones al mapa conservándola. Los créditos de la textura y los iconos se consultan en Aprende, dentro de «Fuentes y créditos».

La paleta proporcionada por el equipo se centraliza en `src/estilos/paleta.css`: 28 tonos de azul, rosa, amarillo y gris. La interfaz usa azul como base, rosa para acciones y amarillo en el control temporal. Los colores de amenaza y la textura terrestre mantienen su significado.

Se utiliza la variante oscura en toda la aplicación: fondo azul noche, paneles azul profundo, texto claro y controles nativos oscuros. El relieve del mapa se muestra atenuado, con etiquetas claras; la línea del tiempo, Observaciones, Aprende, tablas y tutorial mantienen el mismo tema.

Los indicadores se representan con iconos por fenómeno: onda sísmica roja, huracán azul, sol amarillo para sequía, olas cian para inundación y llama naranja para incendio. Los filtros usan los mismos símbolos. El tamaño mantiene la escala de severidad y cada icono abre la ficha del registro.

Las fichas traducen sus etiquetas y estados de evidencia según ES/EN, incluyendo probabilidad y puntuación. Cambiar de idioma actualiza la ficha abierta sin cerrarla ni repetir la consulta. Observaciones utiliza las mismas traducciones de evidencia.

El mapa tiene una barra flotante de cristal oscuro, con reflejo suave que sigue al cursor y respeta movimiento reducido. El menú «Herramientas» reúne municipios, registros y exportación Excel; en móvil también contiene la guía rápida. La barra sustituye las dos filas opacas anteriores para ampliar el lienzo del mapa.

Observaciones consulta el catálogo con filtros por mes, estado y fenómeno. Aprende contiene lecciones de interpretación, fuentes y una actividad breve. El selector ES/EN se encuentra en la esquina superior derecha y conserva la preferencia local; los nombres y valores científicos originales no se traducen. El tutorial tiene cuatro pasos y está disponible desde el mapa y Aprende.

Identidad: `src/configuracion/proyecto.ts` centraliza nombre, equipo, GitHub e integrantes. Se conserva TerraSync; el logo recibido está en `public/assets/equipo/logo.jpg` y el isotipo del proyecto en `public/logo-equipo.svg`. Los nombres personales están pendientes. IBM Plex Sans se sirve localmente con su licencia en `public/fonts/OFL.txt`.

La aplicación permanece local. El perfil de despliegue con Nginx, Gunicorn y PostgreSQL está en [deployment/README.md](deployment/README.md) y se prueba en `http://127.0.0.1:8080`. La [presentación y el documento técnico](docs/entrega/README.md) se entregan como PDF y fuentes LaTeX.

## Front y API local integrados

Desde esta carpeta, con Docker Desktop iniciado:

```sh
pnpm stack:up
pnpm dev --host 127.0.0.1 --port 5173 --strictPort
```

Abre `http://127.0.0.1:5173/explorar`. Vite reenvía `/api` a Django en `http://127.0.0.1:8000`, tanto en desarrollo como en `pnpm preview`. `pnpm stack:up` construye el backend de `404-Gravity-Not-Found-integration`, aplica sus migraciones y espera a que PostgreSQL y la API estén saludables. Usa el catálogo incluido en `404-Gravity-Not-Found-integration/data` mediante un volumen de solo lectura. La copia `404-Gravity-Not-Found-back` conserva la versión anterior con simulaciones y no se inicia en paralelo: ambas implementan las mismas rutas.

El explorador conserva el front de esta carpeta e incorpora los marcadores, filtros y TimeMap de la integración. Selecciona el último mes disponible al cargar el catálogo; los indicadores distinguen evidencia observada, supervisada, proxy y no confirmable. Los resultados son los del catálogo incluido, no consultas en vivo a NASA. Consulta su procedencia antes de interpretar las ubicaciones y probabilidades como evidencia de eventos reales.

- Estado: `http://127.0.0.1:8000/api/catalog/status/`
- Línea de tiempo: `http://127.0.0.1:8000/api/timemap/`
- GeoJSON: `http://127.0.0.1:8000/api/predictions/?period=2026-11`
- Swagger: `http://127.0.0.1:8000/api/docs/swagger/`

`pnpm stack:logs` muestra los registros. `pnpm stack:down` detiene los contenedores y conserva el volumen de PostgreSQL; detén Vite con Ctrl+C en su terminal. El Compose de la raíz es para desarrollo local y publica la API únicamente en `127.0.0.1`. Para cambiar las credenciales de desarrollo, configura `DATABASE_PASSWORD` y `SECRET_KEY` en un `.env` local antes del primer arranque.

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

El catálogo de regiones de estudio sigue pendiente; RegionMarkers está preparado para MapLibre sin inventar regiones. Observaciones consulta el catálogo real servido por el backend, y Aprende contiene recursos de interpretación. El explorador, la tabla y la exportación comparten filtros. No se muestran imágenes SAR ni se implementa autenticación de usuario en la interfaz.

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
