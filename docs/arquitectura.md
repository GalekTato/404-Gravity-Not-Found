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

Se usan imports explícitos y estado local, sin otra biblioteca de estado. `useGlobeView` encapsula la vista ilustrativa. La portada reutiliza la ilustración independiente del futuro motor Cesium.

## Próxima etapa Cesium

1. Instalar CesiumJS y configurar sus recursos estáticos al abordar la escena real.
2. Encapsular creación y destrucción de Viewer en un adaptador con ciclo de vida React.
3. Convertir `VistaCamara` al motor. Hoy los controles solo escalan un SVG.
4. Incorporar un GeoJSON de México con fuente oficial, licencia y fecha. `MexicoBoundary` define su entrada, pero hoy no carga datos.
5. Implementar y validar restricciones territoriales reales.
6. Conectar regiones verificadas a `RegionMarkers` y `RegionInfoPanel`, calculando sus posiciones desde el motor.

## Observaciones

El adaptador futuro validará las respuestas en ejecución y documentará procedencia, licencia y unidades. Incorporará carga, errores, ausencia de datos y cancelación. No se infiere disponibilidad de observaciones ni polarizaciones. `ObservationFilters`, `SarPreview` y `ObservationMetadata` separan responsabilidades.

## Verificación

Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm build`. La revisión funcional debe cubrir menú móvil, rutas directas, 404, teclado, fechas, zoom y restablecimiento. Las comprobaciones actuales no certifican Cesium, API ni resultados científicos, fuera de alcance.
