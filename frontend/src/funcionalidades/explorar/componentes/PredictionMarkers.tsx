import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Feature, Point } from 'geojson'
import type { GeoJSONSource, Map, MapMouseEvent } from 'maplibre-gl'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import { registrarIconosAmenaza } from '../servicios/iconosAmenazaMapa'
import { resumenIndicador } from '../servicios/fichaIndicador'
import type { SesionMapa } from '../hooks/useMapaMexico'
import { esTipoDesastre, obtenerPredicciones } from '../servicios/predicciones'
import type { PropiedadesDesastre, TipoDesastre } from '../servicios/predicciones'
import type { EstadoPredicciones } from '../tipos/cartografia'
import {
  descripcionInstrumento,
  startDisasterLoop,
  type AudioPlayback,
} from '../../../utils/disasterSound'

const FUENTE = 'predicciones-source'
const CAPA_PUNTOS = 'predicciones-puntos'
const MARGEN_VIEWPORT = 16

interface SeleccionEvento {
  props: PropiedadesDesastre
  coordinates: [number, number]
}

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
        'icon-size': ['interpolate', ['linear'], ['get', 'severity'], 0, 0.85, 10, 1.2],
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

function clamp(valor: number, min: number, max: number): number {
  return Math.max(min, Math.min(valor, max))
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
  const { idioma, t } = useIdioma()
  const [seleccion, setSeleccion] = useState<SeleccionEvento | null>(null)
  const [audioActivoId, setAudioActivoId] = useState<string | null>(null)
  const [posicion, setPosicion] = useState<{ left: number; top: number }>({ left: 24, top: 96 })
  const audioRef = useRef<{ id: string; playback: AudioPlayback } | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const idiomaRef = useRef(idioma)

  useEffect(() => {
    idiomaRef.current = idioma
  }, [idioma])

  const detenerAudio = useCallback(() => {
    audioRef.current?.playback.stop()
    audioRef.current = null
    setAudioActivoId(null)
  }, [])

  const cerrarFicha = useCallback(() => {
    detenerAudio()
    setSeleccion(null)
  }, [detenerAudio])

  const toggleAudioParaEvento = useCallback((evento: SeleccionEvento) => {
    const { props, coordinates } = evento
    if (audioRef.current?.id === props.id) {
      detenerAudio()
      return
    }
    detenerAudio()
    try {
      const audioFeature: Feature<Point, PropiedadesDesastre> = {
        type: 'Feature',
        properties: props,
        geometry: { type: 'Point', coordinates },
      }
      const playback = startDisasterLoop(audioFeature, {
        idioma: idiomaRef.current,
        onStop: () => {
          if (audioRef.current?.id === props.id) {
            audioRef.current = null
            setAudioActivoId(null)
          }
        },
      })
      audioRef.current = { id: props.id, playback }
      setAudioActivoId(props.id)
    } catch {
      detenerAudio()
    }
  }, [detenerAudio])

  const recalcularPosicion = useCallback(() => {
    if (!seleccion || !sesion?.activa) return
    const { map } = sesion
    const rect = map.getContainer().getBoundingClientRect()
    const pt = map.project(seleccion.coordinates)
    const anchorX = rect.left + pt.x
    const anchorY = rect.top + pt.y

    const cardWidth = cardRef.current?.offsetWidth || Math.min(340, window.innerWidth - MARGEN_VIEWPORT * 2)
    const cardHeight = cardRef.current?.offsetHeight || 240

    const maxLeft = Math.max(MARGEN_VIEWPORT, window.innerWidth - cardWidth - MARGEN_VIEWPORT)
    const maxTop = Math.max(MARGEN_VIEWPORT, window.innerHeight - cardHeight - MARGEN_VIEWPORT)

    const left = clamp(anchorX - cardWidth / 2, MARGEN_VIEWPORT, maxLeft)
    const arriba = anchorY - cardHeight - 18
    const debajo = anchorY + 20
    const preferidoTop = arriba >= MARGEN_VIEWPORT ? arriba : debajo
    const top = clamp(preferidoTop, MARGEN_VIEWPORT, maxTop)

    setPosicion({ left, top })
  }, [seleccion, sesion])

  useLayoutEffect(() => {
    if (!seleccion) return
    recalcularPosicion()
  }, [seleccion, idioma, audioActivoId, recalcularPosicion])

  useEffect(() => {
    if (!seleccion || !sesion?.activa) return
    const { map } = sesion

    function alMoverMapa() {
      recalcularPosicion()
    }
    function alPresionarFuera(event: PointerEvent) {
      if (event.target instanceof Node && cardRef.current?.contains(event.target)) return
      cerrarFicha()
    }
    function alPresionarTecla(event: KeyboardEvent) {
      if (event.key === 'Escape') cerrarFicha()
    }

    map.on('move', alMoverMapa)
    window.addEventListener('resize', alMoverMapa)
    document.addEventListener('pointerdown', alPresionarFuera)
    document.addEventListener('keydown', alPresionarTecla)

    return () => {
      map.off('move', alMoverMapa)
      window.removeEventListener('resize', alMoverMapa)
      document.removeEventListener('pointerdown', alPresionarFuera)
      document.removeEventListener('keydown', alPresionarTecla)
    }
  }, [seleccion, sesion, recalcularPosicion, cerrarFicha])

  useEffect(() => {
    if (!sesion?.activa) return
    const mapaSesion = sesion
    const { map } = mapaSesion
    const controller = new AbortController()

    async function sincronizar() {
      if (!visible) {
        fijarVisibilidad(map, false)
        cerrarFicha()
        onEstado?.({ estado: 'inactivo' })
        return
      }

      onEstado?.({ estado: 'cargando' })
      cerrarFicha()
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
        cerrarFicha()
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

      const coordinates = feature.geometry.coordinates as [number, number]
      detenerAudio()
      setSeleccion({ props, coordinates })
    }

    void sincronizar()
    map.on('click', onClick)

    return () => {
      controller.abort()
      map.off('click', onClick)
      cerrarFicha()
    }
  }, [sesion, visible, fecha, tipo, estadoFiltro, intento, onEstado, cerrarFicha, detenerAudio])

  if (!seleccion || !visible || typeof document === 'undefined') return null

  const resumen = resumenIndicador(seleccion.props, idioma)
  const audioActivo = audioActivoId === seleccion.props.id

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-label={resumen.titulo}
      className="evento-ficha-flotante"
      style={{ left: `${posicion.left}px`, top: `${posicion.top}px` }}
    >
      <button
        type="button"
        className="evento-ficha-cerrar"
        aria-label={t('Cerrar descripción del evento', 'Close event description')}
        onClick={cerrarFicha}
      >
        ×
      </button>
      <div className="prediccion-popup-contenido">
        <p className="prediccion-popup-tipo" style={{ color: resumen.color }}>
          {resumen.encabezado}
        </p>
        <p className="prediccion-popup-nombre" lang={idioma}>
          {resumen.titulo}
        </p>
        <p className="prediccion-popup-detalle">{resumen.detalle}</p>
        <p className="prediccion-popup-detalle">{resumen.evidencia}</p>
        {resumen.fuente && <p className="prediccion-popup-detalle">{resumen.fuente}</p>}
        <div className="prediccion-popup-audio-row">
          <button
            type="button"
            className="quiet-button prediccion-popup-audio-btn"
            aria-pressed={audioActivo}
            onClick={() => toggleAudioParaEvento(seleccion)}
          >
            {audioActivo
              ? `■ ${t('Detener quintas', 'Stop 5ths audio')}`
              : `♫ ${t('Escuchar firma (quintas)', 'Listen (5ths signature)')}`}
          </button>
          <p className="prediccion-popup-audio-estado" aria-live="polite">
            {audioActivo
              ? `${t('Sonando:', 'Playing:')} ${descripcionInstrumento(seleccion.props.type, idioma)}`
              : t(
                  'Círculo de quintas mapeado a severidad y probabilidad.',
                  'Circle of fifths mapped to severity & probability.',
                )}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
