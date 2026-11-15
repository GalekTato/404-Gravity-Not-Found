import type { Map } from 'maplibre-gl'

// setData() confirma el envío al worker; las teselas visibles se terminan en los frames siguientes.
export function esperarMunicipiosDibujados(map: Map, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Carga cancelada', 'AbortError')); return }
    const timeout = window.setTimeout(() => finalizar(new Error('La cartografía municipal tardó demasiado en dibujarse.')), 30_000)
    function finalizar(error?: Error) {
      window.clearTimeout(timeout)
      map.off('render', revisar)
      signal.removeEventListener('abort', cancelar)
      if (error) reject(error)
      else resolve()
    }
    function revisar() {
      if (map.isSourceLoaded('municipios')) finalizar()
    }
    function cancelar() { finalizar(new DOMException('Carga cancelada', 'AbortError')) }
    map.on('render', revisar)
    signal.addEventListener('abort', cancelar, { once: true })
    map.triggerRepaint()
  })
}
