import { lazy, Suspense } from 'react'
import { GlobeControls } from '../componentes/GlobeControls'
import { RegionInfoPanel } from '../componentes/RegionInfoPanel'
import { useGlobeView } from '../hooks/useGlobeView'
import { regionesEstudio } from '../servicios/configuracionMapa'
const MexicoGlobe = lazy(() => import('../componentes/MexicoGlobe').then(module => ({ default: module.MexicoGlobe })))
export function ExplorarPage() {
  const { globeRef, disponible, setDisponible, vista, regionSeleccionada, seleccionarRegion,
    mostrarLimites, setMostrarLimites, zoom, restablecer } = useGlobeView()

  return (
    <section className="page-container">
      <div className="section-heading">
        <div><p className="eyebrow">01 / EXPLORAR</p><h1>México, en perspectiva.</h1></div>
        <span className="chip">CesiumJS · Globo 3D</span>
      </div>
      <p className="page-intro">Recorre el planeta en tres dimensiones, con México como punto de partida. Arrastra para navegar, usa la rueda o los botones para acercarte y vuelve a México en cualquier momento.</p>
      <div className="explorer-grid">
        <div className="explorer-view">
          <div className="map-topline">
            <span className="eyebrow">VISTA GENERAL · MÉXICO</span>
            <label className="toggle-label">
              <input type="checkbox" checked={mostrarLimites} onChange={e => setMostrarLimites(e.target.checked)}/>
              Límites de México · pendientes
            </label>
          </div>
          <Suspense fallback={<div className="globe-stage globe-loading" role="status">Cargando el motor 3D…</div>}>
            <MexicoGlobe ref={globeRef} vista={vista} regiones={regionesEstudio}
              regionSeleccionada={regionSeleccionada} onSeleccionarRegion={seleccionarRegion}
              mostrarLimites={mostrarLimites} onReadyChange={setDisponible}/>
          </Suspense>
          <GlobeControls disabled={!disponible} onZoom={zoom} onReset={restablecer}/>
          <p className="map-description">Mapa base Natural Earth de baja resolución. Sin relieve ni observaciones NISAR. La navegación territorial restringida y los límites oficiales se incorporarán después.</p>
        </div>
        <RegionInfoPanel region={regionesEstudio.find(r => r.id === regionSeleccionada)}/>
      </div>
    </section>
  )
}
