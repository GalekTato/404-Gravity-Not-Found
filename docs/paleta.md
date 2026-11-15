# Paleta del frontend

Tipo: software científico para explorar el territorio mexicano. Acción principal: «Explorar México».

Revisión de color con `design-taste-frontend` (Taste Skill), refinada después para reducir todavía más la saturación: fondo carbón `#0d0f0e`, superficie `#181b19`, texto `#e7eae7`, texto secundario `#a9afaa` y acento gris verdoso `#a0ada2`. Las acciones usan un relleno verde oscuro `#35463b` con texto claro. El titular es neutro y los indicadores no llevan brillo.

El alcance es únicamente el sistema de colores: se conservan textos, Solar Icons, navegación inferior, distribución, tipografía y escenas existentes. El detalle `#b2adb4` es un gris apenas matizado, limitado a iconos educativos y etiquetas. La prioridad es evitar colores luminosos o saturados.

## Dónde editar

Los tokens están al principio de `src/estilos/tema.css`:

| Token | Uso |
| --- | --- |
| `--p-bg`, `--p-surface` | Fondo y paneles |
| `--superficie-alta`, `--superficie-activa` | Controles y selección |
| `--p-ink`, `--p-muted` | Texto principal y secundario |
| `--p-action`, `--p-action-ink` | Botón principal y su texto |
| `--p-accent`, `--acento-hover` | Enlaces, acentos y hover |
| `--borde`, `--borde-interactivo` | Separadores y controles |
| `--detalle` | Detalles morados |

El fondo negro espacial solicitado se mantiene. La textura terrestre, las imágenes de relieve y los colores cartográficos conservan su significado. `index.html` y el manifiesto PWA usan el mismo color de entorno `#0d0f0e`.

Las comprobaciones automáticas de Taste Skill también revisan composición, textos y animaciones; sus hallazgos ajenos al cambio de color se registran sin ampliar este trabajo a un rediseño completo.
