# Earth Symphony · México

Arquitectura inicial: React 19, TypeScript estricto, Vite 8, Tailwind CSS 4, React Router y PWA. La aplicación se desarrolla directamente en `front404`.

## Comandos pnpm

Requiere Node.js compatible con Vite 8 (20.19+ o 22.12+) y pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
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
    inicio/paginas/
    explorar/
      paginas/
      componentes/    MexicoGlobe, GlobeControls, RegionMarkers,
                      RegionInfoPanel, MexicoBoundary, EarthIllustration
      hooks/          useGlobeView
      servicios/      Cámara inicial y catálogo de regiones vacío
      tipos/          Interfaces del explorador
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

La Tierra es una ilustración SVG original, no cartografía ni imagen NISAR. El zoom solo modifica su escala. CesiumJS, GeoJSON real, restricciones de cámara y marcadores geográficos quedan pendientes y no se instalan. La cámara futura define un centro inicial de referencia en México.

El catálogo de regiones está vacío. Las fechas se editan sin hacer consultas. La polarización no ofrece opciones hasta tener un catálogo. SAR y metadatos muestran estados vacíos. Aprendamos presenta temas en preparación. No hay backend, autenticación, resultados científicos inventados ni API real.

## PWA y despliegue

Se conserva `vite-plugin-pwa` con `registerType: autoUpdate`, manifiesto en español e iconos PNG propios de 192 y 512 píxeles. El service worker almacena el shell compilado tras la primera visita, sin descargar datos científicos. La instalación requiere HTTPS o localhost y depende del navegador.

Publicar `dist/` como SPA. El servidor debe devolver `index.html` al abrir rutas directamente; React Router mostrará la página o el 404. `public/_redirects` incluye esa regla para proveedores compatibles; en otros configurar el fallback equivalente. `.openai/hosting.json` declara la salida estática para Sites.

[NASA Eyes](https://eyes.nasa.gov/apps/earth/) es inspiración visual. No se reutiliza su código, identidad ni recursos.
