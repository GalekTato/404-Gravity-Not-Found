import type { GlobeProps } from '../tipos/explorador'
import { useImperativeHandle, useRef } from 'react'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { useCesiumViewer } from '../hooks/useCesiumViewer'
import { alturaMaxima, alturaMinima, destinoCamara } from '../servicios/cesiumViewer'
import { MexicoBoundary } from './MexicoBoundary'
import { RegionMarkers } from './RegionMarkers'
export function MexicoGlobe({ ref, vista, regiones, regionSeleccionada, onSeleccionarRegion, mostrarLimites, onReadyChange }: GlobeProps) {
  const container = useRef<HTMLDivElement>(null)
  const { viewer, estado, mensaje, reintentar } = useCesiumViewer(container, vista, onReadyChange)
  useImperativeHandle(ref, () => ({
    zoom(factor) {
      if (!viewer || viewer.isDestroyed() || estado !== 'listo') return
      viewer.camera.cancelFlight()
      const altura = viewer.camera.positionCartographic.height
      const destino = Math.min(alturaMaxima, Math.max(alturaMinima, altura * factor))
      viewer.camera.zoomIn(altura - destino)
      viewer.scene.requestRender()
    },
    restablecer() {
      if (!viewer || viewer.isDestroyed() || estado !== 'listo') return
      viewer.camera.cancelFlight()
      viewer.camera.flyTo({ ...destinoCamara(vista), duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1.2 })
    },
  }), [viewer, estado, vista])
  return <div className="globe-stage cesium-stage" aria-busy={estado === 'cargando'}>
    <div ref={container} className="cesium-container" />
    {estado !== 'listo' && <div className="globe-feedback" role={estado === 'error' ? 'alert' : 'status'}><p>{estado === 'cargando' ? 'Preparando el globo terrestre…' : mensaje}</p>{estado === 'error' && <button className="button button-primary" onClick={reintentar}>Volver a intentar</button>}</div>}
    <MexicoBoundary visible={mostrarLimites}/>
    <RegionMarkers viewer={viewer} regiones={regiones} seleccionada={regionSeleccionada} onSeleccionar={onSeleccionarRegion}/>
  </div>
}
