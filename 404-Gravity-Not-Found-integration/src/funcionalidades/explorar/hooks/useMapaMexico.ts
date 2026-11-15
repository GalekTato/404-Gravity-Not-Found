import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { Map, RasterTileSource } from 'maplibre-gl'
import { crearMapa, teselasRelieve } from '../servicios/mapaMexico'
import type { EstadoCarga } from '../tipos/cartografia'

export interface SesionMapa { map: Map; activa: boolean }
export function useMapaMexico(container: RefObject<HTMLDivElement | null>, onReadyChange: (ready: boolean) => void) {
  const [sesion, setSesion] = useState<SesionMapa>()
  const [estado, setEstado] = useState<EstadoCarga>('cargando')
  const [mensaje, setMensaje] = useState('')
  const [avisoRelieve, setAvisoRelieve] = useState<string>()
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    const node = container.current
    if (!node) return
    let actual: SesionMapa | undefined
    let activa = true
    let observer: ResizeObserver | undefined
    onReadyChange(false)
    function fallo(event?: { error?: Error }) {
      if (!activa) return
      if (import.meta.env.DEV && event?.error) console.error('MapLibre:', event.error)
      setEstado('error')
      setMensaje('No se pudo dibujar el mapa. Comprueba WebGL y la aceleración gráfica de tu navegador.')
      onReadyChange(false)
    }
    try {
      const map = crearMapa(node)
      actual = { map, activa: true }
      const instancia = actual
      map.on('error', event => {
        if (!activa) return
        if ('sourceId' in event && event.sourceId === 'relieve') {
          setAvisoRelieve('El relieve no está disponible. Puedes seguir usando los límites de estados y municipios.')
          return
        }
        fallo({ error: event.error instanceof Error ? event.error : new Error(String(event.error)) })
      })
      map.on('load', () => {
        if (!activa) return
        setSesion(instancia)
        setEstado('listo')
        onReadyChange(true)
      })
      observer = new ResizeObserver(() => { if (instancia.activa) map.resize() })
      observer.observe(node)
    } catch (error) { fallo({ error: error instanceof Error ? error : new Error('No se pudo iniciar MapLibre') }) }
    return () => {
      activa = false
      onReadyChange(false)
      observer?.disconnect()
      if (actual) { actual.activa = false; actual.map.remove() }
      node.replaceChildren()
    }
  }, [container, onReadyChange, intento])
  function reintentar() { setEstado('cargando'); onReadyChange(false); setIntento(value => value + 1) }
  function reintentarRelieve() {
    if (!sesion?.activa) return
    setAvisoRelieve(undefined)
    const source = sesion.map.getSource('relieve') as RasterTileSource | undefined
    source?.setTiles([...teselasRelieve])
  }
  return { sesion, estado, mensaje, reintentar, avisoRelieve, reintentarRelieve }
}
