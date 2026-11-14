# Arquitectura y evolución

`app` compone las rutas y `componentes/estructura` define el layout. Cada funcionalidad es dueña de sus páginas y dominio. Los contratos geográficos compartidos viven en `tipos`. `servicios/contratoObservaciones.ts` define un puerto para un futuro adaptador HTTP con cancelación, sin solicitudes actuales.

## Convenciones por módulo

| Carpeta | Responsabilidad | Cuándo crearla |
| --- | --- | --- |
| `paginas` | Componer pantallas enrutadas | Siempre |
| `componentes` | Elementos del dominio | Al extraer una pieza funcional |
| `hooks` | Estado y ciclo de vida | Cuando una interacción lo requiera |
| `servicios` | Adaptadores o configuración | Cuando exista una fuente o integración |
| `tipos` | Contratos del módulo | Al definir entidades propias |

Inicio solo compone contenido y enlaces; no necesita hooks ni contratos propios. Observaciones no crea un servicio ni un hook que simule consultas sin API. Aprendamos utiliza un catálogo editorial sin estado. No se crean carpetas vacías, hooks transversales sin uso ni módulos de análisis y regiones fuera del alcance. Las regiones pertenecen al explorador por ahora.

Se usan imports explícitos y estado local, sin otra biblioteca de estado. `useGlobeView` conserva selección y controles del explorador. `MexicoGlobe` expone un handle tipado de zoom y restablecimiento, ejecutados contra la cámara actual de Cesium; el estado no duplica la posición de la cámara. La portada conserva una ilustración independiente del motor.

## Integración Cesium

`cesiumViewer.ts` configura el Viewer, la cámara, límites de altura y el mapa base Natural Earth II local, sin ion ni token. `useCesiumViewer` controla inicialización, carga asíncrona, errores y destrucción. Cada efecto conserva su propia instancia y bandera de cancelación: una carga resuelta después de desmontar no modifica la escena. Los eventos se eliminan antes de destruir el Viewer.

El motor y su CSS se cargan con React.lazy en el explorador; Inicio no importa Cesium. `requestRenderMode` evita dibujar continuamente cuando no hay cambios. Los controles de zoom actúan sobre la altura actual y el restablecimiento respeta movimiento reducido. Los marcadores crean entidades con coordenadas geográficas y limpian sus handlers y entidades al desmontar; el catálogo continúa vacío.

Vite define `CESIUM_BASE_URL` y copia las cuatro carpetas estáticas oficiales con `vite-plugin-static-copy`. Workbox precachea los bundles con un máximo de 8 MiB por archivo y excluye los recursos estáticos Cesium del precache masivo; los cachea bajo demanda. No se garantiza un primer arranque 3D sin conexión.

Pendiente: incorporar GeoJSON con fuente oficial, licencia y fecha; validar restricciones territoriales; publicar un catálogo científico real de regiones. No se usan proveedores de terreno ni capas de imágenes remotas.

## Observaciones

El adaptador futuro validará las respuestas en ejecución y documentará procedencia, licencia y unidades. Incorporará carga, errores, ausencia de datos y cancelación. No se infiere disponibilidad de observaciones ni polarizaciones. `ObservationFilters`, `SarPreview` y `ObservationMetadata` separan responsabilidades.

## Verificación

Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm build`. La integración se verificó en Chrome headless con WebGL por software: renderizado del canvas, zoom, regreso a México, aviso de límites pendientes, ausencia de desbordamiento a 390 px, salida y regreso al explorador sin duplicar canvas y ausencia de excepciones o solicitudes de datos externas. Se inspeccionaron capturas de escritorio y móvil. Esta prueba no sustituye la validación de GPU físicas ni certifica APIs o resultados científicos, fuera de alcance.

La compilación informa del tamaño del chunk Cesium (aproximadamente 4.2 MB, 1.1 MB gzip), cargado de forma diferida desde el explorador. No se oculta la advertencia aumentando el umbral global de Vite.
