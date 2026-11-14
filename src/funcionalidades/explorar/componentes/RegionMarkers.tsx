import type { RegionEstudio } from '../../../tipos/geografia'
import { useEffect } from 'react'
import { Cartesian3, Color, Entity, ScreenSpaceEventHandler, ScreenSpaceEventType } from 'cesium'
import type { Viewer } from 'cesium'
export function RegionMarkers({ viewer, regiones, seleccionada, onSeleccionar }: { viewer?: Viewer; regiones: readonly RegionEstudio[]; seleccionada?: string; onSeleccionar: (id: string) => void }) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !regiones.length) return
    const entities = regiones.map(region => viewer.entities.add({
      id: `region-${region.id}`,
      name: region.nombre,
      position: Cartesian3.fromDegrees(region.centro.longitud, region.centro.latitud),
      point: { pixelSize: region.id === seleccionada ? 14 : 10, color: Color.fromCssColorString('#a2e8cc'), outlineColor: Color.BLACK, outlineWidth: 2, disableDepthTestDistance: Infinity },
    }))
    const handler = new ScreenSpaceEventHandler(viewer.canvas)
    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked: unknown = viewer.scene.pick(event.position)
      if (typeof picked !== 'object' || picked === null || !('id' in picked) || !(picked.id instanceof Entity)) return
      const index = entities.indexOf(picked.id)
      if (index >= 0) onSeleccionar(regiones[index].id)
    }, ScreenSpaceEventType.LEFT_CLICK)
    viewer.scene.requestRender()
    return () => {
      handler.destroy()
      if (!viewer.isDestroyed()) { entities.forEach(entity => viewer.entities.remove(entity)); viewer.scene.requestRender() }
    }
  }, [viewer, regiones, seleccionada, onSeleccionar])
  return <div className="region-list" aria-label="Regiones de estudio">{regiones.map(region => <button className="chip" key={region.id} onClick={() => onSeleccionar(region.id)}>{region.nombre}</button>)}</div>
}
