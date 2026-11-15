import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import { useGeografia } from '../../explorar/hooks/useGeografia'
import {
  COLORES_DESASTRE,
  obtenerMetricasModelo,
  obtenerPredicciones,
  obtenerTimeMap,
  etiquetaAmenaza,
  etiquetaEvidencia,
  TIPOS_DESASTRE,
} from '../../explorar/servicios/predicciones'
import { useFiltrosCatalogo } from '../../explorar/hooks/useFiltrosCatalogo'
import type { ColeccionPredicciones, ResumenMetricasModelo, TipoDesastre } from '../../explorar/servicios/predicciones'
import { exportarExcel } from '../../explorar/servicios/exportar'
import { nombreIndicador } from '../../explorar/servicios/textosIndicadores'

function formatoBytes(bytes: number): string {
  if (!bytes) return '0 MB'
  const gb = bytes / (1024 ** 3)
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  return `${(bytes / (1024 ** 2)).toFixed(1)} MB`
}

export function ObservacionesPage() {
  const { t, idioma } = useIdioma()
  const { periodo, estado, tipo, actualizar: filtrar, setPeriodo, consulta } = useFiltrosCatalogo()
  const { datos: geografia } = useGeografia()
  const clave = `${periodo}:${estado}:${tipo ?? ''}`
  const [resultado, setResultado] = useState<{ clave: string; datos?: ColeccionPredicciones; error?: boolean }>()
  const [metricas, setMetricas] = useState<ResumenMetricasModelo>()
  const [intento, setIntento] = useState(0)
  const [exportando, setExportando] = useState(false)
  const [errorExcel, setErrorExcel] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    obtenerMetricasModelo(controller.signal).then(data => {
      if (!controller.signal.aborted) setMetricas(data)
    }).catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (periodo) return
    const controller = new AbortController()
    obtenerTimeMap(tipo, controller.signal, estado || undefined).then(resumen => {
      const ultimo = resumen.markers.at(-1)?.period
      if (!controller.signal.aborted && ultimo) setPeriodo(ultimo)
      else if (!controller.signal.aborted) setResultado({ clave, datos: { type: 'FeatureCollection', features: [] } })
    }).catch(() => { if (!controller.signal.aborted) setResultado({ clave, error: true }) })
    return () => controller.abort()
  }, [periodo, estado, tipo, clave, setPeriodo, intento])

  useEffect(() => {
    if (!periodo) return
    const controller = new AbortController()
    obtenerPredicciones(periodo, controller.signal, tipo, estado || undefined)
      .then(datos => { if (!controller.signal.aborted) setResultado({ clave, datos }) })
      .catch(() => { if (!controller.signal.aborted) setResultado({ clave, error: true }) })
    return () => controller.abort()
  }, [clave, periodo, estado, tipo, intento])

  const actual = resultado?.clave === clave ? resultado : undefined
  const registros = useMemo(() => actual?.datos?.features ?? [], [actual])

  const interpretacion = useMemo(() => {
    if (!registros.length) return undefined
    const conteoTipo: Partial<Record<TipoDesastre, number>> = {}
    const conteoEvidencia = { observed: 0, supervised: 0, proxy: 0, no_confirmable: 0 }
    let sumaSev = 0
    const estadosUnicos = new Set<string>()
    for (const item of registros) {
      const p = item.properties
      conteoTipo[p.type] = (conteoTipo[p.type] ?? 0) + 1
      const ev = p.evidence ?? 'no_confirmable'
      conteoEvidencia[ev] += 1
      sumaSev += p.severity
      if (p.state_name) estadosUnicos.add(p.state_name)
    }
    const dominante = (Object.entries(conteoTipo).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'inundacion') as TipoDesastre
    const sevPromedio = sumaSev / registros.length
    const confirmadosRatio = ((conteoEvidencia.observed + conteoEvidencia.supervised) / registros.length) * 100
    return { dominante, sevPromedio, confirmadosRatio, estados: estadosUnicos.size, conteoEvidencia }
  }, [registros])

  async function descargar() {
    setExportando(true); setErrorExcel(false)
    try { await exportarExcel(periodo, tipo, estado || undefined) } catch { setErrorExcel(true) } finally { setExportando(false) }
  }

  const sensoresInfo = [
    { key: 'gpm', nombre: 'GPM IMERG v07B', rol: t('Precipitación diaria y acumulados 3d/7d en tierra y Pacífico/Golfo', 'Daily & 3d/7d accumulated precipitation across land and oceanic basins') },
    { key: 'gldas', nombre: 'GLDAS Noah 0.25°', rol: t('Humedad superficial del suelo, evapotranspiración y vientos', 'Soil moisture anomaly, evapotranspiration and wind forcing') },
    { key: 'modis', nombre: 'MODIS MOD11C3', rol: t('Temperatura superficial terrestre (LST) diurna y anomalía térmica', 'Daytime Land Surface Temperature (LST) and thermal anomaly') },
    { key: 'firms', nombre: 'NASA FIRMS VIIRS + EONET', rol: t('Focos activos de calor e incendios forestales verificados por estado', 'Active fire hotspots & verified wildfires mapped to state polygons') },
    { key: 'alos', nombre: 'ALOS PALSAR L-Band', rol: t('Pares SAR polarimétricos (co_pol / cross_pol) históricos en México', 'Historical polarimetric SAR pairs (co_pol / cross_pol) in Mexico') },
    { key: 'nisar', nombre: 'NISAR L2 GCOV', rol: t('Retrodispersión polarimétrica de nueva generación preparada para monitoreo', 'Next-gen polarimetric backscatter prepared for hazard monitoring') },
  ] as const

  const summary = metricas?.catalog_summary

  return (
    <section className="content-page observations-page">
      <div className="page-heading">
        <span className="section-kicker">02 / {t('Observaciones e Interpretación', 'Observations & Interpretation')}</span>
        <h1>{t('Observaciones', 'Observations')}</h1>
        <p>
          {t(
            'Consulta los registros detrás del mapa e interpreta el comportamiento físico por sensor, evidencia y cobertura territorial (32 entidades federativas + Aguas Nacionales / ZEE de 200 mn).',
            'Inspect the records behind the map and interpret physical behavior by sensor, evidence level, and territorial coverage (32 federal entities + Mexican 200 nm EEZ national waters).',
          )}
        </p>
      </div>

      {summary && (
        <section className="insight-grid" aria-label={t('Interpretación global del catálogo PostgreSQL', 'Global PostgreSQL catalog interpretation')}>
          <article className="insight-card">
            <span className="section-kicker">{t('Catálogo histórico PostgreSQL', 'Historical PostgreSQL catalog')}</span>
            <strong>{summary.total_events.toLocaleString()}</strong>
            <p>{summary.total_periods} {t('meses', 'months')} · {summary.states_covered} {t('estados cubiertos', 'states covered')}</p>
          </article>
          <article className="insight-card">
            <span className="section-kicker">{t('Territorio continental + ZEE (200 mn)', 'Land + Maritime EEZ (200 nm)')}</span>
            <strong>{summary.coastal_and_eez_adjacent_events.toLocaleString()}</strong>
            <p>
              {t(
                `Eventos en litorales / Aguas Nacionales vs. ${summary.inland_continental_events.toLocaleString()} en interior continental.`,
                `Events in coastal / National Waters basins vs. ${summary.inland_continental_events.toLocaleString()} inland continental.`,
              )}
            </p>
          </article>
          <article className="insight-card">
            <span className="section-kicker">{t('Distribución de evidencia', 'Evidence breakdown')}</span>
            <strong>{(summary.by_evidence.observed ?? 0) + (summary.by_evidence.supervised ?? 0)}</strong>
            <p>
              {t(
                `${summary.by_evidence.observed ?? 0} observados · ${summary.by_evidence.supervised ?? 0} supervisados · ${summary.by_evidence.proxy ?? 0} proxies.`,
                `${summary.by_evidence.observed ?? 0} observed · ${summary.by_evidence.supervised ?? 0} supervised · ${summary.by_evidence.proxy ?? 0} proxies.`,
              )}
            </p>
          </article>
          <article className="insight-card">
            <span className="section-kicker">{t('Base científica multisensor', 'Multisensor scientific archive')}</span>
            <strong>{Object.values(metricas.sensors).reduce((acc, s) => acc + s.count, 0)}</strong>
            <p>
              {t(
                'Archivos satelitales (GPM, GLDAS, MODIS, FIRMS, ALOS, NISAR) calibrados con USGS e IBTrACS.',
                'Satellite archives (GPM, GLDAS, MODIS, FIRMS, ALOS, NISAR) calibrated against USGS & IBTrACS.',
              )}
            </p>
          </article>
        </section>
      )}

      <div className="catalog-filters">
        <label>{t('Mes', 'Month')}<input type="month" value={periodo} onChange={event => filtrar('period', event.target.value)} /></label>
        <label>{t('Estado', 'State')}<select value={estado} onChange={event => filtrar('state', event.target.value)}><option value="">{t('Todo México', 'All Mexico')}</option>{geografia?.catalogo.map(item => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}</select></label>
        <label>{t('Fenómeno', 'Hazard')}<select value={tipo ?? ''} onChange={event => filtrar('type', event.target.value)}><option value="">{t('Todos', 'All')}</option>{TIPOS_DESASTRE.map(item => <option key={item} value={item}>{etiquetaAmenaza(item, idioma)}</option>)}</select></label>
        <button className="export-button" disabled={!periodo || exportando || !actual?.datos} onClick={() => void descargar()}>{exportando ? t('Exportando…', 'Exporting…') : t('↓ Exportar Excel', '↓ Export Excel')}</button>
      </div>
      {errorExcel && <p role="alert">{t('No se pudo exportar. Reintenta.', 'Export failed. Please retry.')}</p>}

      {interpretacion && (
        <div className="period-interpretation-banner" role="region" aria-label={t('Interpretación del periodo seleccionado', 'Interpretation of selected period')}>
          <div>
            <span className="section-kicker">{t('Lectura física de la selección', 'Physical reading of selection')}</span>
            <p>
              {t(
                `En ${periodo || 'el periodo activo'} domina la señal de ${etiquetaAmenaza(interpretacion.dominante, 'es').toLowerCase()} (severidad media ${interpretacion.sevPromedio.toFixed(1)}/10 en ${interpretacion.estados} entidades). El ${interpretacion.confirmadosRatio.toFixed(0)}% de los registros proviene de observación directa o ensamble supervisado calibrado.`,
                `In ${periodo || 'the active period'}, ${etiquetaAmenaza(interpretacion.dominante, 'en').toLowerCase()} signals dominate (mean severity ${interpretacion.sevPromedio.toFixed(1)}/10 across ${interpretacion.estados} states). ${interpretacion.confirmadosRatio.toFixed(0)}% of records come from direct observation or calibrated supervised ensembles.`,
              )}
            </p>
          </div>
          <span className="dominance-dot" style={{ background: COLORES_DESASTRE[interpretacion.dominante] }} aria-hidden="true" />
        </div>
      )}

      {!actual ? <p className="catalog-message" role="status">{t('Consultando catálogo…', 'Loading catalog…')}</p> : actual.error ? <div className="catalog-message" role="alert"><p>{t('No pudimos consultar el catálogo.', 'We could not load the catalog.')}</p><button className="quiet-button" onClick={() => setIntento(value => value + 1)}>{t('Reintentar', 'Retry')}</button></div> : <>
        <div className="catalog-summary">
          <span>{registros.length} {t(registros.length === 1 ? 'registro' : 'registros', registros.length === 1 ? 'record' : 'records')} · {periodo || '—'}</span>
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
                  <th>{t('Prob. / Score', 'Prob. / Score')}</th>
                  <th>{t('Evidencia', 'Evidence')}</th>
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
                    <td>
                      {typeof item.probability === 'number' ? `${(item.probability * 100).toFixed(0)}%` : '—'}
                      {item.score !== null && item.score !== undefined ? <small> ({item.score.toFixed(2)})</small> : null}
                    </td>
                    <td><span className={`evidence-tag evidence-${item.evidence}`}>{etiquetaEvidencia(item.evidence, idioma)}</span></td>
                    <td>{item.source ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="catalog-message">
            <h2>{t('Sin registros', 'No records')}</h2>
            <p>{t('Prueba otro mes o amplía los filtros. La ausencia de registros no demuestra ausencia de fenómenos.', 'Try another month or broaden the filters. Missing records do not demonstrate the absence of hazards.')}</p>
          </div>
        )}
      </>}

      {metricas && (
        <section className="sensor-interpretation-section" aria-label={t('Interpretación de datos por sensor', 'Sensor-level data interpretation')}>
          <span className="section-kicker">{t('Fuentes procesadas en el pipeline', 'Pipeline processed sources')}</span>
          <h2>{t('Cómo interpretamos cada fuente satelital y geofísica', 'How we interpret each satellite & geophysical source')}</h2>
          <div className="sensor-cards-grid">
            {sensoresInfo.map(sensor => {
              const stats = metricas.sensors[sensor.key]
              return (
                <article key={sensor.key} className="sensor-card">
                  <div className="sensor-card-top">
                    <h3>{sensor.nombre}</h3>
                    {stats && <span className="evidence-tag">{stats.count} {t('archivos', 'files')} · {formatoBytes(stats.total_bytes)}</span>}
                  </div>
                  <p>{sensor.rol}</p>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <p className="evidence-note">
        {t('El catálogo reúne observaciones e indicadores derivados. No ofrece imágenes SAR ni alertas oficiales.', 'The catalog contains observations and derived indicators. It does not provide SAR imagery or official alerts.')}{' '}
        <Link to="/learn">{t('Explorar modelos de minería y cómo interpretar la evidencia', 'Explore data-mining models and evidence guide')} ↗</Link>
      </p>
    </section>
  )
}
