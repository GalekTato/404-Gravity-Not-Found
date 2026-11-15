import { useEffect, useRef } from 'react'
import { Popup, type ExpressionSpecification, type GeoJSONSource, type Map, type MapMouseEvent } from 'maplibre-gl'
import type { SesionMapa } from '../hooks/useMapaMexico'
import {
  COLORES_DESASTRE,
  ETIQUETAS_DESASTRE,
  esTipoDesastre,
  obtenerPredicciones,
} from '../servicios/predicciones'
import type { PropiedadesDesastre, TipoDesastre } from '../servicios/predicciones'
import type { EstadoPredicciones } from '../tipos/cartografia'

const FUENTE = 'predicciones-source'
const CAPA_HALO = 'predicciones-halo'
const CAPA_PUNTOS = 'predicciones-puntos'

const COLOR_TIPO: ExpressionSpecification = [
  'match', ['get', 'type'],
  'sismo', COLORES_DESASTRE.sismo,
  'huracan', COLORES_DESASTRE.huracan,
  'sequia', COLORES_DESASTRE.sequia,
  'inundacion', COLORES_DESASTRE.inundacion,
  'incendio', COLORES_DESASTRE.incendio,
  '#ffffff',
]

const RADIO_HALO: ExpressionSpecification = ['interpolate', ['linear'], ['get', 'severity'], 1, 12, 10, 28]
const RADIO_PUNTO: ExpressionSpecification = ['interpolate', ['linear'], ['get', 'severity'], 1, 5, 10, 14]

