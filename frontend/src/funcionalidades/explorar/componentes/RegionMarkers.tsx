import { useEffect } from 'react'
import { Marker } from 'maplibre-gl'
import type { RegionEstudio } from '../../../tipos/geografia'
import type { SesionMapa } from '../hooks/useMapaMexico'

// Adaptador preparado para un futuro catálogo científico. No inventa regiones.
export function RegionMarkers({ sesion, regiones, onSeleccionar }: { sesion?: SesionMapa; regiones: readonly RegionEstudio[]; onSeleccionar: (id: string) => void }) {
  useEffect(() => {
    if (!sesion?.activa) return
    const markers = regiones.map(region => {
      const button = document.createElement('button')
      button.className = 'chip'
      button.textContent = region.nombre
      button.addEventListener('click', () => onSeleccionar(region.id))
      return new Marker({ element: button }).setLngLat([region.centro.longitud, region.centro.latitud]).addTo(sesion.map)
    })
    return () => markers.forEach(marker => marker.remove())
  }, [sesion, regiones, onSeleccionar])
  return null
}
