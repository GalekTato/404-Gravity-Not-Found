import { MexicoGlobe } from '../componentes/MexicoGlobe'
import { GlobeControls } from '../componentes/GlobeControls'
import { RegionInfoPanel } from '../componentes/RegionInfoPanel'
import { useGlobeView } from '../hooks/useGlobeView'
import { regionesEstudio } from '../servicios/configuracionMapa'
export function ExplorarPage() {
  const globe = useGlobeView()
  return <section className="page-container"><div className="section-heading"><div><p className="eyebrow">01 / EXPLORAR</p><h1>México, en perspectiva.</h1></div><span className="chip">Vista conceptual</span></div><p className="page-intro">Un primer acercamiento al territorio. El globo geoespacial y las regiones de estudio se incorporarán en una próxima etapa.</p><div className="explorer-grid"><div className="explorer-view"><div className="map-topline"><span className="eyebrow">VISTA GENERAL · MÉXICO</span><label className="toggle-label"><input type="checkbox" checked={globe.mostrarLimites} onChange={e => globe.setMostrarLimites(e.target.checked)}/> Límites de México</label></div><MexicoGlobe vista={globe.vista} regiones={regionesEstudio} regionSeleccionada={globe.regionSeleccionada} onSeleccionarRegion={globe.seleccionarRegion} mostrarLimites={globe.mostrarLimites}/><GlobeControls onZoom={globe.zoom} onReset={globe.restablecer}/></div><RegionInfoPanel region={regionesEstudio.find(r => r.id === globe.regionSeleccionada)}/></div></section>
}
