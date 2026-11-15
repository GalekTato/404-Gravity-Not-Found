import type { FiltrosObservaciones, Observacion } from '../funcionalidades/observaciones/tipos/observacion'
// Port for a future HTTP adapter. No requests or fabricated data are used.
export interface ObservacionesRepository {
  listar(filtros: FiltrosObservaciones, signal?: AbortSignal): Promise<readonly Observacion[]>
}
