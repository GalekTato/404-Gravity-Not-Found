import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMapaMexico } from '../hooks/useMapaMexico'
import type { SesionMapa } from '../hooks/useMapaMexico'
import { agregarCapas, ajustarVista, limitesMexico, opacidadEstados } from '../servicios/mapaMexico'
import { limitesArea } from '../servicios/geografia'
import { esperarMunicipiosDibujados } from '../servicios/capaMunicipal'
import type { ColeccionAreas, MapaMexicoProps } from '../tipos/cartografia'
import { PredictionMarkers } from './PredictionMarkers'
import { MexicoBoundary } from './MexicoBoundary'

export function MexicoMap({ ref, geografia, entidad, municipios, municipio, mostrarLimites, mostrarMunicipios,
  mostrarPredicciones, fechaPrediccion, tipoPrediccion, intentoPredicciones, onEstadoPredicciones,
  onEntidad, onMunicipio, onReadyChange, onEstadoCapaMunicipal }: MapaMexicoProps) {
  const container = useRef<HTMLDivElement>(null)
  const { t, idioma } = useIdioma()
  const { sesion, estado, mensaje, reintentar, avisoRelieve, reintentarRelieve } = useMapaMexico(container, onReadyChange)
  const colaMunicipios = useRef<{ sesion?: SesionMapa; tarea: Promise<void> }>({ tarea: Promise.resolve() })
  const [capaMunicipal, setCapaMunicipal] = useState<{ sesion: SesionMapa; datos?: ColeccionAreas; error?: string }>()
  const municipiosListos = capaMunicipal?.sesion === sesion && capaMunicipal?.datos === municipios && !capaMunicipal?.error

  useEffect(() => {
    if (sesion?.activa) sesion.map.getCanvas().setAttribute('aria-label', t('Mapa de México. Selecciona un estado o usa el selector.', 'Map of Mexico. Select a state or use the state selector.'))
  }, [sesion, idioma, t])

  useEffect(() => {
    if (!sesion?.activa || !geografia) return
    const { map } = sesion
    if (!map.getSource('estados')) agregarCapas(map, geografia)
    let hover: string | number | undefined
    function click(event: MapMouseEvent) {
      if (map.getLayer('predicciones-puntos') && map.queryRenderedFeatures(event.point, { layers: ['predicciones-puntos'] }).length) return
      const municipal = map.queryRenderedFeatures(event.point, { layers: ['municipios-relleno', 'municipios-etiquetas'] })[0]
      if (municipal?.properties?.clave) { onMunicipio(String(municipal.properties.clave)); return }
      const estatal = map.queryRenderedFeatures(event.point, { layers: ['estados-relleno', 'estados-etiquetas'] })[0]
      if (estatal?.properties?.clave) onEntidad(String(estatal.properties.clave))
    }
    function mover(event: MapMouseEvent) {
      const feature = map.queryRenderedFeatures(event.point, { layers: ['estados-relleno'] })[0]
      const indicador = map.getLayer('predicciones-puntos') && map.queryRenderedFeatures(event.point, { layers: ['predicciones-puntos'] }).length > 0
      if (hover !== undefined) map.setFeatureState({ source: 'estados', id: hover }, { hover: false })
      hover = feature?.id
      if (hover !== undefined) map.setFeatureState({ source: 'estados', id: hover }, { hover: true })
      map.getCanvas().style.cursor = feature || indicador ? 'pointer' : ''
    }
    map.on('click', click)
    map.on('mousemove', mover)
    return () => { map.off('click', click); map.off('mousemove', mover) }
  }, [sesion, geografia, onEntidad, onMunicipio])

  useEffect(() => {
    if (!sesion?.activa || !geografia) return
    const { map } = sesion
    map.removeFeatureState({ source: 'estados' })
    if (entidad) map.setFeatureState({ source: 'estados', id: entidad.clave }, { seleccionado: true })
    map.setFilter('estado-seleccionado', ['==', ['get', 'clave'], entidad?.clave ?? ''])
    ajustarVista(map, entidad?.limites ?? limitesMexico)
  }, [sesion, geografia, entidad])

  useEffect(() => {
    if (!sesion?.activa || !geografia) return
    const source = sesion.map.getSource('municipios') as GeoJSONSource
    let vigente = true
    const controller = new AbortController()
    const clave = entidad?.clave
    onEstadoCapaMunicipal({ clave, estado: municipios ? 'cargando' : 'listo' })
    // MapLibre 6 actualiza el worker de forma asíncrona. No superponer escrituras ni seleccionar datos anteriores.
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
  }, [sesion, geografia, municipios, entidad?.clave, onEstadoCapaMunicipal])

  useEffect(() => {
    if (!sesion?.activa || !geografia || !municipiosListos) return
    const { map } = sesion
    map.removeFeatureState({ source: 'municipios' })
    map.setFilter('municipio-seleccionado', ['==', ['get', 'clave'], municipio ?? ''])
    if (!municipio && entidad) { ajustarVista(map, entidad.limites); return }
    if (municipio) {
      map.setFeatureState({ source: 'municipios', id: municipio }, { seleccionado: true })
      const feature = municipios?.features.find(feature => feature.properties.clave === municipio)
      if (feature) ajustarVista(map, limitesArea(feature))
    }
  }, [sesion, geografia, municipio, municipios, entidad, municipiosListos])

  useEffect(() => {
    if (!sesion?.activa || !geografia) return
    for (const layer of ['municipios-relleno', 'municipios-linea', 'municipios-etiquetas']) {
      // Mantener activa la fuente permite preparar sus teselas. El filtro impide mostrar otra entidad.
      sesion.map.setFilter(layer, ['==', ['get', 'entidad'], entidad?.clave ?? ''])
      sesion.map.setLayoutProperty(layer, 'visibility', mostrarMunicipios && !!municipios ? 'visible' : 'none')
    }
    sesion.map.setLayoutProperty('municipio-seleccionado', 'visibility', mostrarMunicipios && municipiosListos ? 'visible' : 'none')
  }, [sesion, geografia, mostrarMunicipios, municipiosListos, municipios, entidad?.clave])

  useEffect(() => {
    if (!sesion?.activa || !sesion.map.getLayer('estados-relleno')) return
    sesion.map.setPaintProperty('estados-relleno', 'fill-opacity', avisoRelieve ? .92 : opacidadEstados)
  }, [sesion, geografia, avisoRelieve])

  useEffect(() => {
    if (!sesion?.activa || !geografia) return
    const { map } = sesion
    const feature = municipios?.features.find(feature => feature.properties.clave === municipio)
    const limites = feature ? limitesArea(feature) : entidad?.limites ?? limitesMexico
    function reencuadrar() {
      if (!sesion?.activa || !geografia) return
      map.stop()
      ajustarVista(map, limites, false)
    }
    map.on('resize', reencuadrar)
    return () => { map.off('resize', reencuadrar) }
  }, [sesion, geografia, entidad, municipio, municipios])

  useImperativeHandle(ref, () => ({
    zoom(delta) { if (sesion?.activa) sesion.map.zoomTo(sesion.map.getZoom() + delta, { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250 }) },
    restablecer() { if (sesion?.activa) ajustarVista(sesion.map, limitesMexico) },
  }), [sesion])

  return (
    <div className="map-stage" aria-busy={estado === 'cargando'}>
      <div ref={container} className="mexico-map" />
      {estado !== 'listo' && <div className="map-feedback" role={estado === 'error' ? 'alert' : 'status'}>
        <p>{estado === 'cargando' ? t('Preparando el mapa de México…', 'Preparing the map of Mexico…') : t(mensaje, 'The map could not be displayed. Check WebGL support in your browser.')}</p>
        {estado === 'error' && <button className="button button-primary" onClick={reintentar}>{t('Volver a intentar', 'Retry')}</button>}
      </div>}
      <MexicoBoundary sesion={sesion} visible={mostrarLimites}/>
      <PredictionMarkers sesion={sesion} visible={!!mostrarPredicciones && !!fechaPrediccion} fecha={fechaPrediccion}
        tipo={tipoPrediccion} estadoFiltro={entidad?.clave} intento={intentoPredicciones} onEstado={onEstadoPredicciones}/>
      {avisoRelieve && <div className="map-base-notice" role="status"><p>{t(avisoRelieve, 'Relief is unavailable. State and municipality boundaries are still available.')}</p><button onClick={reintentarRelieve}>{t('Reintentar relieve', 'Retry relief')}</button></div>}
    </div>
  )
}
