import type { RegionEstudio } from '../../../tipos/geografia'
export function RegionInfoPanel({ region }: { region?: RegionEstudio }) {
  return <aside className="panel"><p className="eyebrow">REGIONES DE ESTUDIO</p><h2>{region?.nombre ?? 'El territorio es el punto de partida.'}</h2><p>{region?.descripcion ?? 'Aquí encontrarás las regiones de estudio y su contexto cuando se incorpore el catálogo científico.'}</p><div className="panel-note">Sin regiones publicadas</div></aside>
}
