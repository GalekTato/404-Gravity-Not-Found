import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { GlobeControls } from '../componentes/GlobeControls'
import { RegionInfoPanel } from '../componentes/RegionInfoPanel'
import { useGeografia, useMunicipios } from '../hooks/useGeografia'
import type { EstadoCapaMunicipal, EstadoPredicciones, MapaHandle } from '../tipos/cartografia'

const MexicoMap = lazy(() => import('../componentes/MexicoMap').then(module => ({ default: module.MexicoMap })))

function fechaEnDias(dias: number) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

export function ExplorarPage() {
  const { datos, error, reintentar } = useGeografia()
  const mapaRef = useRef<MapaHandle>(null)
  const [disponible, setDisponible] = useState(false)
  const [claveEntidad, setClaveEntidad] = useState<string>()
  const [claveMunicipio, setClaveMunicipio] = useState<string>()
  const [mostrarLimites, setMostrarLimites] = useState(true)
  const [mostrarMunicipios, setMostrarMunicipios] = useState(true)
  const [mostrarPredicciones, setMostrarPredicciones] = useState(true)
  const [fechaPrediccion, setFechaPrediccion] = useState(() => fechaEnDias(1))
  const [estadoPredicciones, setEstadoPredicciones] = useState<EstadoPredicciones>({ estado: 'inactivo' })
  const [intentoPredicciones, setIntentoPredicciones] = useState(0)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [estadoCapaMunicipal, setEstadoCapaMunicipal] = useState<EstadoCapaMunicipal>()
  const entidad = datos?.catalogo.find(item => item.clave === claveEntidad)
  const municipales = useMunicipios(entidad?.clave)
  const dibujandoMunicipios = !!municipales.datos && (estadoCapaMunicipal?.clave !== entidad?.clave || estadoCapaMunicipal?.estado === 'cargando')
  const errorCapaMunicipal = estadoCapaMunicipal?.clave === entidad?.clave ? estadoCapaMunicipal?.mensaje : undefined
  const municipio = municipales.datos?.features.find(item => item.properties.clave === claveMunicipio)
  const seleccionarEntidad = useCallback((clave: string) => { setClaveEntidad(clave || undefined); setClaveMunicipio(undefined) }, [])
  const seleccionarMunicipio = useCallback((clave: string) => {
    if (!clave || clave.startsWith(claveEntidad ?? '-')) setClaveMunicipio(clave || undefined)
  }, [claveEntidad])
  function restablecer() { seleccionarEntidad(''); mapaRef.current?.restablecer() }
  function zoom(delta: number) { mapaRef.current?.zoom(delta) }

  return (
    <section className={`explorer-fullscreen${mostrarPredicciones ? ' con-predicciones' : ''}`} aria-label="Explorador geográfico de México">
      <h1 className="sr-only">Mapa de México</h1>
      <div className="map-canvas-wrapper">
        {datos ? <Suspense fallback={<div className="map-stage map-loading" role="status">Cargando el mapa…</div>}>
          <MexicoMap ref={mapaRef} geografia={datos} entidad={entidad} municipios={municipales.datos}
            municipio={claveMunicipio} onEntidad={seleccionarEntidad} onMunicipio={seleccionarMunicipio}
            mostrarLimites={mostrarLimites} mostrarMunicipios={mostrarMunicipios}
            mostrarPredicciones={mostrarPredicciones} fechaPrediccion={fechaPrediccion}
            intentoPredicciones={intentoPredicciones} estadoPredicciones={estadoPredicciones}
            onEstadoPredicciones={setEstadoPredicciones}
            onReadyChange={setDisponible}
            onEstadoCapaMunicipal={setEstadoCapaMunicipal}/>
        </Suspense> : <div className="map-stage map-loading" role={error ? 'alert' : 'status'}>
          <p>{error ?? 'Cargando las 32 entidades de México…'}</p>
          {error && <button className="button button-primary" onClick={reintentar}>Volver a intentar</button>}
        </div>}
        <GlobeControls disabled={!disponible} onZoom={zoom} onReset={restablecer}/>
      </div>
      <header className="explorer-toolbar">
        <div className="explorer-tools">
          <button className="territory-toggle" aria-expanded={panelAbierto} aria-controls="panel-territorio" onClick={() => setPanelAbierto(value => !value)}>
            {panelAbierto ? 'Cerrar panel' : 'Estados y municipios'} <span aria-hidden="true">{panelAbierto ? '×' : '+'}</span>
          </button>
          <div className="map-layer-toggles">
            <label className="toggle-label"><input type="checkbox" checked={mostrarLimites} onChange={e => setMostrarLimites(e.target.checked)}/> Estados</label>
            <label className="toggle-label"><input type="checkbox" checked={mostrarMunicipios} onChange={e => setMostrarMunicipios(e.target.checked)}/> Municipios</label>
            <label className="toggle-label"><input type="checkbox" checked={mostrarPredicciones} onChange={e => setMostrarPredicciones(e.target.checked)}/> Predicciones</label>
            {mostrarPredicciones && <label className="prediction-date">Fecha
              <input type="date" value={fechaPrediccion} aria-label="Fecha de las predicciones"
                onChange={e => { if (e.target.value) setFechaPrediccion(e.target.value) }}/>
            </label>}
            {mostrarPredicciones && estadoPredicciones.estado === 'cargando'
              && <span className="prediction-status" role="status">Consultando…</span>}
            {mostrarPredicciones && estadoPredicciones.estado === 'error'
              && <button type="button" className="prediction-retry" title={estadoPredicciones.mensaje}
                aria-label={`Reintentar predicciones. ${estadoPredicciones.mensaje}`}
                onClick={() => setIntentoPredicciones(valor => valor + 1)}>Reintentar</button>}
          </div>
        </div>
      </header>
      <div id="panel-territorio" className="explorer-panel" hidden={!panelAbierto}>
        <RegionInfoPanel catalogo={datos?.catalogo ?? []} entidad={entidad} municipios={municipales.datos}
          municipio={municipio} cargando={municipales.cargando || dibujandoMunicipios} dibujando={dibujandoMunicipios}
          error={municipales.error ?? errorCapaMunicipal}
          onEntidad={seleccionarEntidad} onMunicipio={seleccionarMunicipio} onReintentar={municipales.reintentar} onReset={restablecer}/>
        <p className="territory-disclaimer">Áreas geoestadísticas sin valor de límite político-administrativo legal. Sin observaciones NISAR.</p>
      </div>
    </section>
  )
}
