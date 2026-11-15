import { useEffect, useRef } from 'react'
import type { Feature, Point } from 'geojson'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import { Popup, type GeoJSONSource, type Map, type MapMouseEvent } from 'maplibre-gl'
import { registrarIconosAmenaza } from '../servicios/iconosAmenazaMapa'
import { contenidoPopup } from '../servicios/fichaIndicador'
import type { SesionMapa } from '../hooks/useMapaMexico'
import {
  esTipoDesastre,
  obtenerPredicciones,
} from '../servicios/predicciones'
import type { PropiedadesDesastre, TipoDesastre } from '../servicios/predicciones'
import type { EstadoPredicciones } from '../tipos/cartografia'
import { startDisasterLoop, type AudioPlayback } from '../../../utils/disasterSound'

const FUENTE = 'predicciones-source'
const CAPA_PUNTOS = 'predicciones-puntos'

function asegurarCapas(map: Map) {
  registrarIconosAmenaza(map)
  if (map.getLayer('predicciones-halo')) map.removeLayer('predicciones-halo')
  if (map.getLayer(CAPA_PUNTOS) && map.getLayer(CAPA_PUNTOS)?.type !== 'symbol') map.removeLayer(CAPA_PUNTOS)
  if (!map.getSource(FUENTE)) {
    map.addSource(FUENTE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }
  if (!map.getLayer(CAPA_PUNTOS)) {
    map.addLayer({
      id: CAPA_PUNTOS,
      type: 'symbol',
      source: FUENTE,
      layout: {
        'icon-image': ['concat', 'amenaza-', ['get', 'type']],
        'icon-size': ['interpolate', ['linear'], ['get', 'severity'], 0, .85, 10, 1.2],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'symbol-sort-key': ['get', 'severity'],
      },
      paint: { 'icon-opacity': 1 },
    })
  }
}

function fijarVisibilidad(map: Map, visible: boolean) {
  if (map.getLayer(CAPA_PUNTOS)) map.setLayoutProperty(CAPA_PUNTOS, 'visibility', visible ? 'visible' : 'none')
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

export function PredictionMarkers({
  sesion,
  visible,
  fecha,
  tipo,
  estadoFiltro,
  intento = 0,
  onEstado,
}: {
  sesion?: SesionMapa
  visible: boolean
  fecha?: string
  tipo?: TipoDesastre
  estadoFiltro?: string
  intento?: number
  onEstado?: (estado: EstadoPredicciones) => void
}) {
  const { idioma } = useIdioma()
  const popupRef = useRef<Popup | null>(null)
  const datosPopupRef = useRef<{ props: PropiedadesDesastre; coordinates: [number, number] } | undefined>(undefined)
  const audioRef = useRef<{ id: string; playback: AudioPlayback } | null>(null)
  const idiomaRef = useRef(idioma)

  function toggleAudioParaEvento(props: PropiedadesDesastre, coordinates: [number, number]): boolean {
    if (audioRef.current?.id === props.id) {
      audioRef.current.playback.stop()
      audioRef.current = null
      return false
    }
    audioRef.current?.playback.stop()
    audioRef.current = null
    try {
      const audioFeature: Feature<Point, PropiedadesDesastre> = {
        type: 'Feature',
        properties: props,
        geometry: { type: 'Point', coordinates },
      }
      const playback = startDisasterLoop(audioFeature, {
        idioma: idiomaRef.current,
        onStop: () => {
          if (audioRef.current?.id === props.id) audioRef.current = null
        },
      })
      audioRef.current = { id: props.id, playback }
      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    idiomaRef.current = idioma
    if (popupRef.current?.isOpen() && datosPopupRef.current) {
      const { props, coordinates } = datosPopupRef.current
      popupRef.current.setDOMContent(
        contenidoPopup(props, idioma, {
          activo: audioRef.current?.id === props.id,
          onToggleAudio: () => toggleAudioParaEvento(props, coordinates),
        }),
      )
    }
  }, [idioma])

  useEffect(() => {
    if (!sesion?.activa) return
    const mapaSesion = sesion
    const { map } = mapaSesion
    const controller = new AbortController()

    function detenerAudio() {
      audioRef.current?.playback.stop()
      audioRef.current = null
    }

    function cerrarPopup() {
      detenerAudio()
      popupRef.current?.remove()
      popupRef.current = null
      datosPopupRef.current = undefined
    }

    async function sincronizar() {
      if (!visible) {
        fijarVisibilidad(map, false)
        cerrarPopup()
        onEstado?.({ estado: 'inactivo' })
        return
      }

      onEstado?.({ estado: 'cargando' })
      cerrarPopup()
      try {
        const datos = await obtenerPredicciones(fecha, controller.signal, tipo, estadoFiltro)
        if (controller.signal.aborted || !mapaSesion.activa) return

        asegurarCapas(map)
        const source = map.getSource(FUENTE) as GeoJSONSource | undefined
        if (!source) return
        await source.setData(datos)
        if (controller.signal.aborted || !mapaSesion.activa) return

        fijarVisibilidad(map, true)
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

      const coords = feature.geometry.coordinates as [number, number]
      cerrarPopup()
      datosPopupRef.current = { props, coordinates: coords }
      const popup = new Popup({ offset: 20, closeButton: true, className: 'prediccion-popup' })
        .setLngLat(coords)
        .setDOMContent(
          contenidoPopup(props, idiomaRef.current, {
            activo: audioRef.current?.id === props.id,
            onToggleAudio: () => toggleAudioParaEvento(props, coords),
          }),
        )
        .addTo(map)
      popup.on('close', () => {
        if (audioRef.current?.id === props.id) detenerAudio()
      })
      popupRef.current = popup
    }

    void sincronizar()
    map.on('click', onClick)

    return () => {
      controller.abort()
      map.off('click', onClick)
      cerrarPopup()
    }
  }, [sesion, visible, fecha, tipo, estadoFiltro, intento, onEstado])

  return null
}
