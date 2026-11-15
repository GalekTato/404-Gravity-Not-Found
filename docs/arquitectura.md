# Arquitectura y evolución

`app` compone las rutas; `componentes/estructura` contiene el layout. Los módulos en `funcionalidades` mantienen páginas, componentes, hooks, servicios y tipos según sus responsabilidades. Las carpetas se crean cuando tienen contenido funcional, sin adaptadores científicos simulados.

## Explorador de México

La portada y el explorador usan motores independientes cargados bajo demanda: Three.js para la escena espacial de Inicio y MapLibre para cartografía territorial. No se carga el explorador ni su catálogo geográfico al abrir Inicio.

Se reemplazó Cesium por MapLibre GL JS. `MexicoMap` se carga con React.lazy y expone un `MapaHandle` tipado para zoom y vista nacional. `useMapaMexico` administra el motor, los eventos de carga/error, ResizeObserver y destrucción. Cada sesión tiene una bandera de actividad: los efectos y controles no usan una instancia destruida. El explorador ocupa toda la ventana con un panel desplegable y navegación inferior; se retiró el cartel de encabezado del mapa.

`mapaMexico.ts` define el estilo, capas, encuadre nacional y caja máxima de navegación. La capa raster TOPO-WMS de terrestris aporta relieve SRTM/NASA procesado por mundialis, con créditos visibles. Es un servicio externo sin token y necesita conexión; no es una observación SAR ni terreno 3D. Los polígonos del INEGI tienen rellenos casi transparentes, contornos marrones y resaltados ocre. Si falla el fondo, se conserva la interacción con los límites locales, se aumenta su opacidad y se ofrece reintento; un fallo de teselas no se trata como un error fatal de WebGL.

La colección municipal se añade solo para la entidad seleccionada. Se eliminó el mínimo de zoom 6 de contornos y rellenos: en móvil Chihuahua se encuadraba a zoom 5.38 y sus municipios se ocultaban pese a estar cargados. Los nombres municipales aparecen desde zoom 7. MapLibre usa fuentes del navegador sin servidor de glifos. La caja máxima mantiene el foco en México, incluyendo mar y márgenes vecinos; no aplica una máscara territorial exacta.

`MexicoBoundary` alterna los contornos estatales. `RegionInfoPanel` presenta selectores accesibles, nombres, claves y conteos procedentes del catálogo. Los clics sobre polígonos seleccionan el municipio visible o la entidad. El selector municipal permite alcanzar áreas pequeñas. `RegionMarkers` es un adaptador de marcadores para un futuro catálogo de regiones de estudio; no se inventa ninguna región científica.

El worker de MapLibre 6 se importa con `?worker&url` y se registra antes de crear el motor. Vite administra su URL en desarrollo y el archivo con hash en producción. El contenedor usa una regla de posición y altura con especificidad mayor que el CSS de MapLibre, para que la carga diferida de ese CSS no colapse el canvas.

## Datos y cancelación

`useGeografia` carga y valida la colección nacional y su catálogo local. `useMunicipios` carga una sola colección por entidad con AbortController. Las respuestas se asocian a la clave solicitada: cambiar rápidamente de entidad no puede mostrar municipios de una selección anterior. Los errores nacionales, municipales o WebGL ofrecen reintento. La geometría, claves, identidades y catálogo se validan antes de pasar datos al mapa.

`MexicoMap` serializa las promesas de `GeoJSONSource.setData()` por sesión. Una escritura obsoleta no publica el estado de carga ni activa capas antiguas; al cambiar de instancia se crea una cola independiente. `esperarMunicipiosDibujados` espera un frame con `isSourceLoaded('municipios')`, porque resolver setData no garantiza que las teselas de la vista estén dibujadas. Durante esa preparación las capas se filtran por la entidad actual para no mostrar geometrías anteriores; no se oculta la fuente completa, ya que una fuente sin capas activas no prepara teselas. La selección se aplica después. El listener tiene cancelación, limpieza y límite de 30 segundos. El panel diferencia carga de archivos y dibujo; los errores permiten reintento.

Los archivos del INEGI se sirven desde `public/geojson`, sin consultas externas para límites o catálogos. El relieve es la única capa que usa un servicio remoto. `scripts/importar-geografia.mjs` descarga desde INEGI con concurrencia limitada, conserva los metadatos y genera un manifiesto de procedencia y hashes. Se conservan los vértices, redondeando a seis decimales. Los puntos interiores de etiqueta y los encuadres se derivan de las geometrías. Se excluyen todos los atributos estadísticos del Censo 2020; no se presentan como información vigente.

La copia contiene 32 entidades y 2,478 municipios/demarcaciones del Marco Geoestadístico de diciembre de 2025. Son áreas geoestadísticas, no límites político-administrativos con valor legal. Las fuentes, transformaciones y condiciones están en `public/geojson/README.md` y `procedencia.json`. La cartografía ocupa unos 113 MB sin compresión; el archivo nacional unos 24 MB. La carga municipal por entidad evita transferir el conjunto completo. Para publicación futura se recomienda compresión HTTP y evaluar teselas vectoriales a mayor escala.

