import { useEffect } from 'react'
import type { SesionMapa } from '../hooks/useMapaMexico'
export function MexicoBoundary({ visible, sesion }: { visible: boolean; sesion?: SesionMapa }) {
  useEffect(() => {
    if (!sesion?.activa) return
    const { map } = sesion
    function aplicar() {
      const valor = visible ? 'visible' : 'none'
      if (sesion?.activa && map.getLayer('estados-linea') && map.getLayoutProperty('estados-linea', 'visibility') !== valor) {
        map.setLayoutProperty('estados-linea', 'visibility', valor)
      }
    }
    aplicar()
    map.on('styledata', aplicar)
    return () => { map.off('styledata', aplicar) }
  }, [sesion, visible])
  return null
}
