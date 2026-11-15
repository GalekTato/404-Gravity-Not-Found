import { ICONOS_AMENAZA } from '../servicios/iconosAmenaza'
import { COLORES_DESASTRE } from '../servicios/predicciones'
import type { TipoDesastre } from '../servicios/predicciones'

export function HazardIcon({ tipo, size = 18 }: { tipo: TipoDesastre; size?: number }) {
  return <svg className="hazard-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORES_DESASTRE[tipo]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {ICONOS_AMENAZA[tipo].map((path, index) => <path key={index} d={path}/>)}
  </svg>
}
