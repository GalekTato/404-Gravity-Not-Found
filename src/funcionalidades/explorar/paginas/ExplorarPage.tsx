import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { SelectorIdioma } from '../../../configuracion/idioma'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import { proyecto } from '../../../configuracion/proyecto'
import { MiniTutorial } from '../../../componentes/ui/MiniTutorial'
import { Icon } from '../../../componentes/ui/Icon'
import { GlobeControls } from '../componentes/GlobeControls'
import { TimeMapBar } from '../componentes/TimeMapBar'
import { RegionInfoPanel } from '../componentes/RegionInfoPanel'
import { useGeografia, useMunicipios } from '../hooks/useGeografia'
import { useFiltrosCatalogo } from '../hooks/useFiltrosCatalogo'
import { exportarExcel } from '../servicios/exportar'
import type { EstadoCapaMunicipal, EstadoPredicciones, MapaHandle } from '../tipos/cartografia'

const MexicoMap = lazy(() => import('../componentes/MexicoMap').then(module => ({ default: module.MexicoMap })))

export function ExplorarPage() {
  const { t } = useIdioma()
  const { datos, error, reintentar } = useGeografia()
  const mapaRef = useRef<MapaHandle>(null)
  const herramientasRef = useRef<HTMLDetailsElement>(null)
  const [disponible, setDisponible] = useState(false)
  const { periodo: fechaPrediccion, estado: claveEntidad, tipo: tipoPrediccion, setPeriodo: setFechaPrediccion,
    setEstado: setClaveEntidad, setTipo: setTipoPrediccion, consulta } = useFiltrosCatalogo()
  const [claveMunicipio, setClaveMunicipio] = useState<string>()
  const [mostrarLimites, setMostrarLimites] = useState(true)
  const [mostrarMunicipios, setMostrarMunicipios] = useState(true)
  const [estadoPredicciones, setEstadoPredicciones] = useState<EstadoPredicciones>({ estado: 'inactivo' })
  const [intentoPredicciones, setIntentoPredicciones] = useState(0)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [estadoCapaMunicipal, setEstadoCapaMunicipal] = useState<EstadoCapaMunicipal>()
  const [exportando, setExportando] = useState(false)
  const [errorExportacion, setErrorExportacion] = useState(false)
  const entidad = datos?.catalogo.find(item => item.clave === claveEntidad)
  const municipales = useMunicipios(entidad?.clave)
  const dibujando = !!municipales.datos && (estadoCapaMunicipal?.clave !== entidad?.clave || estadoCapaMunicipal?.estado === 'cargando')
  const municipio = municipales.datos?.features.find(item => item.properties.clave === claveMunicipio)
  const seleccionarEntidad = useCallback((clave: string) => { setClaveEntidad(clave || undefined); setClaveMunicipio(undefined) }, [setClaveEntidad])
  const seleccionarMunicipio = useCallback((clave: string) => { if (!clave || clave.startsWith(claveEntidad ?? '-')) setClaveMunicipio(clave || undefined) }, [claveEntidad])
  useEffect(() => {
    function cerrar(event: globalThis.PointerEvent | KeyboardEvent) {
      const menu = herramientasRef.current
      if (!menu?.open) return
      if (event instanceof KeyboardEvent) {
        if (document.querySelector('dialog[open]')) return
        if (event.key === 'Escape') { menu.open = false; menu.querySelector('summary')?.focus() }
      } else if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false
    }
    document.addEventListener('pointerdown', cerrar)
    document.addEventListener('keydown', cerrar)
    return () => { document.removeEventListener('pointerdown', cerrar); document.removeEventListener('keydown', cerrar) }
  }, [])
  function reflejo(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--glass-x', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--glass-y', `${event.clientY - rect.top}px`)
  }
  function restablecer() { seleccionarEntidad(''); mapaRef.current?.restablecer() }
  async function descargar() {
    setExportando(true); setErrorExportacion(false)
    try { await exportarExcel(fechaPrediccion, tipoPrediccion, claveEntidad) } catch { setErrorExportacion(true) } finally { setExportando(false) }
  }
  return <section className="explorer-workspace" aria-label={t('Explorador de México', 'Mexico explorer')}>
    <header className="map-liquid-toolbar" onPointerMove={reflejo}>
      <Link to="/" className="project-brand"><img src={proyecto.logoEquipo} alt={proyecto.equipo} width="36" height="36"/><h1>{proyecto.nombre}</h1></Link>
      <label className="state-filter"><span>{t('Territorio', 'Area')}</span><select aria-label={t('Filtrar por estado', 'Filter by state')} value={claveEntidad ?? ''} disabled={!datos} onChange={event => seleccionarEntidad(event.target.value)}><option value="">{t('Todo México', 'All Mexico')}</option>{datos?.catalogo.map(item => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}</select></label>
      <div className="map-header-actions"><MiniTutorial/><SelectorIdioma/>
        <details className="map-tools-menu" ref={herramientasRef}>
          <summary aria-label={t('Herramientas del mapa', 'Map tools')}><Icon name="menu" size={19}/><span>{t('Herramientas', 'Tools')}</span></summary>
          <div className="map-tools-content">
            <div className="mobile-map-guide"><MiniTutorial/></div>
            <button className="quiet-button" aria-expanded={panelAbierto} aria-controls="panel-territorio" onClick={() => { setPanelAbierto(value => !value); if (herramientasRef.current) herramientasRef.current.open = false }}>{panelAbierto ? t('Cerrar detalle', 'Close details') : t('Municipios y capas', 'Municipalities & layers')}</button>
            <Link className="quiet-button" to={`/observar?${consulta}`}>{t('Ver registros', 'View records')}</Link>
            <button className="export-button" disabled={!fechaPrediccion || exportando} onClick={() => void descargar()}>{exportando ? t('Exportando…', 'Exporting…') : t('↓ Exportar Excel', '↓ Export Excel')}</button>
          </div>
        </details>
      </div>
    </header>
    <div className={`explorer-map-body${panelAbierto ? ' has-panel' : ''}`}>
      {panelAbierto && <aside id="panel-territorio" className="map-sidebar">
        <div className="map-layer-toggles"><label><input type="checkbox" checked={mostrarLimites} onChange={event => setMostrarLimites(event.target.checked)}/>{t('Estados', 'States')}</label><label><input type="checkbox" checked={mostrarMunicipios} onChange={event => setMostrarMunicipios(event.target.checked)}/>{t('Municipios', 'Municipalities')}</label></div>
        <RegionInfoPanel catalogo={datos?.catalogo ?? []} entidad={entidad} municipios={municipales.datos} municipio={municipio} cargando={municipales.cargando || dibujando} dibujando={dibujando}
          error={municipales.error ?? (estadoCapaMunicipal?.clave === claveEntidad ? estadoCapaMunicipal?.mensaje : undefined)} onEntidad={seleccionarEntidad} onMunicipio={seleccionarMunicipio} onReintentar={municipales.reintentar} onReset={restablecer}/>
      </aside>}
      <div className="map-canvas-wrapper">
        <Suspense fallback={<div className="map-loading" role="status">{t('Cargando mapa…', 'Loading map…')}</div>}><MexicoMap ref={mapaRef} geografia={datos} entidad={entidad} municipios={municipales.datos} municipio={claveMunicipio}
          mostrarLimites={mostrarLimites} mostrarMunicipios={mostrarMunicipios} mostrarPredicciones fechaPrediccion={fechaPrediccion || undefined} tipoPrediccion={tipoPrediccion} intentoPredicciones={intentoPredicciones}
          onEstadoPredicciones={setEstadoPredicciones} onEntidad={seleccionarEntidad} onMunicipio={seleccionarMunicipio} onReadyChange={setDisponible} onEstadoCapaMunicipal={setEstadoCapaMunicipal}/></Suspense>
        <GlobeControls disabled={!disponible} onZoom={delta => mapaRef.current?.zoom(delta)} onReset={restablecer}/>
      </div>
    </div>
    <div className="map-data-status" role="status"><span>{entidad?.nombre ?? t('Todo México', 'All Mexico')} · {estadoPredicciones.estado === 'listo' ? `${estadoPredicciones.total} ${t(estadoPredicciones.total === 1 ? 'registro' : 'registros', estadoPredicciones.total === 1 ? 'record' : 'records')}` : estadoPredicciones.estado === 'error' ? t('Error de conexión', 'Connection error') : t('Consultando…', 'Loading…')}
      {estadoPredicciones.estado === 'error' && <button onClick={() => setIntentoPredicciones(value => value + 1)}>{t('Reintentar', 'Retry')}</button>}</span><span>{t('Indicadores, no alertas oficiales', 'Indicators, not official alerts')}</span>
      {!datos && <span role={error ? 'alert' : 'status'}>{error ? <button onClick={reintentar}>{t('Reintentar cartografía', 'Retry boundaries')}</button> : t('Cargando cartografía…', 'Loading boundaries…')}</span>}
      {errorExportacion && <span role="alert">{t('No se pudo exportar. Reintenta.', 'Export failed. Please retry.')}</span>}</div>
    <TimeMapBar periodo={fechaPrediccion} tipoFiltro={tipoPrediccion} estadoFiltro={claveEntidad} onChangePeriodo={setFechaPrediccion} onChangeTipoFiltro={setTipoPrediccion}/>
  </section>
}
