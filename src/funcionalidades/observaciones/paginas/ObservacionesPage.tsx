import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import { useGeografia } from '../../explorar/hooks/useGeografia'
import { obtenerPredicciones, obtenerTimeMap, etiquetaAmenaza, etiquetaEvidencia, TIPOS_DESASTRE } from '../../explorar/servicios/predicciones'
import { useFiltrosCatalogo } from '../../explorar/hooks/useFiltrosCatalogo'
import type { ColeccionPredicciones } from '../../explorar/servicios/predicciones'
import { exportarExcel } from '../../explorar/servicios/exportar'
import { nombreIndicador } from '../../explorar/servicios/textosIndicadores'

export function ObservacionesPage() {
  const { t, idioma } = useIdioma()
  const { periodo, estado, tipo, actualizar: filtrar, setPeriodo, consulta } = useFiltrosCatalogo()
  const { datos: geografia } = useGeografia()
  const clave = `${periodo}:${estado}:${tipo ?? ''}`
  const [resultado, setResultado] = useState<{ clave: string; datos?: ColeccionPredicciones; error?: boolean }>()
  const [intento, setIntento] = useState(0)
  const [exportando, setExportando] = useState(false)
  const [errorExcel, setErrorExcel] = useState(false)
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
  const registros = actual?.datos?.features ?? []
  async function descargar() {
    setExportando(true); setErrorExcel(false)
    try { await exportarExcel(periodo, tipo, estado || undefined) } catch { setErrorExcel(true) } finally { setExportando(false) }
  }
  return <section className="content-page observations-page">
    <div className="page-heading"><span className="section-kicker">02 / {t('Catálogo', 'Catalog')}</span><h1>{t('Observaciones', 'Observations')}</h1><p>{t('Consulta los registros detrás del mapa. Cada fila conserva su fecha, territorio, fuente y tipo de evidencia.', 'Inspect the records behind the map. Every row retains its date, area, source and evidence type.')}</p></div>
    <div className="catalog-filters">
      <label>{t('Mes', 'Month')}<input type="month" value={periodo} onChange={event => filtrar('period', event.target.value)}/></label>
      <label>{t('Estado', 'State')}<select value={estado} onChange={event => filtrar('state', event.target.value)}><option value="">{t('Todo México', 'All Mexico')}</option>{geografia?.catalogo.map(item => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}</select></label>
      <label>{t('Fenómeno', 'Hazard')}<select value={tipo ?? ''} onChange={event => filtrar('type', event.target.value)}><option value="">{t('Todos', 'All')}</option>{TIPOS_DESASTRE.map(item => <option key={item} value={item}>{etiquetaAmenaza(item, idioma)}</option>)}</select></label>
      <button className="export-button" disabled={!periodo || exportando || !actual?.datos} onClick={() => void descargar()}>{exportando ? t('Exportando…', 'Exporting…') : t('↓ Exportar Excel', '↓ Export Excel')}</button>
    </div>
    {errorExcel && <p role="alert">{t('No se pudo exportar. Reintenta.', 'Export failed. Please retry.')}</p>}
    {!actual ? <p className="catalog-message" role="status">{t('Consultando catálogo…', 'Loading catalog…')}</p> : actual.error ? <div className="catalog-message" role="alert"><p>{t('No pudimos consultar el catálogo.', 'We could not load the catalog.')}</p><button className="quiet-button" onClick={() => setIntento(value => value + 1)}>{t('Reintentar', 'Retry')}</button></div> : <>
      <div className="catalog-summary"><span>{registros.length} {t(registros.length === 1 ? 'registro' : 'registros', registros.length === 1 ? 'record' : 'records')} · {periodo || '—'}</span><Link to={`/explorar?${consulta}`}>{t('Abrir mapa', 'Open map')} ↗</Link></div>
      {registros.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Registros del catálogo', 'Catalog records')}><table><thead><tr><th>{t('Fecha', 'Date')}</th><th>{t('Estado', 'State')}</th><th>{t('Fenómeno / registro', 'Hazard / record')}</th><th>{t('Severidad', 'Severity')}</th><th>{t('Evidencia', 'Evidence')}</th><th>{t('Fuente', 'Source')}</th></tr></thead><tbody>{registros.map(({ properties: item }) => <tr key={item.id}><td>{item.date}</td><td>{item.state_name ?? 'México'}</td><td><strong>{etiquetaAmenaza(item.type, idioma)}</strong><span>{nombreIndicador(item.name, idioma)}</span></td><td>{item.severity.toFixed(1)}<small>/10</small></td><td><span className={`evidence-tag evidence-${item.evidence}`}>{etiquetaEvidencia(item.evidence, idioma)}</span></td><td>{item.source ?? '—'}</td></tr>)}</tbody></table></div>
        : <div className="catalog-message"><h2>{t('Sin registros', 'No records')}</h2><p>{t('Prueba otro mes o amplía los filtros. La ausencia de registros no demuestra ausencia de fenómenos.', 'Try another month or broaden the filters. Missing records do not demonstrate the absence of hazards.')}</p></div>}
    </>}
    <p className="evidence-note">{t('El catálogo reúne observaciones e indicadores derivados. No ofrece imágenes SAR ni alertas oficiales.', 'The catalog contains observations and derived indicators. It does not provide SAR imagery or official alerts.')} <Link to="/learn">{t('Cómo interpretar la evidencia', 'How to interpret evidence')} ↗</Link></p>
  </section>
}
