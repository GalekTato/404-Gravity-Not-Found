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

export function etiquetaAmenaza(tipo: TipoDesastre, idioma: 'es' | 'en') {
  const english = { sismo: 'Earthquake', huracan: 'Hurricane', sequia: 'Drought', inundacion: 'Flood', incendio: 'Fire' }
  return idioma === 'es' ? ETIQUETAS_DESASTRE[tipo] : english[tipo]
}

export function etiquetaEvidencia(evidencia: PropiedadesDesastre['evidence'], idioma: 'es' | 'en') {
  const es = { observed: 'Observada', supervised: 'Supervisada', proxy: 'Indicador indirecto', no_confirmable: 'No confirmable' }
  const en = { observed: 'Observed', supervised: 'Supervised', proxy: 'Proxy indicator', no_confirmable: 'Not confirmable' }
  return (idioma === 'es' ? es : en)[evidencia ?? 'no_confirmable']
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

export interface BacktestEvaluatedHazard {
  hazard_type: string
  source: string
  train_months: number
  test_months: number
  positive_test_months: number
  threshold: number
  precision: number
  recall: number
  f1: number
  roc_auc: number
  brier_score: number
}

export interface BacktestSkippedHazard {
  hazard_type: string
  reason: string
}

export interface ModeloResumen {
  id: string
  name_es: string
  name_en: string
  algorithms: string[]
  calibration: string
  formula: string
}

export interface ResumenMetricasModelo {
  available: boolean
  database_engine: string
  catalog_summary: {
    total_events: number
    total_periods: number
    states_covered: number
    coastal_and_eez_adjacent_events: number
    inland_continental_events: number
    by_hazard: Record<string, number>
    by_evidence: Record<string, number>
    top_states: Array<{
      state_clave: string
      state_name: string
      count: number
      max_severity: number
    }>
  }
  backtest: {
    results?: BacktestEvaluatedHazard[]
    skipped?: BacktestSkippedHazard[]
  }
  sensors: Record<string, { available: boolean; count: number; total_bytes: number }>
  hardware?: { cpu_count?: number; workers?: number; gpu?: string; cuda?: boolean; torch?: string }
  ground_truth?: Record<string, string>
  models: ModeloResumen[]
}

export type ColeccionPredicciones = FeatureCollection<Point, PropiedadesDesastre> & {
  metadata?: MetadatosPredicciones
}

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '')
const unirBase = (ruta: string) => `${API_BASE}${ruta.startsWith('/') ? ruta : `/${ruta}`}`

const URL_PREDICCIONES = (import.meta.env.VITE_API_PREDICCIONES as string | undefined) ?? '/api/predictions/'
const API_PREDICCIONES = unirBase(URL_PREDICCIONES.endsWith('/') ? URL_PREDICCIONES : `${URL_PREDICCIONES}/`)
const URL_TIMEMAP = (import.meta.env.VITE_API_TIMEMAP as string | undefined) ?? '/api/timemap/'
const API_TIMEMAP = unirBase(URL_TIMEMAP.endsWith('/') ? URL_TIMEMAP : `${URL_TIMEMAP}/`)
const API_METRICAS = unirBase('/api/model-metrics/')

const SNAPSHOT_BASE = `${import.meta.env.BASE_URL}data-snapshots/`

// In-memory LRU-bounded caches prevent redundant fetches and eliminate tab-switch latency.
const cachePredicciones = new Map<string, ColeccionPredicciones>()
const inflightPredicciones = new Map<string, Promise<ColeccionPredicciones>>()
const cacheTimeMap = new Map<string, ResumenTimeMap>()
const inflightTimeMap = new Map<string, Promise<ResumenTimeMap>>()
let cacheMetricas: ResumenMetricasModelo | undefined
let inflightMetricas: Promise<ResumenMetricasModelo> | undefined
let snapshotCatalogPromise: Promise<ColeccionPredicciones | null> | undefined

function limitarCache<K, V>(mapa: Map<K, V>, maxEntries: number) {
  while (mapa.size > maxEntries) {
    const oldest = mapa.keys().next().value
    if (oldest !== undefined) mapa.delete(oldest)
    else break
  }
}

export function esApiEstaticaFallbackDisponible(): boolean {
  return Boolean(snapshotCatalogPromise)
}

export function apiUrlConBase(ruta: string): string {
  return unirBase(ruta)
}

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

async function leerSnapshotGeoJSON(): Promise<ColeccionPredicciones | null> {
  if (!snapshotCatalogPromise) {
    snapshotCatalogPromise = fetch(`${SNAPSHOT_BASE}catalog-events.json`, { headers: { Accept: 'application/json' } })
      .then(async res => {
        if (!res.ok) return null
        const raw = await res.json()
        return validarPredicciones(raw)
      })
      .catch(() => null)
  }
  return snapshotCatalogPromise
}

