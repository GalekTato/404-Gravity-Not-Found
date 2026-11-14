import type { RegionEstudio, VistaCamara } from '../../../tipos/geografia'
export interface GlobeProps { vista: VistaCamara; regiones: readonly RegionEstudio[]; regionSeleccionada?: string; onSeleccionarRegion: (id: string) => void; mostrarLimites: boolean }
export interface BoundaryProps { visible: boolean; geojsonUrl?: string }
