import { useState } from 'react'
import { vistaMexico } from '../servicios/configuracionMapa'
export function useGlobeView() {
  const [vista, setVista] = useState(vistaMexico)
  const [regionSeleccionada, seleccionarRegion] = useState<string>()
  const [mostrarLimites, setMostrarLimites] = useState(false)
  function zoom(factor: number) { setVista(prev => ({ ...prev, altura: Math.min(16_000_000, Math.max(4_000_000, prev.altura * factor)) })) }
  function restablecer() { setVista(vistaMexico); seleccionarRegion(undefined) }
  return { vista, regionSeleccionada, seleccionarRegion, mostrarLimites, setMostrarLimites, zoom, restablecer }
}
