import { useState } from 'react'
import type { FiltrosObservaciones } from '../tipos/observacion'
import { ObservationFilters } from '../componentes/ObservationFilters'
import { ObservationMetadata } from '../componentes/ObservationMetadata'
import { SarPreview } from '../componentes/SarPreview'
export function ObservacionesPage() {
  const [filtros, setFiltros] = useState<FiltrosObservaciones>({ desde: '', hasta: '', polarizacion: '' })
  return <section className="page-container"><p className="eyebrow">02 / OBSERVAR</p><h1>Las huellas del cambio.</h1><p className="page-intro">El espacio para las futuras observaciones NISAR. Prepara tu selección de fechas; la consulta de datos estará disponible al conectar el catálogo.</p><ObservationFilters filtros={filtros} onChange={setFiltros}/><div className="explorer-grid"><SarPreview/><ObservationMetadata/></div></section>
}
