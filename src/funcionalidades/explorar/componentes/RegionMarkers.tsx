import type { RegionEstudio } from '../../../tipos/geografia'
export function RegionMarkers({ regiones, onSeleccionar }: { regiones: readonly RegionEstudio[]; onSeleccionar: (id: string) => void }) {
  return <div className="region-list" aria-label="Regiones de estudio">{regiones.map(region => <button className="chip" key={region.id} onClick={() => onSeleccionar(region.id)}>{region.nombre}</button>)}</div>
}
