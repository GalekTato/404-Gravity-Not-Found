# Verificación de la entrega

GATE: OPEN 19, tres rondas utilizadas. No se presenta como aprobación visual general.

## Comprobación funcional

Iconos por fenómeno: la capa de indicadores usa símbolos en lugar de círculos y se retira el halo circular. Se comprobaron los cinco iconos registrados, los 43 registros de noviembre de 2026, apertura de ficha sin seleccionar el estado inferior y filtro de incendio con 29 registros. La leyenda de filtros utiliza las mismas geometrías y colores. Capturas en 1440, 390 y 320 px, sin desbordamiento horizontal; TypeScript, lint y build correctos.

Barra de cristal: se sustituyeron las dos filas superiores por un único control flotante oscuro con blur, reflejo localizado por puntero y alternativa opaca para navegadores sin backdrop-filter. Se comprobó el reflejo al mover el cursor y su desactivación con movimiento reducido. En 1440 × 900 el lienzo creció de 457 a 586 px de alto. En 390 × 900 y 320 × 640, barra y zoom no se cruzan; el menú queda dentro de la pantalla. Herramientas, tutorial móvil, cierre con Escape y preservación del estado en el enlace a registros pasan. El tutorial utiliza identificadores únicos para las instancias de escritorio y móvil.

Revisión posterior: se comprobó un clic real sobre el polígono de Baja California (`state=02`), el slider hasta octubre de 2026 y la conservación de ambos filtros al ir a Observaciones y regresar. El botón Excel solicitó `/api/export/?period=2026-10&state=02`. Los filtros ahora viven en la URL mediante `useFiltrosCatalogo`; también se conservan al usar la navegación entre mapa y tabla. Se validaron los rectángulos del mapa, historial y navegación en 390 × 900, 320 × 640 y 768 × 450 sin cruces ni desbordamiento horizontal. El título del navegador cambia a inglés con EN. Se retiraron el pie global repetido y el pie del globo; los créditos correspondientes están en el desplegable «Fuentes y créditos» de Aprende.

- TypeScript, Oxlint y build correctos. Permanece el aviso de bundles mayores a 500 kB para MapLibre y Three.js.
- Cinco pruebas del backend pasan usando una base temporal. Incluyen la ausencia de retorno nacional ante un filtro estatal vacío y la escritura segura de textos en Excel sin fórmulas.
- Chrome: 1440, 1024, 768, 390 y 320 píxeles. Se compararon rectángulos de mapa, historial y navegación para comprobar que no se superponen. En 320 × 640 el contenedor permite desplazamiento vertical y mantiene separados los controles.
- Slider: noviembre de 2026 tiene 43 registros nacionales; al retroceder a octubre devuelve ocho. Seleccionar Guerrero restringe mapa e historial; el historial pasa al último mes disponible si el mes previo no está en el subconjunto. Observaciones conserva estado, mes y fenómeno mediante parámetros de URL.
- Selector de idioma persistente, diálogo tutorial, tabla, actividad educativa y globo: comprobados en navegador. La versión con Nginx y Gunicorn pasó también estas interacciones con un perfil limpio.
- El stack Docker local se sirve en `http://127.0.0.1:8080`; Nginx, Gunicorn y PostgreSQL están saludables. La API y PostgreSQL no tienen puertos publicados en este perfil.
- Excel: MIME de libro Office Open XML, contenedor ZIP válido y hoja con encabezados más la fila de Guerrero para noviembre. Su código estatal es `12`.
- Se corrigió el tipo MIME de `.geojson` en Nginx a `application/geo+json`. El cliente reintenta recargando respuestas antiguas con tipo incompatible y la caché de geografía pasa a `geografia-inegi-v2`.
- PDF: presentación de 13 páginas y documento técnico de seis páginas compilados con MiKTeX. Se revisaron capturas de portada y evidencia, y se corrigieron desbordamientos de líneas en las fuentes finales.

Comprobación repetible, con el perfil Docker iniciado:

```sh
node scripts/verificar-stack.mjs
```

