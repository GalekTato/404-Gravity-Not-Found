import { useEffect, useRef, useState } from 'react'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import { COLORES_DESASTRE, TIPOS_DESASTRE, obtenerTimeMap } from '../servicios/predicciones'
import type { MarcaTimeMap, TipoDesastre } from '../servicios/predicciones'
import { HazardIcon } from './HazardIcon'
import { startTimeMapLoop, type AudioPlayback } from '../../../utils/disasterSound'

export function TimeMapBar({ periodo, tipoFiltro, estadoFiltro, estadoNombre, pausado = false, onChangePeriodo, onChangeTipoFiltro }: {
  periodo: string
  tipoFiltro?: TipoDesastre
  estadoFiltro?: string
  estadoNombre?: string
  pausado?: boolean
  onChangePeriodo: (periodo: string) => void
  onChangeTipoFiltro: (tipo?: TipoDesastre) => void
}) {
  const { t, idioma } = useIdioma()
  const clave = `${tipoFiltro ?? ''}:${estadoFiltro ?? ''}`
  const [respuesta, setRespuesta] = useState<{ clave: string; marcas: MarcaTimeMap[]; totalEventos?: number; statesCovered?: number; error?: string }>()
  const [intento, setIntento] = useState(0)
  const [reproducir, setReproducir] = useState(false)
  const [reproduciendoAudio, setReproduciendoAudio] = useState(false)
  const [indiceAudio, setIndiceAudio] = useState<number>()
  const [notaActiva, setNotaActiva] = useState('')
  const [errorAudio, setErrorAudio] = useState('')
  const audioRef = useRef<AudioPlayback | null>(null)

  useEffect(() => () => {
    audioRef.current?.stop()
    audioRef.current = null
  }, [])

  useEffect(() => {
    // Stop active timeline audio cleanly when the dataset filter changes or the explorer tab is paused.
    audioRef.current?.stop()
  }, [clave, pausado])

  useEffect(() => {
    if (pausado) return
    const controller = new AbortController()
    obtenerTimeMap(tipoFiltro, controller.signal, estadoFiltro)
      .then(datos => {
        if (!controller.signal.aborted) {
          setRespuesta({
            clave,
            marcas: datos.markers,
            totalEventos: datos.total_events,
            statesCovered: datos.states_covered,
          })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setRespuesta({ clave, marcas: [], error: 'connection' })
      })
    return () => controller.abort()
  }, [clave, tipoFiltro, estadoFiltro, intento, pausado])

  const actual = respuesta?.clave === clave ? respuesta : undefined
  const marcas = actual?.marcas
  const indice = marcas?.findIndex(item => item.period === periodo) ?? -1
  const marca = indice >= 0 ? marcas?.[indice] : undefined

  useEffect(() => {
    if (pausado) return
    if (marcas?.length && !marcas.some(item => item.period === periodo)) onChangePeriodo(marcas[marcas.length - 1]!.period)
  }, [marcas, periodo, onChangePeriodo, pausado])

  useEffect(() => {
    if (pausado || !reproducir || !marcas || marcas.length < 2) return
    const timer = window.setInterval(() => onChangePeriodo(marcas[(indice + 1) % marcas.length]!.period), 2200)
    return () => window.clearInterval(timer)
  }, [reproducir, marcas, indice, onChangePeriodo, pausado])

  const fecha = (value: string) => new Date(`${value}-15T12:00:00`).toLocaleDateString(idioma === 'es' ? 'es-MX' : 'en-US', { month: 'short', year: 'numeric' })
  const etiquetas = { sismo: t('Sismos', 'Earthquakes'), huracan: t('Huracanes', 'Hurricanes'), sequia: t('Sequía', 'Drought'), inundacion: t('Inundaciones', 'Floods'), incendio: t('Incendios', 'Fires') }

  function mover(delta: number) {
    if (marcas?.length) {
      setReproducir(false)
      onChangePeriodo(marcas[(Math.max(0, indice) + delta + marcas.length) % marcas.length]!.period)
    }
  }

  function alternarSonificacion() {
    if (audioRef.current) {
      audioRef.current.stop()
      audioRef.current = null
      setReproduciendoAudio(false)
      setIndiceAudio(undefined)
      setNotaActiva('')
      return
    }
    if (!marcas?.length) return
    setErrorAudio('')
    try {
      const playback = startTimeMapLoop(marcas, {
        idioma,
        onStep: (idx, notaNombre) => {
          setIndiceAudio(idx)
          setNotaActiva(notaNombre)
        },
        onStop: () => {
          audioRef.current = null
          setReproduciendoAudio(false)
          setIndiceAudio(undefined)
          setNotaActiva('')
        },
        onError: () => {
          setErrorAudio(t('No se pudo reproducir el audio. Revisa los permisos del navegador.', 'Audio playback failed. Check browser sound settings.'))
        },
      })
      audioRef.current = playback
      setReproduciendoAudio(true)
    } catch (error) {
      setErrorAudio(error instanceof Error ? error.message : t('Audio no disponible.', 'Audio unavailable.'))
    }
  }

  const territorioBadge = estadoNombre
    ? `${estadoNombre}`
    : t(`Nacional (${actual?.statesCovered ?? 32} estados)`, `National (${actual?.statesCovered ?? 32} states)`)

  return <section className="timeline" aria-label={t('Línea del tiempo', 'Timeline')}>
    <div className="timeline-heading">
      <div>
        <span className="section-kicker">TimeMap · {territorioBadge}</span>
        <h2>{marca ? fecha(marca.period) : t('Registro histórico', 'Historical record')}</h2>
      </div>
      <div className="timeline-playback">
        <button type="button" disabled={!marcas?.length} onClick={() => mover(-1)} aria-label={t('Mes anterior', 'Previous month')}>←</button>
        <button type="button" disabled={!marcas || marcas.length < 2} aria-pressed={reproducir} onClick={() => setReproducir(value => !value)}>{reproducir ? t('Pausar', 'Pause') : t('Reproducir', 'Play')}</button>
        <button type="button" disabled={!marcas?.length} onClick={() => mover(1)} aria-label={t('Mes siguiente', 'Next month')}>→</button>
        <button
          type="button"
          className="timeline-audio-btn"
          disabled={!marcas?.length}
          aria-pressed={reproduciendoAudio}
          onClick={alternarSonificacion}
          title={t('Sonificar serie histórica en círculo de quintas', 'Sonify historical series in the circle of fifths')}
        >
          {reproduciendoAudio
            ? `■ ${t('Detener audio', 'Stop audio')}${notaActiva ? ` · ${notaActiva}` : ''}`
            : `♫ ${t('Escuchar quintas', 'Listen (5ths)')}`}
        </button>
      </div>
      <label className="period-picker"><span>{t('Ir al mes', 'Go to month')}</span><select value={marca?.period ?? ''} disabled={!marcas?.length} onChange={event => { setReproducir(false); onChangePeriodo(event.target.value) }}>
        {!marca && <option value="">—</option>}{marcas?.map(item => <option key={item.period} value={item.period}>{fecha(item.period)} ({item.total})</option>)}
      </select></label>
    </div>
    {errorAudio && <p role="status" className="timeline-audio-note">{errorAudio}</p>}
    {actual?.error ? <p role="alert">{t('No se pudo cargar el catálogo.', 'The catalog could not be loaded.')} <button onClick={() => { setRespuesta(undefined); setIntento(value => value + 1) }}>{t('Reintentar', 'Retry')}</button></p>
      : !actual ? <p role="status">{t('Consultando historial…', 'Loading history…')}</p>
        : !marcas?.length ? <p role="status">{t('No hay registros para estos filtros.', 'No records match these filters.')}</p>
          : <div className="timeline-slider">
            <div className="timeline-histogram" aria-hidden="true">
              {marcas.map((item, index) => (
                <span
                  key={item.period}
                  className={index === indice ? 'current' : index === indiceAudio ? 'sounding' : ''}
                  style={{ height: `${Math.max(8, item.max_severity * 3)}px`, background: COLORES_DESASTRE[item.dominant_type] }}
                />
              ))}
            </div>
            <label htmlFor="timeline-range" className="slider-label">{t('Mes de la línea del tiempo', 'Timeline month')}</label>
            <input id="timeline-range" type="range" min="0" max={marcas.length - 1} step="1" value={Math.max(0, indice)} aria-valuetext={marca ? fecha(marca.period) : ''}
              onChange={event => { setReproducir(false); onChangePeriodo(marcas[Number(event.target.value)]!.period) }}/>
            <div className="timeline-extents">
              <span>{fecha(marcas[0]!.period)}</span>
              <span>
                {marca?.total ?? 0} {t(marca?.total === 1 ? 'registro este mes' : 'registros este mes', marca?.total === 1 ? 'record this month' : 'records this month')}
                {typeof actual.totalEventos === 'number' ? ` · ${actual.totalEventos} ${t('en serie filtrada', 'in filtered series')}` : ''}
              </span>
              <span>{fecha(marcas[marcas.length - 1]!.period)}</span>
            </div>
          </div>}
    <div className="hazard-filters" role="group" aria-label={t('Tipo de fenómeno', 'Hazard type')}>
      <button aria-pressed={!tipoFiltro} onClick={() => onChangeTipoFiltro(undefined)}>{t('Todos', 'All')}</button>
      {TIPOS_DESASTRE.map(tipo => <button key={tipo} aria-pressed={tipoFiltro === tipo} onClick={() => onChangeTipoFiltro(tipoFiltro === tipo ? undefined : tipo)}><HazardIcon tipo={tipo}/>{etiquetas[tipo]}</button>)}
    </div>
  </section>
}
