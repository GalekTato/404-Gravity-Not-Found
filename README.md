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
      hooks/          useGlobeView y ciclo de vida useCesiumViewer
      servicios/      Adaptador Cesium, cámara y catálogo de regiones vacío
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

El explorador utiliza CesiumJS con un globo 3D real, cámara inicial centrada en México, navegación con ratón/táctil, zoom y botón de regreso a México. Se carga de forma diferida al entrar a `/explorar`. El Viewer y sus listeners se destruyen al salir, incluso con React StrictMode. Los errores de WebGL o carga muestran un mensaje y permiten reintentar.

El mapa base es Natural Earth II de baja resolución, incluido con Cesium y servido desde `/cesium/`; no requiere token de Cesium ion, acceso a sus APIs ni servicios externos de imágenes. El terreno usa un elipsoide sin relieve. Los créditos de Cesium y Natural Earth permanecen visibles. No son observaciones NISAR. La portada conserva su ilustración SVG original.

El GeoJSON oficial y las restricciones territoriales siguen pendientes. La navegación puede salir de México; los límites de altura de cámara solo evitan acercamientos y alejamientos extremos. RegionMarkers admite entidades Cesium y selección, pero no se muestra ningún marcador sin catálogo validado.

El catálogo de regiones está vacío. Las fechas se editan sin hacer consultas. La polarización no ofrece opciones hasta tener un catálogo. SAR y metadatos muestran estados vacíos. Aprendamos presenta temas en preparación. No hay backend, autenticación, resultados científicos inventados ni API real.

## PWA y despliegue

Se conserva `vite-plugin-pwa` con `registerType: autoUpdate`, manifiesto en español e iconos PNG propios de 192 y 512 píxeles. El service worker precachea el shell y los bundles (máximo 8 MiB por archivo), sin descargar datos científicos. Los recursos `/cesium/` se cachean a medida que se visitan (CacheFirst, 250 entradas, 30 días); la vista 3D sin conexión depende de los recursos ya cargados. La instalación requiere HTTPS o localhost y depende del navegador.

`vite-plugin-static-copy` sirve en desarrollo y copia en producción `Workers`, `ThirdParty`, `Assets` y `Widgets` de Cesium. `CESIUM_BASE_URL` apunta a `/cesium/`. El despliegue actual está configurado para la raíz del dominio.

Publicar `dist/` como SPA. El servidor debe devolver `index.html` al abrir rutas directamente; React Router mostrará la página o el 404. `public/_redirects` incluye esa regla para proveedores compatibles; en otros configurar el fallback equivalente. `.openai/hosting.json` declara la salida estática para Sites.

[NASA Eyes](https://eyes.nasa.gov/apps/earth/) es inspiración visual. No se reutiliza su código, identidad ni recursos.
