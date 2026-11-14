import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { Viewer } from 'cesium'
import type { VistaCamara } from '../../../tipos/geografia'
import { cargarMapaBase, crearVisor } from '../servicios/cesiumViewer'

export function useCesiumViewer(container: RefObject<HTMLDivElement | null>, vista: VistaCamara, onReadyChange: (ready: boolean) => void) {
  const [viewer, setViewer] = useState<Viewer>()
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [mensaje, setMensaje] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const node = container.current
    if (!node) return
    let active = true
    let visor: Viewer | undefined
    const cleanups: (() => void)[] = []
    onReadyChange(false)
    function fallo(motivo: string) {
      if (!active) return
      setMensaje(motivo)
      setEstado('error')
      onReadyChange(false)
    }
    try {
      visor = crearVisor(node, vista)
      const current = visor
      cleanups.push(current.scene.renderError.addEventListener(() => fallo('El navegador interrumpió la visualización 3D. Comprueba la aceleración gráfica y vuelve a intentarlo.')))
      void cargarMapaBase().then(provider => {
        if (!active || current.isDestroyed()) return
        cleanups.push(provider.errorEvent.addEventListener(() => fallo('No se pudieron cargar las teselas del mapa base. Revisa tu conexión y vuelve a intentarlo.')))
        current.imageryLayers.addImageryProvider(provider)
        current.scene.requestRender()
        setViewer(current)
        setEstado('listo')
        onReadyChange(true)
      }).catch(() => fallo('No se pudo cargar el mapa base local. Comprueba tu conexión o vuelve a intentarlo.'))
    } catch {
      fallo('No se pudo iniciar Cesium. Necesitas un navegador con WebGL y aceleración gráfica habilitada.')
    }
    return () => {
      active = false
      onReadyChange(false)
      cleanups.forEach(remove => remove())
      if (visor && !visor.isDestroyed()) visor.destroy()
      // Limpia también nodos de una construcción de WebGL fallida.
      node.replaceChildren()
    }
  }, [container, vista, onReadyChange, intento])

  function reintentar() {
    setEstado('cargando')
    onReadyChange(false)
    setIntento(value => value + 1)
  }
  return { viewer, estado, mensaje, reintentar }
}