Acepta otro origen como primer argumento. Verifica MIME geográfico, 32 entidades, catálogo, historial, filtros, ausencia de retorno nacional, formato Excel y rechazo de un periodo inválido.

## Revisión de diseño

Preferencia vigente: variante oscura de la paleta suministrada. Se retiraron las superficies claras del mapa, historial, navegación, Observaciones, Aprende, accesos de Inicio, tablas, metadatos y tutorial. El relieve usa una representación atenuada con fondo azul noche y etiquetas claras. Se mantienen el cristal oscuro, los colores de amenaza y los acentos azul, rosa y amarillo. Las capturas claras y descripciones de paleta mineral o azul claro que aparecen más abajo corresponden a revisiones anteriores.

Actualización de paleta: se sustituyó la combinación mineral anterior por los 28 colores de la imagen suministrada. Los tokens están en `src/estilos/paleta.css`; los estilos, el isotipo del proyecto, el fondo espacial, los contornos seleccionables y los metadatos PWA se adaptaron a sus azules, rosas, amarillos y grises. Los colores de las amenazas y el logo recibido del equipo se conservan. Pares principales: texto/fondo 14.84:1, secundario/fondo 5.83:1, texto/botón rosa 4.82:1 y secundario/superficie oscura 6.91:1. Se revisaron capturas de Inicio, mapa, Observaciones y Aprende en escritorio y móvil. TypeScript, lint y compilación pasan; esta revisión de color no constituye un nuevo pase del gate completo descrito debajo.

Se aplicó `design-taste-frontend` en el stack existente, respetando el objetivo de un explorador cartográfico. La paleta utiliza papel cálido, tinta verde y acento cobre. IBM Plex Sans se sirve localmente con licencia OFL; Georgia se utiliza para títulos editoriales. Se incorporó el logo recibido del equipo, GitHub y un isotipo vectorial pequeño para TerraSync. No se inventaron integrantes, datos ni imágenes de observación.

El gate genérico de la skill se ejecutó sobre el mapa y conserva 19 hallazgos de su última ronda. La mayoría exige composición de landing page: un hero comercial, dos acciones como máximo, márgenes de 64–120 px, momentos visuales, una única familia de botones y un solo encabezado. Se conservan como pendientes del verificador porque aplicar esas reglas literalmente al mapa cambiaría su función. No se modificó el verificador ni se añadieron excepciones.

También reportó un cruce entre la escala y el aviso de cartografía cuando fallaba su MIME. Después de esa ronda se corrigió el MIME y se trasladó el aviso fuera del lienzo, a la fila de estado; las pruebas de navegador se repitieron. Se añadió etiqueta visible al slider y se acomodaron todos los botones de fenómeno en filas en móvil. El gate completo no se repitió después de agotar sus tres rondas.

No se ejecutó `perf.mjs`, no se certifica rendimiento en GPU física ni una auditoría completa con lectores de pantalla. Las pruebas informáticas no validan científicamente el catálogo. Los integrantes personales están pendientes de confirmación en `src/configuracion/proyecto.ts`.

## Hallazgos conservados del gate

El listado original se agrega debajo para conservar el alcance exacto de la revisión. Las capturas y los informes temporales completos permanecen en `.taste-skill/`, excluida de Git.

- **overlap-text**: lies over the text "300 km" (div.maplibregl-ctrl-bottom-left > div.maplibregl-ctrl.maplibregl-ctrl-scale) (section.explorer-workspace > div.explorer-map-body > div.map-canvas-wrapper > div.map-geography-notice "Reintentar cartografía").

- **button-styles**: 3 button styles on one screen: soft, outline #c8d0be ("Cómo usar"); soft, fill #183d3b, outline #183d3b ("↓ Excel"); soft, fill #e1e6d9 ("Explorar"); the odd one out: "Explorar" ((one screen)).

- **button-styles**: 3 button styles on the page: soft, outline #c8d0be x3 ("Cómo usar"); soft, fill #183d3b, outline #183d3b x1 ("↓ Excel"); soft, fill #e1e6d9 x1 ("Explorar") ((the page)).

