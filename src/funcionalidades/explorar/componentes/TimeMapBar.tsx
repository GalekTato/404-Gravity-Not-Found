import { useEffect, useMemo, useState } from 'react'
import {
  COLORES_DESASTRE,
  ETIQUETAS_DESASTRE,
  TIPOS_DESASTRE,
  obtenerTimeMap,
  type MarcaTimeMap,
  type TipoDesastre,
} from '../servicios/predicciones'

export interface TimeMapBarProps {
  periodo: string
  tipoFiltro?: TipoDesastre
  onChangePeriodo: (periodo: string) => void
  onChangeTipoFiltro: (tipo?: TipoDesastre) => void
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatearPeriodo(period: string): string {
  const [anio, mesStr] = period.split('-')
  const mesIdx = Number(mesStr) - 1
  if (!anio || Number.isNaN(mesIdx) || mesIdx < 0 || mesIdx > 11) return period
  return `${MESES_CORTOS[mesIdx]} ${anio}`
}

export function TimeMapBar({
  periodo,
  tipoFiltro,
  onChangePeriodo,
  onChangeTipoFiltro,
}: TimeMapBarProps) {
  const [estadoCarga, setEstadoCarga] = useState<{
    filtro?: TipoDesastre
    marcas: MarcaTimeMap[]
    totalEventos: number
    estadosCubiertos: number
  }>()
  const [reproduciendo, setReproduciendo] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    obtenerTimeMap(tipoFiltro, controller.signal)
      .then(resumen => {
        if (controller.signal.aborted) return
        setEstadoCarga({
          filtro: tipoFiltro,
          marcas: resumen.markers,
          totalEventos: resumen.total_events,
          estadosCubiertos: resumen.states_covered,
        })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setEstadoCarga(prev => prev ?? { filtro: tipoFiltro, marcas: [], totalEventos: 0, estadosCubiertos: 32 })
        }
      })
    return () => controller.abort()
  }, [tipoFiltro])

  const cargando = !estadoCarga || estadoCarga.filtro !== tipoFiltro
  const marcas = useMemo(() => estadoCarga?.marcas ?? [], [estadoCarga])
  const totalEventos = estadoCarga?.totalEventos ?? 0
  const estadosCubiertos = estadoCarga?.estadosCubiertos ?? 32

  const periodoMes = periodo.slice(0, 7)
  const indiceActual = useMemo(() => {
    if (marcas.length === 0) return -1
    const exacto = marcas.findIndex(item => item.period === periodoMes)
    return exacto >= 0 ? exacto : marcas.length - 1
  }, [marcas, periodoMes])

  const marcaActiva = indiceActual >= 0 ? marcas[indiceActual] : undefined

  useEffect(() => {
    if (!reproduciendo || marcas.length <= 1) return
    const timer = window.setInterval(() => {
      const siguiente = indiceActual + 1 < marcas.length ? indiceActual + 1 : 0
      const destino = marcas[siguiente]
      if (destino) onChangePeriodo(destino.period)
    }, 1800)
    return () => window.clearInterval(timer)
  }, [reproduciendo, indiceActual, marcas, onChangePeriodo])

  function irAnterior() {
    if (marcas.length === 0) return
    const prev = indiceActual > 0 ? indiceActual - 1 : marcas.length - 1
    const destino = marcas[prev]
    if (destino) onChangePeriodo(destino.period)
  }

  function irSiguiente() {
    if (marcas.length === 0) return
    const next = indiceActual + 1 < marcas.length ? indiceActual + 1 : 0
    const destino = marcas[next]
    if (destino) onChangePeriodo(destino.period)
  }

  const aniosVisibles = useMemo(() => {
    const vistos = new Set<string>()
    const salida: { anio: string; index: number }[] = []
    marcas.forEach((m, idx) => {
      const anio = m.period.slice(0, 4)
      if (!vistos.has(anio) && Number(anio) % 2 === 0) {
        vistos.add(anio)
        salida.push({ anio, index: idx })
      }
    })
    return salida
  }, [marcas])

  return (
    <div className="timemap-dock" role="region" aria-label="Línea de tiempo TimeMap de eventos y pronósticos">
      <div className="timemap-header">
        <div className="timemap-controls">
          <button
            type="button"
            className="timemap-btn"
            onClick={irAnterior}
            disabled={marcas.length === 0}
            aria-label="Evento anterior en la línea de tiempo"
            title="Evento anterior"
          >
            ◀
          </button>
          <button
            type="button"
            className={`timemap-btn timemap-btn-play${reproduciendo ? ' active' : ''}`}
            onClick={() => setReproduciendo(valor => !valor)}
            disabled={marcas.length <= 1}
            aria-label={reproduciendo ? 'Pausar línea de tiempo' : 'Reproducir línea de tiempo'}
          >
            {reproduciendo ? '⏸ Pausar' : '▶ TimeMap'}
          </button>
          <button
            type="button"
            className="timemap-btn"
            onClick={irSiguiente}
            disabled={marcas.length === 0}
            aria-label="Evento siguiente en la línea de tiempo"
            title="Evento siguiente"
          >
            ▶
          </button>
        </div>

        <div className="timemap-summary" aria-live="polite">
          {marcaActiva ? (
            <>
              <span className="timemap-period-badge">{formatearPeriodo(marcaActiva.period)}</span>
              <span className="timemap-headline" title={marcaActiva.headline}>
                {marcaActiva.headline}
              </span>
              <span className="timemap-metrics">
                {marcaActiva.total} eventos · {marcaActiva.states_affected} estados · Sev. máx {marcaActiva.max_severity.toFixed(1)}
              </span>
            </>
          ) : (
            <span className="timemap-metrics">
              {cargando ? 'Cargando catálogo histórico TimeMap…' : `${totalEventos} eventos en ${estadosCubiertos} estados`}
            </span>
          )}
        </div>

        <div className="timemap-filters" role="group" aria-label="Filtrar eventos por tipo de fenómeno">
          <button
            type="button"
            className={`timemap-chip${!tipoFiltro ? ' active' : ''}`}
            onClick={() => onChangeTipoFiltro(undefined)}
          >
            Todos ({totalEventos})
          </button>
          {TIPOS_DESASTRE.map(tipo => (
            <button
              key={tipo}
              type="button"
              className={`timemap-chip${tipoFiltro === tipo ? ' active' : ''}`}
              onClick={() => onChangeTipoFiltro(tipoFiltro === tipo ? undefined : tipo)}
            >
              <span className="legend-dot" style={{ backgroundColor: COLORES_DESASTRE[tipo] }} />
              {ETIQUETAS_DESASTRE[tipo]}
            </button>
          ))}
        </div>
      </div>

      <div className="timemap-track-wrapper">
        <div className="timemap-track" role="listbox" aria-label="Hitos temporales con eventos registrados">
          {marcas.map((marca, idx) => {
            const activo = idx === indiceActual
            const altura = Math.max(22, Math.min(100, Math.round((marca.max_severity / 10) * 100)))
            const color = COLORES_DESASTRE[marca.dominant_type] ?? '#a2e8cc'
            return (
              <button
                key={marca.period}
                type="button"
                role="option"
                aria-selected={activo}
                className={`timemap-marker${activo ? ' active' : ''}`}
                onClick={() => {
                  setReproduciendo(false)
                  onChangePeriodo(marca.period)
                }}
                title={`${formatearPeriodo(marca.period)} · ${marca.headline} (${marca.total} eventos en ${marca.states_affected} estados)`}
                aria-label={`${formatearPeriodo(marca.period)}: ${marca.headline}, ${marca.total} eventos`}
              >
                <span
                  className="timemap-marker-bar"
                  style={{
                    height: `${altura}%`,
                    backgroundColor: color,
                  }}
                />
              </button>
            )
          })}
        </div>
        {marcas.length > 0 && (
          <div className="timemap-years" aria-hidden="true">
            {aniosVisibles.map(({ anio, index }) => (
              <span
                key={anio}
                className="timemap-year-label"
                style={{ left: `${(index / Math.max(1, marcas.length - 1)) * 100}%` }}
              >
                {anio}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
