import { Map, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import type { ExpressionSpecification } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection, Point } from 'geojson'
import type { GeografiaMexico, Limites } from '../tipos/cartografia'

export const limitesMexico: Limites = [-118.5, 14.3, -86.4, 32.8]
export const teselasRelieve = ['https://ows.terrestris.de/osm/service?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=TOPO-WMS&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE&BGCOLOR=0xaad3df']
export const opacidadEstados: ExpressionSpecification = ['case', ['boolean', ['feature-state', 'seleccionado'], false], .07, ['boolean', ['feature-state', 'hover'], false], .12, .01]
const limitesNavegacion: Limites = [-126, 8, -79, 40]
function margenNacional(container: HTMLElement) {
  return Math.max(20, Math.round(Math.min(container.clientWidth, container.clientHeight) * .11))
}

export function ajustarVista(map: Map, limites: Limites, animar = true) {
  const container = map.getContainer()
  const w = container.clientWidth
  const h = container.clientHeight
  if (w < 160 || h < 160) return
  const nacional = limites.every((valor, index) => valor === limitesMexico[index])
  const margen = nacional ? margenNacional(container) : w < 500 ? 18 : 36
  const barra = container.closest('.explorer-workspace')?.querySelector('.map-liquid-toolbar')
  const espacioSuperior = barra
    ? Math.max(0, barra.getBoundingClientRect().bottom - container.getBoundingClientRect().top + 10)
    : margen
  const maxPadTop = Math.max(16, Math.floor(h * .28))
  const padTop = Math.min(maxPadTop, Math.max(Math.min(margen, maxPadTop), Math.round(espacioSuperior * .6)))
  const padBottom = Math.min(Math.max(12, Math.floor(h * .14)), margen)
  const padSide = Math.min(Math.max(16, Math.floor(w * .22)), margen)
  const padding = { top: padTop, bottom: padBottom, left: padSide, right: padSide }
  if (padding.top + padding.bottom >= h - 48 || padding.left + padding.right >= w - 48) return
  try {
    map.fitBounds(limites, {
      padding,
      maxZoom: 10,
      bearing: 0,
      pitch: 0,
      duration: animar && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 650 : 0,
    })
  } catch {
    // Container dimensions temporarily constrained; ResizeObserver will re-fit once layout settles.
  }
}

export function crearMapa(container: HTMLDivElement) {
  // MapLibre 6 distribuye el worker separado; Vite debe resolver y emitir su URL.
  setWorkerUrl(workerUrl)
  const listoParaBounds = container.clientWidth >= 180 && container.clientHeight >= 180
  const padInicial = Math.min(
    margenNacional(container),
    Math.max(12, Math.floor(Math.min(container.clientWidth || 320, container.clientHeight || 320) * .16)),
  )
  const map = new Map({
    container,
    style: { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#101f29' } }] },
    ...(listoParaBounds
      ? { bounds: limitesMexico, fitBoundsOptions: { padding: padInicial } }
      : { center: [-102.5, 23.6], zoom: 4.3 }),
    maxBounds: limitesNavegacion,
    minZoom: 2,
    maxZoom: 13,
    maxPitch: 0,
    dragRotate: false,
    touchZoomRotate: true,
    renderWorldCopies: false,
    attributionControl: { compact: false, customAttribution: '<a href="https://www.inegi.org.mx/servicios/catalogounico/" target="_blank" rel="noreferrer">INEGI · Marco Geoestadístico, dic. 2025</a>' },
    locale: { 'Map.Title': 'Mapa interactivo de México', 'Map.Description': 'Usa las flechas para desplazar el mapa y las teclas más y menos para acercarte.', 'ScaleControl.Meters': 'm', 'ScaleControl.Kilometers': 'km' },
  })
  map.touchZoomRotate.disableRotation()
  map.addControl(new ScaleControl({ unit: 'metric', maxWidth: 110 }), 'bottom-left')
  map.getCanvas().setAttribute('aria-label', 'Mapa de México. Usa las flechas para navegar o selecciona una entidad en el panel.')
  return map
}

export function agregarRelieve(map: Map) {
  map.addSource('relieve', {
    type: 'raster', tiles: teselasRelieve, tileSize: 256, maxzoom: 12, bounds: limitesNavegacion,
    attribution: 'Relieve: SRTM/NASA · <a href="https://www.mundialis.de/en/software/web-map-services-wms/" target="_blank" rel="noreferrer">mundialis</a> · <a href="https://terrestris.de/en/products/free-osm-wms/" target="_blank" rel="noreferrer">terrestris</a>',
  })
  map.addLayer({ id: 'relieve', source: 'relieve', type: 'raster', paint: { 'raster-saturation': -.55, 'raster-brightness-max': .55, 'raster-opacity': 1, 'raster-fade-duration': 100 } })
}

export function agregarCapas(map: Map, geografia: GeografiaMexico) {
  const etiquetas: FeatureCollection<Point> = { type: 'FeatureCollection', features: geografia.catalogo.map(entidad => ({
    type: 'Feature', id: entidad.clave, properties: { clave: entidad.clave, nombre: entidad.nombre }, geometry: { type: 'Point', coordinates: entidad.etiqueta },
  })) }
  map.addSource('estados', { type: 'geojson', data: geografia.estados, tolerance: .2 })
  map.addSource('etiquetas-estados', { type: 'geojson', data: etiquetas })
  map.addSource('municipios', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, tolerance: .2 })
  map.addLayer({ id: 'estados-relleno', source: 'estados', type: 'fill', paint: {
    'fill-color': ['case', ['boolean', ['feature-state', 'seleccionado'], false], '#6fadd6', ['boolean', ['feature-state', 'hover'], false], '#3c617a', '#253f50'],
    'fill-opacity': opacidadEstados,
  } })
  map.addLayer({ id: 'municipios-relleno', source: 'municipios', type: 'fill', paint: {
    'fill-color': '#d66f79',
    'fill-opacity': ['case', ['boolean', ['feature-state', 'seleccionado'], false], .17, .01],
  } })
  map.addLayer({ id: 'municipios-linea', source: 'municipios', type: 'line', paint: { 'line-color': '#5586a7', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, .5, 11, 1.3], 'line-opacity': .8 } })
  map.addLayer({ id: 'estados-linea', source: 'estados', type: 'line', paint: { 'line-color': '#3c617a', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, .8, 8, 1.6] } })
  map.addLayer({ id: 'estado-seleccionado', source: 'estados', type: 'line', filter: ['==', ['get', 'clave'], ''], paint: { 'line-color': '#d66f79', 'line-width': 2.5 } })
  map.addLayer({ id: 'municipio-seleccionado', source: 'municipios', type: 'line', filter: ['==', ['get', 'clave'], ''], paint: { 'line-color': '#d66f79', 'line-width': 2.6 } })
  map.addLayer({ id: 'municipios-etiquetas', source: 'municipios', type: 'symbol', minzoom: 7, layout: {
    'text-field': ['get', 'nombre'], 'text-font': ['Arial'], 'text-size': 12, 'text-max-width': 10, 'text-padding': 8,
  }, paint: { 'text-color': '#e9f2fa', 'text-halo-color': '#101f29', 'text-halo-width': 1.6 } })
  map.addLayer({ id: 'estados-etiquetas', source: 'etiquetas-estados', type: 'symbol', layout: {
    'text-field': ['get', 'nombre'], 'text-font': ['Arial'], 'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 7, 14],
    'text-max-width': 8, 'text-padding': 5,
  }, paint: { 'text-color': '#e9f2fa', 'text-halo-color': '#101f29', 'text-halo-width': 2 } })
}
