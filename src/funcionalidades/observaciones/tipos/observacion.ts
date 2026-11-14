export type Polarizacion = 'HH' | 'HV' | 'VH' | 'VV'
export interface FiltrosObservaciones { desde: string; hasta: string; polarizacion: Polarizacion | '' }
export interface Observacion { id: string; fecha: string; polarizaciones: readonly Polarizacion[]; imagenUrl?: string; metadatos: Readonly<Record<string, string>> }
