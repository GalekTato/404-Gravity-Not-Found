import type { AreaGeografica, ColeccionAreas, Entidad, GeografiaMexico, Limites, PropiedadesArea } from '../tipos/cartografia'
import type { MultiPolygon, Polygon, Position } from 'geojson'

function objeto(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function posicion(value: unknown): value is Position {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number'
    && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90
}
function anillo(value: unknown): value is Position[] {
  return Array.isArray(value) && value.length >= 4 && value.every(posicion)
    && value[0][0] === value[value.length - 1][0] && value[0][1] === value[value.length - 1][1]
}
function poligono(value: unknown): value is Position[][] { return Array.isArray(value) && value.length > 0 && value.every(anillo) }
function geometria(value: unknown): value is Polygon | MultiPolygon {
  return objeto(value) && (value.type === 'Polygon' ? poligono(value.coordinates)
    : value.type === 'MultiPolygon' && Array.isArray(value.coordinates) && value.coordinates.length > 0 && value.coordinates.every(poligono))
}
function propiedades(value: unknown): value is PropiedadesArea {
  return objeto(value) && typeof value.clave === 'string' && /^\d{2}(\d{3})?$/.test(value.clave)
    && typeof value.entidad === 'string' && /^\d{2}$/.test(value.entidad)
    && value.clave.startsWith(value.entidad) && typeof value.nombre === 'string' && value.nombre.length > 0
}
export function validarColeccion(value: unknown, entidad?: string): ColeccionAreas {
  if (!objeto(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features) || !value.features.length) throw new Error('La cartografía está vacía o no es GeoJSON.')
  const ids = new Set<string>()
  for (const feature of value.features) {
    if (!objeto(feature) || feature.type !== 'Feature' || !propiedades(feature.properties) || !geometria(feature.geometry)
      || feature.id !== feature.properties.clave || ids.has(feature.properties.clave)
      || (entidad ? feature.properties.entidad !== entidad || feature.properties.clave.length !== 5 : feature.properties.clave.length !== 2)) throw new Error('La cartografía contiene geometrías o claves inválidas.')
    ids.add(feature.properties.clave)
  }
  if (!entidad && (ids.size !== 32 || Array.from({ length: 32 }, (_, i) => String(i + 1).padStart(2, '0')).some(id => !ids.has(id)))) throw new Error('Faltan entidades en la cartografía nacional.')
  return value as unknown as ColeccionAreas
}
async function leerJson(archivo: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}geojson/${archivo}`, { signal })
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('No se pudo leer la cartografía local. Comprueba que los archivos GeoJSON estén disponibles.')
  return response.json()
}
export async function cargarGeografia(signal: AbortSignal): Promise<GeografiaMexico> {
  const [datos, catalogo]: unknown[] = await Promise.all([leerJson('estados.geojson', signal), leerJson('catalogo.json', signal)])
  const estados = validarColeccion(datos)
  if (!Array.isArray(catalogo) || catalogo.length !== 32) throw new Error('El catálogo de entidades está incompleto.')
  const ids = new Set<string>()
  for (const item of catalogo) {
    if (!propiedades(item) || !objeto(item) || !Array.isArray(item.limites) || item.limites.length !== 4 || !item.limites.every(n => typeof n === 'number' && Number.isFinite(n))
      || !posicion(item.etiqueta) || typeof item.municipios !== 'number' || !Number.isInteger(item.municipios) || item.municipios < 1
      || ids.has(item.clave) || !estados.features.some(f => f.properties.clave === item.clave && f.properties.nombre === item.nombre)) throw new Error('El catálogo no coincide con las geometrías.')
    ids.add(item.clave)
  }
  return { estados, catalogo: (catalogo as Entidad[]).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) }
}
export async function cargarMunicipios(clave: string, signal: AbortSignal) {
  if (!/^\d{2}$/.test(clave)) throw new Error('Clave de entidad inválida.')
  return validarColeccion(await leerJson(`municipios/${clave}.geojson`, signal), clave)
}
export function limitesArea(feature: AreaGeografica): Limites {
  const bounds: Limites = [Infinity, Infinity, -Infinity, -Infinity]
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  for (const polygon of polygons) for (const ring of polygon) for (const [x, y] of ring) {
    bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y)
    bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y)
  }
  return bounds
}
