import { Icon } from '../../../componentes/ui/Icon'
import type { Observacion } from '../tipos/observacion'
export function SarPreview({ observacion }: { observacion?: Observacion }) {
  return <div className="sar-preview">{observacion?.imagenUrl ? <img src={observacion.imagenUrl} alt={`Observación SAR del ${observacion.fecha}`}/> : <><Icon name="layers" size={42}/><h2>Una nueva forma de observar.</h2><p>Aquí podrás visualizar imágenes SAR cuando haya un catálogo disponible.</p><span className="chip">Sin observaciones conectadas</span></>}</div>
}
