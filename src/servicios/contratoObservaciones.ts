import type { FiltrosObservaciones, Observacion } from '../funcionalidades/observaciones/tipos/observacion'
// Puerto para un futuro adaptador HTTP. No hay solicitudes ni datos simulados.
export interface ObservacionesRepository {
  listar(filtros: FiltrosObservaciones, signal?: AbortSignal): Promise<readonly Observacion[]>
}
