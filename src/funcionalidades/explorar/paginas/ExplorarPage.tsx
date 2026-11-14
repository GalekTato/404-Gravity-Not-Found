import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { GlobeControls } from '../componentes/GlobeControls'
import { RegionInfoPanel } from '../componentes/RegionInfoPanel'
import { useGeografia, useMunicipios } from '../hooks/useGeografia'
import type { EstadoCapaMunicipal, MapaHandle } from '../tipos/cartografia'

const MexicoMap = lazy(() => import('../componentes/MexicoMap').then(module => ({ default: module.MexicoMap })))

export function ExplorarPage() {
  const { datos, error, reintentar } = useGeografia()
  const mapaRef = useRef<MapaHandle>(null)
  const [disponible, setDisponible] = useState(false)
  const [claveEntidad, setClaveEntidad] = useState<string>()
  const [claveMunicipio, setClaveMunicipio] = useState<string>()
  const [mostrarLimites, setMostrarLimites] = useState(true)
  const [mostrarMunicipios, setMostrarMunicipios] = useState(true)
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
    <section className="explorer-fullscreen" aria-label="Explorador geográfico de México">
      <h1 className="sr-only">Mapa de México</h1>
      <div className="map-canvas-wrapper">
        {datos ? <Suspense fallback={<div className="map-stage map-loading" role="status">Cargando el mapa…</div>}>
          <MexicoMap ref={mapaRef} geografia={datos} entidad={entidad} municipios={municipales.datos}
            municipio={claveMunicipio} onEntidad={seleccionarEntidad} onMunicipio={seleccionarMunicipio}
            mostrarLimites={mostrarLimites} mostrarMunicipios={mostrarMunicipios} onReadyChange={setDisponible}
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
