import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMapaMexico } from '../hooks/useMapaMexico'
import type { SesionMapa } from '../hooks/useMapaMexico'
import { agregarCapas, ajustarVista, limitesMexico, opacidadEstados } from '../servicios/mapaMexico'
import { limitesArea } from '../servicios/geografia'
import { esperarMunicipiosDibujados } from '../servicios/capaMunicipal'
import { COLORES_DESASTRE, ETIQUETAS_DESASTRE, TIPOS_DESASTRE } from '../servicios/predicciones'
import type { ColeccionAreas, EstadoPredicciones, MapaMexicoProps } from '../tipos/cartografia'
import { MexicoBoundary } from './MexicoBoundary'
import { PredictionMarkers } from './PredictionMarkers'

function predictionStatusText(state: EstadoPredicciones | undefined, date: string | undefined) {
  if (!state || state.estado === 'inactivo') return 'Indicadores científicos · no son alertas oficiales'
  if (state.estado === 'cargando') return 'Consultando indicadores científicos…'
  if (state.estado === 'error') return 'No se pudieron cargar los indicadores.'
  return `${state.total} indicadores · ${state.fecha ?? date ?? 'fecha consultada'} · no son alertas oficiales`
}

export function MexicoMap({ ref, geografia, entidad, municipios, municipio, mostrarLimites, mostrarMunicipios,
  mostrarPredicciones, fechaPrediccion, intentoPredicciones, estadoPredicciones, onEstadoPredicciones,
  onEntidad, onMunicipio, onReadyChange, onEstadoCapaMunicipal }: MapaMexicoProps) {
  const container = useRef<HTMLDivElement>(null)
  const { sesion, estado, mensaje, reintentar, avisoRelieve, reintentarRelieve } = useMapaMexico(container, onReadyChange)
  const colaMunicipios = useRef<{ sesion?: SesionMapa; tarea: Promise<void> }>({ tarea: Promise.resolve() })
  const [capaMunicipal, setCapaMunicipal] = useState<{ sesion: SesionMapa; datos?: ColeccionAreas; error?: string }>()
  const municipiosListos = capaMunicipal?.sesion === sesion && capaMunicipal?.datos === municipios && !capaMunicipal?.error

  useEffect(() => {
    if (!sesion?.activa) return
    const { map } = sesion
    if (!map.getSource('estados')) agregarCapas(map, geografia)
    let hover: string | number | undefined
    function click(event: MapMouseEvent) {
      // A marker click opens its detail and must not select the territory below it.
      if (map.getLayer('predicciones-puntos')
        && map.queryRenderedFeatures(event.point, { layers: ['predicciones-puntos'] }).length) return
      const municipal = map.queryRenderedFeatures(event.point, { layers: ['municipios-relleno', 'municipios-etiquetas'] })[0]
      if (municipal?.properties?.clave) { onMunicipio(String(municipal.properties.clave)); return }
      const estatal = map.queryRenderedFeatures(event.point, { layers: ['estados-relleno', 'estados-etiquetas'] })[0]
      if (estatal?.properties?.clave) onEntidad(String(estatal.properties.clave))
    }
    function mover(event: MapMouseEvent) {
      const feature = map.queryRenderedFeatures(event.point, { layers: ['estados-relleno'] })[0]
      const prediccion = map.getLayer('predicciones-puntos')
        ? map.queryRenderedFeatures(event.point, { layers: ['predicciones-puntos'] }).length > 0
        : false
      if (hover !== undefined) map.setFeatureState({ source: 'estados', id: hover }, { hover: false })
      hover = feature?.id
      if (hover !== undefined) map.setFeatureState({ source: 'estados', id: hover }, { hover: true })
      map.getCanvas().style.cursor = feature || prediccion ? 'pointer' : ''
    }
    map.on('click', click)
    map.on('mousemove', mover)
    return () => { map.off('click', click); map.off('mousemove', mover) }
  }, [sesion, geografia, onEntidad, onMunicipio])

  useEffect(() => {
    if (!sesion?.activa) return
    const { map } = sesion
    map.removeFeatureState({ source: 'estados' })
    if (entidad) map.setFeatureState({ source: 'estados', id: entidad.clave }, { seleccionado: true })
    map.setFilter('estado-seleccionado', ['==', ['get', 'clave'], entidad?.clave ?? ''])
    ajustarVista(map, entidad?.limites ?? limitesMexico)
  }, [sesion, entidad])

  useEffect(() => {
    if (!sesion?.activa) return
    const source = sesion.map.getSource('municipios') as GeoJSONSource
    let vigente = true
    const controller = new AbortController()
    const clave = entidad?.clave
    onEstadoCapaMunicipal({ clave, estado: municipios ? 'cargando' : 'listo' })
    // MapLibre 6 updates the worker asynchronously. Serialize writes and reject stale data.
    if (colaMunicipios.current.sesion !== sesion) colaMunicipios.current = { sesion, tarea: Promise.resolve() }
    const tarea = colaMunicipios.current.tarea.catch(() => {}).then(async () => {
      if (!vigente || !sesion.activa) return
      await source.setData(municipios ?? { type: 'FeatureCollection', features: [] })
      if (!vigente || !sesion.activa) return
      await esperarMunicipiosDibujados(sesion.map, controller.signal)
      if (!vigente || !sesion.activa) return
      setCapaMunicipal({ sesion, datos: municipios })
      onEstadoCapaMunicipal({ clave, estado: 'listo' })
    })
    colaMunicipios.current = { sesion, tarea }
    void tarea.catch(() => {
      if (!vigente || !sesion.activa) return
      const mensaje = 'No se pudieron dibujar los municipios. Vuelve a cargar la cartografía.'
      setCapaMunicipal({ sesion, datos: municipios, error: mensaje })
      onEstadoCapaMunicipal({ clave, estado: 'error', mensaje })
    })
    return () => { vigente = false; controller.abort() }
  }, [sesion, municipios, entidad?.clave, onEstadoCapaMunicipal])

  useEffect(() => {
    if (!sesion?.activa || !municipiosListos) return
    const { map } = sesion
    map.removeFeatureState({ source: 'municipios' })
    map.setFilter('municipio-seleccionado', ['==', ['get', 'clave'], municipio ?? ''])
    if (!municipio && entidad) { ajustarVista(map, entidad.limites); return }
    if (municipio) {
      map.setFeatureState({ source: 'municipios', id: municipio }, { seleccionado: true })
      const feature = municipios?.features.find(feature => feature.properties.clave === municipio)
      if (feature) ajustarVista(map, limitesArea(feature))
    }
  }, [sesion, municipio, municipios, entidad, municipiosListos])

  useEffect(() => {
    if (!sesion?.activa) return
    for (const layer of ['municipios-relleno', 'municipios-linea', 'municipios-etiquetas']) {
      // Keep the source active while tiles are prepared; the filter hides other entities.
      sesion.map.setFilter(layer, ['==', ['get', 'entidad'], entidad?.clave ?? ''])
      sesion.map.setLayoutProperty(layer, 'visibility', mostrarMunicipios && !!municipios ? 'visible' : 'none')
    }
    sesion.map.setLayoutProperty('municipio-seleccionado', 'visibility', mostrarMunicipios && municipiosListos ? 'visible' : 'none')
  }, [sesion, mostrarMunicipios, municipiosListos, municipios, entidad?.clave])

  useEffect(() => {
    if (!sesion?.activa || !sesion.map.getLayer('estados-relleno')) return
    sesion.map.setPaintProperty('estados-relleno', 'fill-opacity', avisoRelieve ? .92 : opacidadEstados)
  }, [sesion, avisoRelieve])

  useEffect(() => {
    if (!sesion?.activa) return
    const { map } = sesion
    const feature = municipios?.features.find(feature => feature.properties.clave === municipio)
    const limites = feature ? limitesArea(feature) : entidad?.limites ?? limitesMexico
    function reencuadrar() {
      if (!sesion?.activa) return
      map.stop()
      ajustarVista(map, limites, false)
    }
    map.on('resize', reencuadrar)
    return () => { map.off('resize', reencuadrar) }
  }, [sesion, entidad, municipio, municipios])

  useImperativeHandle(ref, () => ({
    zoom(delta) { if (sesion?.activa) sesion.map.zoomTo(sesion.map.getZoom() + delta, { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250 }) },
    restablecer() { if (sesion?.activa) ajustarVista(sesion.map, limitesMexico) },
  }), [sesion])

  return (
    <div className="map-stage" aria-busy={estado === 'cargando'}>
      <div ref={container} className="mexico-map" />
      {estado !== 'listo' && <div className="map-feedback" role={estado === 'error' ? 'alert' : 'status'}>
        <p>{estado === 'cargando' ? 'Preparando el mapa de México…' : mensaje}</p>
        {estado === 'error' && <button className="button button-primary" onClick={reintentar}>Volver a intentar</button>}
      </div>}
      <MexicoBoundary sesion={sesion} visible={mostrarLimites}/>
      <PredictionMarkers sesion={sesion} visible={!!mostrarPredicciones} fecha={fechaPrediccion}
        intento={intentoPredicciones} onEstado={onEstadoPredicciones}/>
      {avisoRelieve && <div className="map-base-notice" role="status"><p>{avisoRelieve}</p><button onClick={reintentarRelieve}>Reintentar relieve</button></div>}
      <div className="map-legend" aria-label="Leyenda del mapa">
        <span className="legend-row"><span className="legend-state"/> Estados <span className="legend-municipal"/> Municipios de la entidad seleccionada</span>
        {mostrarPredicciones && <>
          <span className="legend-row legend-prediction-types">
            {TIPOS_DESASTRE.map(tipo => <span key={tipo} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: COLORES_DESASTRE[tipo] }}/>{ETIQUETAS_DESASTRE[tipo]}
            </span>)}
          </span>
          <span className="legend-caption">{predictionStatusText(estadoPredicciones, fechaPrediccion)}</span>
        </>}
      </div>
    </div>
  )
}
