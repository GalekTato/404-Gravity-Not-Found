import type { BoundaryProps } from '../tipos/explorador'
export function MexicoBoundary({ visible, geojsonUrl }: BoundaryProps) {
  if (!visible) return null
  return <p className="boundary-notice" role="status">{geojsonUrl ? 'Fuente definida; integración cartográfica pendiente.' : 'Límites reales pendientes de incorporar con GeoJSON.'}</p>
}
