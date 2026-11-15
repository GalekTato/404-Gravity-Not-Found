import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import { useGeografia } from '../../explorar/hooks/useGeografia'
import {
  COLORES_DESASTRE,
  obtenerPredicciones,
  obtenerTimeMap,
  etiquetaAmenaza,
  etiquetaEvidencia,
  TIPOS_DESASTRE,
} from '../../explorar/servicios/predicciones'
import { useFiltrosCatalogo } from '../../explorar/hooks/useFiltrosCatalogo'
import type { ColeccionPredicciones, MarcaTimeMap, TipoDesastre } from '../../explorar/servicios/predicciones'
import { exportarExcel } from '../../explorar/servicios/exportar'
import { nombreIndicador } from '../../explorar/servicios/textosIndicadores'

const NOMBRES_MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

const NOMBRES_MESES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

export function ObservacionesPage() {
  const { t, idioma } = useIdioma()
  const { periodo, estado, tipo, actualizar: filtrar, setPeriodo, consulta } = useFiltrosCatalogo()
  const { datos: geografia } = useGeografia()
  const clave = `${periodo}:${estado}:${tipo ?? ''}`
  const [resultado, setResultado] = useState<{ clave: string; datos?: ColeccionPredicciones; error?: boolean }>()
  const [marcas, setMarcas] = useState<MarcaTimeMap[]>([])
  const [vistaDatos, setVistaDatos] = useState<'todos' | 'predicciones' | 'observados'>('todos')
  const [intento, setIntento] = useState(0)
  const [exportando, setExportando] = useState(false)
  const [errorExcel, setErrorExcel] = useState(false)
  const inicializadoPeriodo = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    obtenerTimeMap(undefined, controller.signal)
      .then(resumen => {
        if (controller.signal.aborted) return
        setMarcas(resumen.markers)
        if (!inicializadoPeriodo.current && !periodo) {
          inicializadoPeriodo.current = true
          const defecto = resumen.markers.find(m => m.period === '2026-11')?.period
            ?? resumen.markers.at(-1)?.period
          if (defecto) setPeriodo(defecto)
        } else if (periodo) {
          inicializadoPeriodo.current = true
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [periodo, setPeriodo])

  useEffect(() => {
    if (!periodo) return
    const controller = new AbortController()
    obtenerPredicciones(periodo, controller.signal, tipo, estado || undefined)
      .then(datos => { if (!controller.signal.aborted) setResultado({ clave, datos }) })
      .catch(() => { if (!controller.signal.aborted) setResultado({ clave, error: true }) })
    return () => controller.abort()
  }, [clave, periodo, estado, tipo, intento])

  const aniosDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const m of marcas) set.add(m.period.slice(0, 4))
    if (periodo) set.add(periodo.slice(0, 4))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [marcas, periodo])

  const anioActivo = periodo ? periodo.slice(0, 4) : (aniosDisponibles[0] ?? '2027')
  const mesActivo = periodo ? periodo.slice(5, 7) : '01'

  const mesesDelAnio = useMemo(() => {
    const meses = new Set<string>()
    for (const m of marcas) {
      if (m.period.startsWith(`${anioActivo}-`)) meses.add(m.period.slice(5, 7))
    }
    if (!meses.size) {
      for (let i = 1; i <= 12; i += 1) meses.add(String(i).padStart(2, '0'))
    }
    return Array.from(meses).sort()
  }, [marcas, anioActivo])

  function cambiarAnio(nuevoAnio: string) {
    const mesesDisponibles = marcas
      .filter(m => m.period.startsWith(`${nuevoAnio}-`))
      .map(m => m.period.slice(5, 7))
    const nuevoMes = mesesDisponibles.includes(mesActivo)
      ? mesActivo
      : (mesesDisponibles[0] ?? mesActivo)
    setPeriodo(`${nuevoAnio}-${nuevoMes}`)
  }

  function cambiarMes(nuevoMes: string) {
    setPeriodo(`${anioActivo}-${nuevoMes}`)
  }

  const actual = resultado?.clave === clave ? resultado : undefined
  const todosRegistros = useMemo(() => actual?.datos?.features ?? [], [actual])

  const prediccionesDelMes = useMemo(
    () => todosRegistros
      .filter(f => !f.properties.observed)
      .sort((a, b) => (b.properties.probability ?? 0) - (a.properties.probability ?? 0) || b.properties.severity - a.properties.severity),
    [todosRegistros],
  )

  const observadosDelMes = useMemo(
    () => todosRegistros.filter(f => Boolean(f.properties.observed)),
    [todosRegistros],
  )

  const registros = useMemo(() => {
    if (vistaDatos === 'predicciones') return prediccionesDelMes
    if (vistaDatos === 'observados') return observadosDelMes
    return todosRegistros
  }, [todosRegistros, prediccionesDelMes, observadosDelMes, vistaDatos])

  const interpretacion = useMemo(() => {
    if (!todosRegistros.length) return undefined
    const conteoTipo: Partial<Record<TipoDesastre, number>> = {}
    let sumaSev = 0
    const estadosUnicos = new Set<string>()
    for (const item of todosRegistros) {
      const p = item.properties
      conteoTipo[p.type] = (conteoTipo[p.type] ?? 0) + 1
      sumaSev += p.severity
      if (p.state_name) estadosUnicos.add(p.state_name)
    }
    const dominante = (Object.entries(conteoTipo).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'inundacion') as TipoDesastre
    const sevPromedio = sumaSev / todosRegistros.length
    return { dominante, sevPromedio, estados: estadosUnicos.size }
  }, [todosRegistros])

  async function descargar() {
    setExportando(true); setErrorExcel(false)
    try { await exportarExcel(periodo, tipo, estado || undefined) } catch { setErrorExcel(true) } finally { setExportando(false) }
  }

  const nombresMeses = idioma === 'es' ? NOMBRES_MESES_ES : NOMBRES_MESES_EN
  const esPronostico2027 = periodo.startsWith('2027-')

  return (
    <section className="content-page observations-page">
      <div className="page-heading">
        <span className="section-kicker">02 / {t('Observaciones y Predicciones', 'Observations & Forecasts')}</span>
        <h1>{t('Observaciones y Pronósticos', 'Observations & Forecasts')}</h1>
        <p>
          {t(
            'Explora tanto los registros observados como las predicciones mensuales calibradas por entidad federativa — incluyendo los pronósticos para los 12 meses de 2027.',
            'Explore both historical observed records and calibrated state-level monthly forecasts — including projections for all 12 months of 2027.',
          )}
        </p>
      </div>

      <div className="period-shortcuts" role="group" aria-label={t('Accesos rápidos de periodo', 'Quick period shortcuts')}>
        <button
          type="button"
          className={`quiet-button${esPronostico2027 ? ' is-active-shortcut' : ''}`}
          onClick={() => setPeriodo('2027-01')}
        >
          {t('Predicciones 2027 (Ene–Dic)', '2027 Forecasts (Jan–Dec)')}
        </button>
        <button
          type="button"
          className={`quiet-button${periodo === '2026-11' ? ' is-active-shortcut' : ''}`}
          onClick={() => setPeriodo('2026-11')}
        >
          {t('Noviembre 2026', 'November 2026')}
        </button>
        <button
          type="button"
          className={`quiet-button${periodo === '2027-08' ? ' is-active-shortcut' : ''}`}
          onClick={() => setPeriodo('2027-08')}
        >
          {t('Temporada lluvias 2027 (Ago)', '2027 Rainy Season (Aug)')}
        </button>
      </div>

      <div className="catalog-filters">
        <label>
          {t('Año', 'Year')}
          <select aria-label={t('Año', 'Year')} value={anioActivo} onChange={event => cambiarAnio(event.target.value)}>
            {aniosDisponibles.map(anio => (
              <option key={anio} value={anio}>
                {anio}{anio === '2027' ? ` (${t('Pronóstico', 'Forecast')})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Mes', 'Month')}
          <select aria-label={t('Mes', 'Month')} value={mesActivo} onChange={event => cambiarMes(event.target.value)}>
            {mesesDelAnio.map(mm => {
              const nombre = nombresMeses[Number.parseInt(mm, 10) - 1] ?? mm
              return <option key={mm} value={mm}>{mm} · {nombre}</option>
            })}
          </select>
        </label>
        <label>
          {t('Estado', 'State')}
          <select value={estado} onChange={event => filtrar('state', event.target.value)}>
            <option value="">{t('Todo México', 'All Mexico')}</option>
            {geografia?.catalogo.map(item => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}
          </select>
        </label>
        <label>
          {t('Fenómeno', 'Hazard')}
          <select value={tipo ?? ''} onChange={event => filtrar('type', event.target.value)}>
            <option value="">{t('Todos', 'All')}</option>
            {TIPOS_DESASTRE.map(item => <option key={item} value={item}>{etiquetaAmenaza(item, idioma)}</option>)}
          </select>
        </label>
        <button className="export-button" disabled={!periodo || exportando || !actual?.datos} onClick={() => void descargar()}>
          {exportando ? t('Exportando…', 'Exporting…') : t('↓ Exportar Excel', '↓ Export Excel')}
        </button>
      </div>

      <div className="view-toggle-bar" role="group" aria-label={t('Filtrar por tipo de registro', 'Filter by record source')}>
        <button type="button" aria-pressed={vistaDatos === 'todos'} onClick={() => setVistaDatos('todos')}>
          {t('Todos', 'All')} ({todosRegistros.length})
        </button>
        <button type="button" aria-pressed={vistaDatos === 'predicciones'} onClick={() => setVistaDatos('predicciones')}>
          {t('Predicciones del modelo', 'Model predictions')} ({prediccionesDelMes.length})
        </button>
        <button type="button" aria-pressed={vistaDatos === 'observados'} onClick={() => setVistaDatos('observados')}>
          {t('Eventos observados', 'Observed events')} ({observadosDelMes.length})
        </button>
      </div>

      {errorExcel && <p role="alert">{t('No se pudo exportar. Reintenta.', 'Export failed. Please retry.')}</p>}

      {interpretacion && (
        <div className="period-interpretation-banner" role="region" aria-label={t('Lectura del periodo seleccionado', 'Interpretation of selected period')}>
          <div>
            <span className="section-kicker">
              {esPronostico2027 ? t('Proyección del modelo · Año 2027', 'Model projection · Year 2027') : t('Resumen del periodo seleccionado', 'Selected period summary')}
            </span>
            <p>
              {t(
                `Para ${periodo || 'el periodo activo'} destacan ${prediccionesDelMes.length} predicciones del modelo y ${observadosDelMes.length} registros observados en ${interpretacion.estados} entidades (señal principal: ${etiquetaAmenaza(interpretacion.dominante, 'es').toLowerCase()}, severidad media ${interpretacion.sevPromedio.toFixed(1)}/10).`,
                `For ${periodo || 'the active period'}, there are ${prediccionesDelMes.length} model forecasts and ${observadosDelMes.length} observed events across ${interpretacion.estados} states (main signal: ${etiquetaAmenaza(interpretacion.dominante, 'en').toLowerCase()}, mean severity ${interpretacion.sevPromedio.toFixed(1)}/10).`,
              )}
            </p>
          </div>
          <span className="dominance-dot" style={{ background: COLORES_DESASTRE[interpretacion.dominante] }} aria-hidden="true" />
        </div>
      )}

      {prediccionesDelMes.length > 0 && vistaDatos !== 'observados' && (
        <section className="predictions-highlight" aria-label={t('Predicciones del modelo para este mes', 'Model predictions for this month')}>
          <div className="predictions-highlight-header">
            <h2>{esPronostico2027 ? t(`Predicciones para ${periodo}`, `Forecasts for ${periodo}`) : t(`Predicciones del modelo · ${periodo}`, `Model predictions · ${periodo}`)}</h2>
            <Link to={`/explorar?${consulta}`}>{t('Ver todas en el mapa', 'Inspect all on map')} ↗</Link>
          </div>
          <div className="prediction-cards-grid">
            {prediccionesDelMes.slice(0, 6).map(({ properties: item, geometry }) => (
              <article key={item.id} className="prediction-explain-card">
                <div className="prediction-card-top">
                  <span style={{ color: COLORES_DESASTRE[item.type] }}>{etiquetaAmenaza(item.type, idioma)}</span>
                  <span className={`evidence-tag evidence-${item.evidence}`}>{etiquetaEvidencia(item.evidence, idioma)}</span>
                </div>
                <h3>{item.state_name ?? 'México'}</h3>
                <p className="prediction-card-title">{nombreIndicador(item.name, idioma)}</p>
                <dl className="prediction-card-stats">
                  <div>
                    <dt>{t('Probabilidad', 'Probability')}</dt>
                    <dd>{typeof item.probability === 'number' ? `${(item.probability * 100).toFixed(0)}%` : '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('Severidad', 'Severity')}</dt>
                    <dd>{item.severity.toFixed(1)}/10</dd>
                  </div>
                  <div>
                    <dt>{t('Radio', 'Radius')}</dt>
                    <dd>{item.radius_km} km</dd>
                  </div>
                </dl>
                <Link
                  className="text-link"
                  to={`/explorar?period=${item.month ?? item.date.slice(0, 7)}${item.state_clave ? `&state=${item.state_clave}` : ''}&type=${item.type}`}
                >
                  {t('Ubicar en el mapa', 'Locate on map')} ({geometry.coordinates[1].toFixed(1)}°, {geometry.coordinates[0].toFixed(1)}°) ↗
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {!actual ? <p className="catalog-message" role="status">{t('Consultando catálogo…', 'Loading catalog…')}</p> : actual.error ? <div className="catalog-message" role="alert"><p>{t('No pudimos consultar el catálogo.', 'We could not load the catalog.')}</p><button className="quiet-button" onClick={() => setIntento(value => value + 1)}>{t('Reintentar', 'Retry')}</button></div> : <>
        <div className="catalog-summary">
          <span>{registros.length} {t(registros.length === 1 ? 'registro mostrado' : 'registros mostrados', registros.length === 1 ? 'record shown' : 'records shown')} · {periodo || '—'}</span>
          <Link to={`/explorar?${consulta}`}>{t('Abrir mapa', 'Open map')} ↗</Link>
        </div>
        {registros.length ? (
          <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Registros del catálogo', 'Catalog records')}>
            <table>
              <thead>
                <tr>
                  <th>{t('Fecha', 'Date')}</th>
                  <th>{t('Estado', 'State')}</th>
                  <th>{t('Fenómeno / registro', 'Hazard / record')}</th>
                  <th>{t('Severidad', 'Severity')}</th>
                  <th>{t('Probabilidad', 'Probability')}</th>
                  <th>{t('Tipo', 'Type')}</th>
                  <th>{t('Fuente', 'Source')}</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(({ properties: item }) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{item.state_name ?? 'México'}</td>
                    <td><strong>{etiquetaAmenaza(item.type, idioma)}</strong><span>{nombreIndicador(item.name, idioma)}</span></td>
                    <td>{item.severity.toFixed(1)}<small>/10</small></td>
                    <td>{typeof item.probability === 'number' ? `${(item.probability * 100).toFixed(0)}%` : '—'}</td>
                    <td><span className={`evidence-tag evidence-${item.evidence}`}>{etiquetaEvidencia(item.evidence, idioma)}</span></td>
                    <td>{item.source ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="catalog-message">
            <h2>{t('Sin registros en esta vista', 'No records in this view')}</h2>
            <p>{t('Prueba cambiando el filtro a "Todos", o selecciona otro año, mes o estado.', 'Try switching the filter to "All", or pick another year, month, or state.')}</p>
          </div>
        )}
      </>}

      <p className="evidence-note">
        {t('Las predicciones representan estimaciones estadísticas y no sustituyen alertas oficiales de Protección Civil.', 'Forecasts are statistical estimates and do not replace official Civil Protection alerts.')}{' '}
        <Link to="/learn">{t('Cómo funciona TerraSync', 'How TerraSync works')} ↗</Link>
      </p>
    </section>
  )
}