function resumirTimeMapDesdeFeatures(
  features: ColeccionPredicciones['features'],
  tipo?: TipoDesastre,
  estado?: string,
): ResumenTimeMap {
  const filtrados = features.filter(f => {
    const p = f.properties
    if (tipo && p.type !== tipo) return false
    if (estado && p.state_clave !== estado.padStart(2, '0')) return false
    return true
  })
  const porPeriodo = new Map<string, ColeccionPredicciones['features']>()
  for (const f of filtrados) {
    const periodo = f.properties.month ?? f.properties.date.slice(0, 7)
    const lista = porPeriodo.get(periodo)
    if (lista) lista.push(f)
    else porPeriodo.set(periodo, [f])
  }
  const periodos = Array.from(porPeriodo.keys()).sort()
  const estadosGlobales = new Set<string>()
  const markers: MarcaTimeMap[] = periodos.map(period => {
    const grupo = porPeriodo.get(period)!
    const ordenados = [...grupo].sort((a, b) => Number(Boolean(b.properties.observed)) - Number(Boolean(a.properties.observed)) || b.properties.severity - a.properties.severity)
    const lead = ordenados[0]!.properties
    const counts: Partial<Record<TipoDesastre, number>> = {}
    const estadosPeriodo = new Set<string>()
    let observedCount = 0
    let maxSeverity = 0
    for (const item of grupo) {
      const pr = item.properties
      counts[pr.type] = (counts[pr.type] ?? 0) + 1
      if (pr.state_clave) {
        estadosPeriodo.add(pr.state_clave)
        estadosGlobales.add(pr.state_clave)
      }
      if (pr.observed) observedCount += 1
      if (pr.severity > maxSeverity) maxSeverity = pr.severity
    }
    return {
      period,
      date: lead.date,
      total: grupo.length,
      states_affected: estadosPeriodo.size,
      max_severity: Number(maxSeverity.toFixed(1)),
      dominant_type: lead.type,
      headline: lead.name,
      observed_count: observedCount,
      counts,
    }
  })
  return {
    start_period: markers[0]?.period ?? null,
    end_period: markers.at(-1)?.period ?? null,
    total_periods: markers.length,
    total_events: filtrados.length,
    states_covered: estadosGlobales.size,
    markers,
  }
}

export function obtenerPrediccionesEnCache(
  fechaOPeriodo?: string,
  tipo?: TipoDesastre,
  estado?: string,
): ColeccionPredicciones | undefined {
  const params: string[] = []
  if (fechaOPeriodo) {
    if (/^\d{4}-\d{2}$/.test(fechaOPeriodo)) params.push(`period=${encodeURIComponent(fechaOPeriodo)}`)
    else params.push(`date=${encodeURIComponent(fechaOPeriodo)}`)
  }
  if (tipo) params.push(`type=${encodeURIComponent(tipo)}`)
  if (estado) params.push(`state=${encodeURIComponent(estado)}`)
  const cacheKey = params.join('&')
  return cachePredicciones.get(cacheKey)
}

export async function obtenerPredicciones(
  fechaOPeriodo?: string,
  signal?: AbortSignal,
  tipo?: TipoDesastre,
  estado?: string,
): Promise<ColeccionPredicciones> {
  const params: string[] = []
  if (fechaOPeriodo) {
    if (/^\d{4}-\d{2}$/.test(fechaOPeriodo)) {
      params.push(`period=${encodeURIComponent(fechaOPeriodo)}`)
    } else {
      params.push(`date=${encodeURIComponent(fechaOPeriodo)}`)
    }
  }
  if (tipo) params.push(`type=${encodeURIComponent(tipo)}`)
  if (estado) params.push(`state=${encodeURIComponent(estado)}`)
  const cacheKey = params.join('&')
  const cached = cachePredicciones.get(cacheKey)
  if (cached) return cached

  let pending = inflightPredicciones.get(cacheKey)
  if (!pending) {
    const url = cacheKey ? `${API_PREDICCIONES}?${cacheKey}` : API_PREDICCIONES
    pending = (async () => {
      try {
        const respuesta = await fetch(url, { headers: { Accept: 'application/json' } })
        const contentType = respuesta.headers.get('content-type') ?? ''
        if (respuesta.ok && contentType.includes('json')) {
          const validado = validarPredicciones(await respuesta.json())
          cachePredicciones.set(cacheKey, validado)
          limitarCache(cachePredicciones, 160)
          return validado
        }
        if (respuesta.status === 400) throw new Error('La fecha solicitada no es válida.')
      } catch (err) {
        if (err instanceof Error && err.message === 'La fecha solicitada no es válida.') throw err
      }
      // Static snapshot fallback (e.g., GitHub Pages standalone mode)
      const snapshot = await leerSnapshotGeoJSON()
      if (!snapshot) {
        throw new Error('No se pudo conectar con el backend de predicciones. Comprueba que el servidor esté en ejecución.')
      }
      const periodTarget = fechaOPeriodo ? fechaOPeriodo.slice(0, 7) : '2023-09'
      const estadoNorm = estado ? estado.padStart(2, '0') : undefined
      const filtrados = snapshot.features.filter(f => {
        const p = f.properties
        const fPeriod = p.month ?? p.date.slice(0, 7)
        if (fPeriod !== periodTarget) return false
        if (tipo && p.type !== tipo) return false
        if (estadoNorm && p.state_clave !== estadoNorm) return false
        return true
      })
      const colecc: ColeccionPredicciones = {
        type: 'FeatureCollection',
        metadata: {
          date: `${periodTarget}-15`,
          period: periodTarget,
          count: filtrados.length,
          region: 'México (32 entidades federativas · Snapshot estático)',
          projection: 'Eventos e indicadores multisensor geolocalizados por entidad',
        },
        features: filtrados,
      }
      cachePredicciones.set(cacheKey, colecc)
      limitarCache(cachePredicciones, 160)
      return colecc
    })().finally(() => {
      inflightPredicciones.delete(cacheKey)
    })
    inflightPredicciones.set(cacheKey, pending)
  }

  if (!signal) return pending
  return await new Promise<ColeccionPredicciones>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    pending!.then(
      val => { signal.removeEventListener('abort', onAbort); resolve(val) },
      err => { signal.removeEventListener('abort', onAbort); reject(err) },
    )
  })
}

