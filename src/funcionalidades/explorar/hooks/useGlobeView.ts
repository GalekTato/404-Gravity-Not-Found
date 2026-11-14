import { useRef, useState } from 'react'
import { vistaMexico } from '../servicios/configuracionMapa'
import type { GlobeHandle } from '../tipos/explorador'
export function useGlobeView() {
  const globeRef = useRef<GlobeHandle>(null)
  const [disponible, setDisponible] = useState(false)
  const [regionSeleccionada, seleccionarRegion] = useState<string>()
  const [mostrarLimites, setMostrarLimites] = useState(false)
  function zoom(factor: number) { globeRef.current?.zoom(factor) }
  function restablecer() { globeRef.current?.restablecer(); seleccionarRegion(undefined) }
  return { globeRef, disponible, setDisponible, vista: vistaMexico, regionSeleccionada, seleccionarRegion, mostrarLimites, setMostrarLimites, zoom, restablecer }
}
