import type { RegionEstudio, VistaCamara } from '../../../tipos/geografia'
import type { Ref } from 'react'
export interface GlobeHandle {
  zoom: (factor: number) => void
  restablecer: () => void
}
export interface GlobeProps {
  ref?: Ref<GlobeHandle>
  vista: VistaCamara
  regiones: readonly RegionEstudio[]
  regionSeleccionada?: string
  onSeleccionarRegion: (id: string) => void
  mostrarLimites: boolean
  onReadyChange: (ready: boolean) => void
}
export interface BoundaryProps { visible: boolean; geojsonUrl?: string }