export async function obtenerTimeMap(
  tipo?: TipoDesastre,
  signal?: AbortSignal,
  estado?: string,
): Promise<ResumenTimeMap> {
  const params = new URLSearchParams()
  if (tipo) params.set('type', tipo)
  if (estado) params.set('state', estado)
  const cacheKey = params.toString()
  const cached = cacheTimeMap.get(cacheKey)
  if (cached) return cached

  let pending = inflightTimeMap.get(cacheKey)
  if (!pending) {
    const url = `${API_TIMEMAP}${cacheKey ? `?${cacheKey}` : ''}`
    pending = (async () => {
      try {
        const respuesta = await fetch(url, { headers: { Accept: 'application/json' } })
        const contentType = respuesta.headers.get('content-type') ?? ''
        if (respuesta.ok && contentType.includes('json')) {
          const datos = (await respuesta.json()) as unknown
          if (objeto(datos) && Array.isArray(datos.markers)) {
            const resumen = datos as unknown as ResumenTimeMap
            cacheTimeMap.set(cacheKey, resumen)
            limitarCache(cacheTimeMap, 64)
            return resumen
          }
        }
      } catch {
        // Fallback below
      }
      const snapshot = await leerSnapshotGeoJSON()
      if (!snapshot) {
        throw new Error('No se pudo conectar con el servicio TimeMap.')
      }
      const resumen = resumirTimeMapDesdeFeatures(snapshot.features, tipo, estado)
      cacheTimeMap.set(cacheKey, resumen)
      limitarCache(cacheTimeMap, 64)
      return resumen
    })().finally(() => {
      inflightTimeMap.delete(cacheKey)
    })
    inflightTimeMap.set(cacheKey, pending)
  }

  if (!signal) return pending
  return await new Promise<ResumenTimeMap>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    pending!.then(
      val => { signal.removeEventListener('abort', onAbort); resolve(val) },
      err => { signal.removeEventListener('abort', onAbort); reject(err) },
    )
  })
}

export async function obtenerMetricasModelo(signal?: AbortSignal): Promise<ResumenMetricasModelo> {
  if (cacheMetricas) return cacheMetricas
  if (!inflightMetricas) {
    inflightMetricas = (async () => {
      try {
        const res = await fetch(API_METRICAS, { headers: { Accept: 'application/json' } })
        const contentType = res.headers.get('content-type') ?? ''
        if (res.ok && contentType.includes('json')) {
          const data = (await res.json()) as ResumenMetricasModelo
          cacheMetricas = data
          return data
        }
      } catch {
        // Fallback to static snapshot below
      }
      const fallbackRes = await fetch(`${SNAPSHOT_BASE}model-metrics.json`, { headers: { Accept: 'application/json' } })
      if (!fallbackRes.ok) throw new Error('No se pudieron cargar las métricas del modelo.')
      const fallbackData = (await fallbackRes.json()) as ResumenMetricasModelo
      cacheMetricas = fallbackData
      return fallbackData
    })().finally(() => {
      inflightMetricas = undefined
    })
  }
  if (!signal) return inflightMetricas
  return await new Promise<ResumenMetricasModelo>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    inflightMetricas!.then(
      val => { signal.removeEventListener('abort', onAbort); resolve(val) },
      err => { signal.removeEventListener('abort', onAbort); reject(err) },
    )
  })
}

export function precargarTimeMap() {
  void obtenerTimeMap().catch(() => {})
  void obtenerMetricasModelo().catch(() => {})
}