## Predicciones del backend

`servicios/predicciones.ts` consume `GET /api/predictions/?date=YYYY-MM-DD` y valida que la respuesta sea un `FeatureCollection` de puntos con tipo, severidad, radio y fecha. `PredictionMarkers` crea la fuente `predicciones-source` y las capas `predicciones-halo`/`predicciones-puntos` solo cuando el mapa está listo; actualiza la fuente al cambiar de fecha y alterna su visibilidad sin recrear el motor. Los colores y etiquetas por tipo se comparten con la leyenda del mapa. Cada clic abre un popup con el detalle y no selecciona el estado que queda debajo.

El estado de la consulta (`inactivo`, `cargando`, `listo` o `error`) se levanta a `ExplorarPage` mediante `onEstadoPredicciones`. La barra del mapa muestra la fecha, el estado de carga y un reintento; si el backend no responde, los límites locales y el relieve siguen operativos. Vite reenvía `/api` a `http://127.0.0.1:8000` en desarrollo; `VITE_API_PREDICCIONES` permite apuntar a otro endpoint. Los eventos proceden del catálogo científico agregado, pueden ser observados o proxy y no son alertas oficiales.

## PWA y entorno

Se conserva vite-plugin-pwa y el manifiesto. El shell y los bundles se precachean; los GeoJSON se excluyen de la descarga masiva y se cachean bajo demanda con NetworkFirst, 40 entradas y 30 días. El uso sin conexión requiere visitas previas a los datos correspondientes. Las cachés antiguas de Cesium ya no se usan. El desarrollo actual se realiza en localhost y no se publica en Sites.

## Escena espacial de Inicio

`SpaceGlobe` administra el montaje, errores, controles y preferencia de movimiento reducido. `escenaEspacial.ts` crea un globo texturizado con cámara inicialmente orientada a México, halo atmosférico, estrellas con semilla determinista, plano orbital y rastro. `modeloNisar.ts` construye una representación original con cuerpo, paneles solares, brazo y reflector. El satélite queda oculto correctamente detrás de la esfera y su rótulo se proyecta a pantalla, limitado al contenedor. La cámara se aleja en formatos verticales para encuadrar el recorrido.

La órbita circular, velocidad, orientación y tamaño del modelo son recursos visuales, no parámetros de ingeniería ni una efeméride. Se indica en la interfaz que no hay telemetría en tiempo real. La textura local de NASA es un mosaico Blue Marble: Next Generation de julio de 2004, con su procedencia documentada y enlace de crédito visible.

La interacción usa OrbitControls, teclado y botones. Se respetan pausa y movimiento reducido, incluso al cambiar la preferencia del sistema. ResizeObserver adapta el canvas; IntersectionObserver y Page Visibility detienen el bucle fuera de pantalla o al ocultar la pestaña. El render se limita a 30 fps y densidad de píxeles 1.5. Al desmontar se cancelan frames y se liberan controles, listeners, observers, geometrías, materiales, textura y contexto WebGL. Las respuestas de carga tardías se ignoran después del desmontaje. La textura se incluye en el precache PWA.

## Observaciones y aprendizaje

`ObservacionesRepository` sigue siendo un contrato para una futura API con cancelación. No hay backend, datos SAR ni observaciones NISAR simuladas. Filtros, vista SAR y metadatos tienen responsabilidades separadas. Aprendamos conserva el catálogo editorial en preparación.

## Verificación

`pnpm typecheck`, `pnpm lint`, `pnpm datos:verificar` y `pnpm build` comprueban los contratos, reglas, integridad de la cartografía y compilación PWA. La comprobación de datos revisa los 33 hashes, conteos y relaciones entre entidades y municipios sin red.

La escena de Inicio se verificó en Chrome en desarrollo y producción: textura local, movimiento orbital, pausa estable, giro con ratón/teclado, zoom, restablecimiento de México, adaptación móvil, preferencia de movimiento reducido, pérdida y recuperación de WebGL, desmontaje y nuevo montaje sin duplicar canvas ni cargar datos del explorador. Se comprobó que la textura está incluida en el precache PWA.

Verificación de regresión en Chrome: las 67 áreas municipales de Chihuahua se dibujan a zoom 5.38 en móvil; cambiar rápidamente entre Jalisco, Oaxaca y CDMX deja las 16 demarcaciones de CDMX; la selección se aplica tras resolver el worker; ocultar/mostrar municipios conserva los datos. También se comprobó una respuesta PNG real del WMS y se bloqueó su conexión para verificar que los límites locales siguen funcionando y el fondo permite reintento. La prueba con WebGL por software no sustituye una validación de dispositivos GPU físicos. No se certifican resultados científicos ni límites legales.