function asegurarCapas(map: Map) {
  if (!map.getSource(FUENTE)) {
    map.addSource(FUENTE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }
  if (!map.getLayer(CAPA_HALO)) {
    map.addLayer({
      id: CAPA_HALO,
      type: 'circle',
      source: FUENTE,
      paint: {
        'circle-color': COLOR_TIPO,
        'circle-radius': RADIO_HALO,
        'circle-opacity': 0.2,
      },
    })
  }
  if (!map.getLayer(CAPA_PUNTOS)) {
    map.addLayer({
      id: CAPA_PUNTOS,
      type: 'circle',
      source: FUENTE,
      paint: {
        'circle-color': COLOR_TIPO,
        'circle-radius': RADIO_PUNTO,
        'circle-opacity': 0.95,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#0b1b29',
      },
    })
  }
}

function fijarVisibilidad(map: Map, visible: boolean) {
  for (const capa of [CAPA_HALO, CAPA_PUNTOS]) {
    if (map.getLayer(capa)) map.setLayoutProperty(capa, 'visibility', visible ? 'visible' : 'none')
  }
}

function propiedadesDesde(feature: { properties?: Record<string, unknown> | null }): PropiedadesDesastre | undefined {
  const props = feature.properties
  if (!props || !esTipoDesastre(props.type)) return undefined
  const severity = typeof props.severity === 'number' ? props.severity : Number(props.severity)
  const radius = typeof props.radius_km === 'number' ? props.radius_km : Number(props.radius_km)
  if (!Number.isFinite(severity) || !Number.isFinite(radius) || radius <= 0) return undefined
  const evidence = props.evidence
  const score = props.score
  const probability = props.probability
  const month = props.month
  const source = props.source
  const stateName = props.state_name
  const stateClave = props.state_clave
  return {
    id: String(props.id ?? ''),
    name: String(props.name ?? 'Evento sin nombre'),
    type: props.type,
    severity,
    radius_km: radius,
    date: String(props.date ?? ''),
    ...(typeof evidence === 'string' ? { evidence: evidence as PropiedadesDesastre['evidence'] } : {}),
    ...(typeof score === 'number' || score === null ? { score } : {}),
    ...(typeof probability === 'number' || probability === null ? { probability } : {}),
    ...(typeof props.observed === 'boolean' ? { observed: props.observed } : {}),
    ...(typeof month === 'string' ? { month } : {}),
    ...(typeof source === 'string' ? { source } : {}),
    ...(typeof stateName === 'string' ? { state_name: stateName } : {}),
    ...(typeof stateClave === 'string' ? { state_clave: stateClave } : {}),
  }
}

function contenidoPopup(props: PropiedadesDesastre): HTMLDivElement {
  const contenedor = document.createElement('div')
  contenedor.className = 'prediccion-popup-contenido'
  const tipo = document.createElement('p')
  tipo.className = 'prediccion-popup-tipo'
  tipo.style.color = COLORES_DESASTRE[props.type]
  const estadoTexto = props.state_name ? ` · ${props.state_name}` : ''
  tipo.textContent = `${ETIQUETAS_DESASTRE[props.type]} · Severidad ${props.severity.toFixed(1)}/10${estadoTexto}`
  const nombre = document.createElement('p')
  nombre.className = 'prediccion-popup-nombre'
  nombre.textContent = props.name
  const detalle = document.createElement('p')
  detalle.className = 'prediccion-popup-detalle'
  detalle.textContent = `Radio de cobertura: ${props.radius_km} km · Fecha: ${props.date}`
  const evidencia = document.createElement('p')
  evidencia.className = 'prediccion-popup-detalle'
  const etiqueta = props.evidence ?? 'no_confirmable'
  const probTexto = typeof props.probability === 'number' ? ` · Prob: ${(props.probability * 100).toFixed(0)}%` : ''
  const scoreTexto = props.score === null || props.score === undefined ? '' : ` · Score: ${props.score}`
  evidencia.textContent = `Evidencia: ${etiqueta}${probTexto}${scoreTexto}`
  contenedor.append(tipo, nombre, detalle, evidencia)
  if (props.source) {
    const fuente = document.createElement('p')
    fuente.className = 'prediccion-popup-detalle'
    fuente.textContent = `Fuente: ${props.source}`
    contenedor.append(fuente)
  }
  return contenedor
}

export function PredictionMarkers({
  sesion,
  visible,
  fecha,
  tipo,
  intento = 0,
  onEstado,
}: {
  sesion?: SesionMapa
  visible: boolean
  fecha?: string
  tipo?: TipoDesastre
  intento?: number
  onEstado?: (estado: EstadoPredicciones) => void
}) {
  const popupRef = useRef<Popup | null>(null)

  useEffect(() => {
    if (!sesion?.activa) return
    const mapaSesion = sesion
    const { map } = mapaSesion
    const controller = new AbortController()

    function cerrarPopup() {
      popupRef.current?.remove()
      popupRef.current = null
    }

    async function sincronizar() {
      if (!visible) {
        fijarVisibilidad(map, false)
        cerrarPopup()
        onEstado?.({ estado: 'inactivo' })
        return
      }

      onEstado?.({ estado: 'cargando' })
      try {
        const datos = await obtenerPredicciones(fecha, controller.signal, tipo)
        if (controller.signal.aborted || !mapaSesion.activa) return

        asegurarCapas(map)
        const source = map.getSource(FUENTE) as GeoJSONSource | undefined
        if (!source) return
        await source.setData(datos)
        if (controller.signal.aborted || !mapaSesion.activa) return

        fijarVisibilidad(map, true)
        cerrarPopup()
        onEstado?.({
          estado: 'listo',
          total: datos.metadata?.count ?? datos.features.length,
          fecha: datos.metadata?.period ?? datos.metadata?.date ?? fecha,
        })
      } catch (error) {
        if (controller.signal.aborted || !mapaSesion.activa) return
        fijarVisibilidad(map, false)
        cerrarPopup()
        onEstado?.({
          estado: 'error',
          mensaje: error instanceof Error ? error.message : 'No se pudieron cargar las predicciones.',
        })
      }
    }

    function onClick(e: MapMouseEvent) {
      if (!visible || !mapaSesion.activa || !map.getLayer(CAPA_PUNTOS)) return
      const feature = map.queryRenderedFeatures(e.point, { layers: [CAPA_PUNTOS] })[0]
      if (!feature) return
      const props = propiedadesDesde(feature)
      if (!props || feature.geometry.type !== 'Point') return

      cerrarPopup()
      popupRef.current = new Popup({ offset: 14, closeButton: true, className: 'prediccion-popup' })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(contenidoPopup(props))
        .addTo(map)
    }

    void sincronizar()
    map.on('click', onClick)

    return () => {
      controller.abort()
      map.off('click', onClick)
      cerrarPopup()
    }
  }, [sesion, visible, fecha, tipo, intento, onEstado])

  return null
}
