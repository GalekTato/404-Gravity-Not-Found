import type { FeatureCollection, Point } from 'geojson'

export const TIPOS_DESASTRE = ['sismo', 'huracan', 'sequia', 'inundacion', 'incendio'] as const
export type TipoDesastre = (typeof TIPOS_DESASTRE)[number]

export const ETIQUETAS_DESASTRE: Record<TipoDesastre, string> = {
  sismo: 'Sismo',
  huracan: 'Huracán',
  sequia: 'Sequía',
  inundacion: 'Inundación',
  incendio: 'Incendio',
}

export const COLORES_DESASTRE: Record<TipoDesastre, string> = {
  sismo: '#ef4444',
  huracan: '#3b82f6',
  sequia: '#eab308',
  inundacion: '#06b6d4',
  incendio: '#f97316',
}

export interface PropiedadesDesastre {
  id: string
  name: string
  type: TipoDesastre
  severity: number
  radius_km: number
  date: string
  month?: string
  state_clave?: string
  state_name?: string
  score?: number | null
  probability?: number | null
  evidence?: 'observed' | 'supervised' | 'proxy' | 'no_confirmable'
  observed?: boolean
  source?: string
}

export interface MetadatosPredicciones {
  date: string
  period?: string
  count: number
  states_affected?: number
  region: string
  projection: string
}

export interface MarcaTimeMap {
  period: string
  date: string
  total: number
  states_affected: number
  max_severity: number
  dominant_type: TipoDesastre
  headline: string
  observed_count: number
  counts: Partial<Record<TipoDesastre, number>>
}

export interface ResumenTimeMap {
  start_period: string | null
  end_period: string | null
  total_periods: number
  total_events: number
  states_covered: number
  markers: MarcaTimeMap[]
}

export type ColeccionPredicciones = FeatureCollection<Point, PropiedadesDesastre> & {
  metadata?: MetadatosPredicciones
}

const URL_PREDICCIONES = (import.meta.env.VITE_API_PREDICCIONES as string | undefined) ?? '/api/predictions/'
const API_PREDICCIONES = URL_PREDICCIONES.endsWith('/') ? URL_PREDICCIONES : `${URL_PREDICCIONES}/`
const URL_TIMEMAP = (import.meta.env.VITE_API_TIMEMAP as string | undefined) ?? '/api/timemap/'
const API_TIMEMAP = URL_TIMEMAP.endsWith('/') ? URL_TIMEMAP : `${URL_TIMEMAP}/`

function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

export function esTipoDesastre(valor: unknown): valor is TipoDesastre {
  return typeof valor === 'string' && (TIPOS_DESASTRE as readonly string[]).includes(valor)
}

function posicion(valor: unknown): valor is [number, number] {
  return Array.isArray(valor) && valor.length >= 2
    && typeof valor[0] === 'number' && Number.isFinite(valor[0]) && Math.abs(valor[0]) <= 180
    && typeof valor[1] === 'number' && Number.isFinite(valor[1]) && Math.abs(valor[1]) <= 90
}

function propiedades(value: unknown): value is PropiedadesDesastre {
  return objeto(value)
    && typeof value.id === 'string' && value.id.length > 0
    && typeof value.name === 'string' && value.name.length > 0
    && esTipoDesastre(value.type)
    && typeof value.severity === 'number' && Number.isFinite(value.severity) && value.severity >= 0 && value.severity <= 10
    && typeof value.radius_km === 'number' && Number.isFinite(value.radius_km) && value.radius_km > 0
    && typeof value.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && (value.evidence === undefined || ['observed', 'supervised', 'proxy', 'no_confirmable'].includes(value.evidence as string))
}

function metadatos(value: unknown): MetadatosPredicciones | undefined {
  if (!objeto(value)) return undefined
  const { date, period, count, states_affected, region, projection } = value
  if (typeof date !== 'string' || typeof count !== 'number' || !Number.isFinite(count)
    || typeof region !== 'string' || typeof projection !== 'string') return undefined
  return {
    date,
    count,
    region,
    projection,
    ...(typeof period === 'string' ? { period } : {}),
    ...(typeof states_affected === 'number' && Number.isFinite(states_affected) ? { states_affected } : {}),
  }
}

export function validarPredicciones(value: unknown): ColeccionPredicciones {
  if (!objeto(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new Error('El servicio de predicciones no devolvió una colección GeoJSON válida.')
  }
  for (const feature of value.features) {
    if (!objeto(feature) || feature.type !== 'Feature' || !propiedades(feature.properties)
      || !objeto(feature.geometry) || feature.geometry.type !== 'Point' || !posicion(feature.geometry.coordinates)) {
      throw new Error('El servicio de predicciones devolvió puntos inválidos.')
    }
  }
  const informacion = metadatos(value.metadata)
  return {
    ...(value as unknown as ColeccionPredicciones),
    ...(informacion ? { metadata: informacion } : {}),
  }
}

export async function obtenerPredicciones(
  fechaOPeriodo?: string,
  signal?: AbortSignal,
  tipo?: TipoDesastre,
): Promise<ColeccionPredicciones> {
  const params: string[] = []
  if (fechaOPeriodo) {
    if (/^\d{4}-\d{2}$/.test(fechaOPeriodo)) {
      params.push(`period=${encodeURIComponent(fechaOPeriodo)}`)
    } else {
      params.push(`date=${encodeURIComponent(fechaOPeriodo)}`)
    }
  }
  if (tipo) {
    params.push(`type=${encodeURIComponent(tipo)}`)
  }
  const url = params.length > 0 ? `${API_PREDICCIONES}?${params.join('&')}` : API_PREDICCIONES
  let respuesta: Response
  try {
    respuesta = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('No se pudo conectar con el backend de predicciones. Comprueba que el servidor esté en ejecución.')
  }
  if (!respuesta.ok) {
    if (respuesta.status === 400) throw new Error('La fecha solicitada no es válida.')
    throw new Error(`El servicio de predicciones respondió con un error ${respuesta.status}.`)
  }
  let datos: unknown
  try {
    datos = await respuesta.json()
  } catch {
    throw new Error('El servicio de predicciones devolvió una respuesta ilegible.')
  }
  return validarPredicciones(datos)
}

export async function obtenerTimeMap(
  tipo?: TipoDesastre,
  signal?: AbortSignal,
): Promise<ResumenTimeMap> {
  const url = tipo ? `${API_TIMEMAP}?type=${encodeURIComponent(tipo)}` : API_TIMEMAP
  let respuesta: Response
  try {
    respuesta = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('No se pudo conectar con el servicio TimeMap.')
  }
  if (!respuesta.ok) {
    throw new Error(`El servicio TimeMap respondió con un error ${respuesta.status}.`)
  }
  const datos = (await respuesta.json()) as unknown
  if (!objeto(datos) || !Array.isArray(datos.markers)) {
    throw new Error('El servicio TimeMap devolvió una línea de tiempo inválida.')
  }
  return datos as unknown as ResumenTimeMap
}
