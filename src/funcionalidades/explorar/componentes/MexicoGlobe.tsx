import type { GlobeProps } from '../tipos/explorador'
import { EarthIllustration } from './EarthIllustration'
import { MexicoBoundary } from './MexicoBoundary'
import { RegionMarkers } from './RegionMarkers'
export function MexicoGlobe({ vista, regiones, onSeleccionarRegion, mostrarLimites }: GlobeProps) {
  return <div className="globe-stage"><EarthIllustration escala={8_000_000 / vista.altura} /><MexicoBoundary visible={mostrarLimites} /><RegionMarkers regiones={regiones} onSeleccionar={onSeleccionarRegion} /><span className="illustration-caption">REPRESENTACIÓN ILUSTRATIVA · MOTOR 3D PENDIENTE</span></div>
}
