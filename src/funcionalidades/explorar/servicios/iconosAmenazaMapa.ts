import type { Map } from 'maplibre-gl'
import { ICONOS_AMENAZA } from './iconosAmenaza'
import { COLORES_DESASTRE, TIPOS_DESASTRE } from './predicciones'

export function registrarIconosAmenaza(map: Map) {
  for (const tipo of TIPOS_DESASTRE) {
    const id = `amenaza-${tipo}`
    if (map.hasImage(id)) continue
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudieron preparar los iconos del mapa.')
    context.scale(2, 2)
    context.translate(4, 4)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    const paths = ICONOS_AMENAZA[tipo].map(path => new Path2D(path))
    // Dark outline keeps each glyph readable over relief and state boundaries.
    context.strokeStyle = '#101f29'
    context.lineWidth = 5
    for (const path of paths) context.stroke(path)
    context.strokeStyle = COLORES_DESASTRE[tipo]
    context.lineWidth = 2.5
    for (const path of paths) context.stroke(path)
    map.addImage(id, context.getImageData(0, 0, 64, 64), { pixelRatio: 2 })
  }
}