- **copy-headline**: "TerraSync" does not name what is sold (atlas de mexico, atlas, mexico, from flags) (section.explorer-workspace > header.map-header > a.project-brand > h1 "TerraSync").

- **copy-actions**: 6 actions in the hero ("Cómo usar", "Municipios y capas", "Ver registros", "↓ Excel", "←", "→"); at most 2 (section.explorer-workspace > div.map-filterbar > div.filterbar-actions > a.quiet-button "Ver registros").

- **heading-scale**: an h2 at 21px, as large as the h1 (20px) or larger (section.timeline > div.timeline-heading > div:nth-of-type(1) > h2 "nov 2026").

- **off-grid**: left edge at 18px, 6px off a common edge of its section at 24px (8 elements, like span:nth-of-type(1)); 1 more in this section off the grid too (div.map-geography-notice at 12px) (div.mexico-map.maplibregl-map > div.maplibregl-control-container > div.maplibregl-ctrl-bottom-left > div.maplibregl-ctrl.maplibregl-ctrl-scale "300 km").

- **moment-none**: a software page (--type) deals no moment: every kind carries one, two on a long page (moments.md) ((the page)).

- **hero-screen**: the hero ends at 838px on a 900px screen, 62px above the fold: it ends at the fold, 1px either way (SR-1) (main#contenido > section.explorer-workspace "TerraSyncCómo usarGuía rápida · 1/4×01El").

- **one-heading**: the hero holds an h2 (1): its heading is the h1, and an h2 opens the next section (SR-5) (section.timeline > div.timeline-heading > div:nth-of-type(1) > h2 "nov 2026").

- **container-edges**: the content of section 1 runs 8px from the left and 4px from the right (read from its outermost blocks: no .wrap): 8 and 4px are not one margin; the margin is 64-120px at 1440px (one container, equal margins, 2px either way) (SR-6) (main#contenido > section.explorer-workspace "TerraSyncCómo usarGuía rápida · 1/4×01El").

- **container-edges**: a <div> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6) (div#root "Saltar al contenidoTerraSyncCómo usarGuí").

- **container-edges**: a box runs 0-1440px, outside the container lines of section 1 at 8-1436px: full width is for background layers and grounds only (SR-6) (main#contenido > section.explorer-workspace > header.map-header "TerraSyncCómo usarGuía rápida · 1/4×01El").

- **container-edges**: a box runs 0-1440px, outside the container lines of section 1 at 8-1436px: full width is for background layers and grounds only (and 3 more like it: "300 kmINEGI · Marco Geoe", "Todo México · 43 registr", "TimeMapnov 2026←Reproduc") (SR-6) (main#contenido > section.explorer-workspace > div.map-filterbar "TerritorioTodo MéxicoMunicipios y capasV").

- **container-edges**: the h1 starts 64px right of the container's left: every h1 and h2 starts on it, 2px either way (SR-6) (section.explorer-workspace > header.map-header > a.project-brand > h1 "TerraSync").

- **container-edges**: 7 text blocks start on a left line at x 24, 16px from the container's left: text starts on the container's left, or on one split line (x 613, 734, 855) (also "Territorio", "Todo México · 43 registros", "nov 2026") (and 1 more like it: "nov 2026") (SR-6) (main#contenido > section.explorer-workspace > div.map-filterbar > label.state-filter "TerritorioTodo México").

- **collide**: the words "1000 km" lie over "Reintentar cartografía": two lines in one place (div.mexico-map.maplibregl-map > div.maplibregl-control-container > div.maplibregl-ctrl-bottom-left > div.maplibregl-ctrl.maplibregl-ctrl-scale "1000 km").

- **off-grid**: left edge at 18px, 6px off a common edge of its section at 12px (10 elements, like span:nth-of-type(1)) (div.mexico-map.maplibregl-map > div.maplibregl-control-container > div.maplibregl-ctrl-bottom-left > div.maplibregl-ctrl.maplibregl-ctrl-scale "1000 km").

- **container**: no .wrap (page).
