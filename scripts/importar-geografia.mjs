import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const output = fileURLToPath(new URL('../public/geojson/', import.meta.url))
const cache = join(tmpdir(), 'front404-inegi')
const base = 'https://gaia.inegi.org.mx/wscatgeo/v2/geo/'
await mkdir(cache, { recursive: true })
await mkdir(join(output, 'municipios'), { recursive: true })

async function obtener(ruta, nombre) {
  const local = join(cache, nombre)
  try { return { data: JSON.parse(await readFile(local, 'utf8')), fecha: (await stat(local)).mtime.toISOString() } } catch { /* Descargar si no existe en caché. */ }
  for (let intento = 0; intento < 3; intento++) {
    try {
      const response = await fetch(base + ruta, { signal: AbortSignal.timeout(120_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${ruta}`)
      const text = await response.text()
      const data = JSON.parse(text)
      if (data.type !== 'FeatureCollection' || !data.features?.length) throw new Error(`GeoJSON vacío o inválido: ${ruta}`)
      await writeFile(local, text)
      return { data, fecha: new Date().toISOString() }
    } catch (error) { if (intento === 2) throw error }
  }
}

function coordenadas(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Coordenada no finita')
    return Math.round(value * 1e6) / 1e6
  }
  if (!Array.isArray(value)) throw new Error('Coordenadas inválidas')
  return value.map(coordenadas)
}

function normalizar(data, entidad) {
  const ids = new Set()
  return { type: 'FeatureCollection', features: data.features.map(feature => {
    const { cvegeo, cve_ent, nomgeo, nom_abrev } = feature.properties
    if (!/^\d{2}(\d{3})?$/.test(cvegeo) || typeof nomgeo !== 'string' || ids.has(cvegeo)) throw new Error('Propiedades INEGI inválidas o duplicadas')
    if (entidad && (cve_ent !== entidad || cvegeo.length !== 5)) throw new Error('Municipio de otra entidad')
    if (!['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) throw new Error('Se esperaba geometría poligonal')
    ids.add(cvegeo)
    return { type: 'Feature', id: cvegeo, properties: { clave: cvegeo, entidad: cve_ent, nombre: nomgeo, ...(nom_abrev ? { abreviatura: nom_abrev } : {}) }, geometry: { type: feature.geometry.type, coordinates: coordenadas(feature.geometry.coordinates) } }
  }) }
}

function anillos(feature) { return feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates }
function limites(feature) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity]
  for (const polygon of anillos(feature)) for (const ring of polygon) for (const [x, y] of ring) {
    if (x < -180 || x > 180 || y < -90 || y > 90) throw new Error('Coordenadas fuera de WGS84')
    bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y)
    bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y)
  }
  return bounds
}
function area(ring) { return Math.abs(ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]; return sum + p[0] * q[1] - q[0] * p[1] }, 0)) }

// Punto interior para etiquetas: intersección horizontal del polígono mayor, respetando huecos.
function puntoEtiqueta(feature) {
  const polygons = anillos(feature)
  const polygon = polygons.reduce((largest, next) => area(next[0]) > area(largest[0]) ? next : largest)
  const ys = polygon[0].map(p => p[1])
  let minY = Infinity, maxY = -Infinity
  for (const y of ys) { minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
  let best = { length: -1, point: polygon[0][0] }
  for (const fraction of [.5, .35, .65, .2, .8]) {
    const y = minY + (maxY - minY) * fraction
    const xs = []
    for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1], b = ring[i]
      if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > best.length) best = { length: xs[i + 1] - xs[i], point: [(xs[i] + xs[i + 1]) / 2, y] }
  }
  return best.point.map(n => Math.round(n * 1e6) / 1e6)
}

const fuentes = []
async function guardar(nombre, data, original, ruta) {
  const text = JSON.stringify(data)
  await writeFile(join(output, nombre), text)
  fuentes.push({ archivo: nombre, url: base + ruta, descargado: original.fecha, metadatos: original.data.metadatos, registros: data.features.length, bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex') })
}

const original = await obtener('mgee/', 'estados.json')
const estados = normalizar(original.data)
if (estados.features.length !== 32 || estados.features.some(f => f.properties.clave.length !== 2)) throw new Error('Se esperaban las 32 entidades')
await guardar('estados.geojson', estados, original, 'mgee/')
const catalogo = estados.features.map(feature => ({ ...feature.properties, limites: limites(feature), etiqueta: puntoEtiqueta(feature), municipios: 0 }))
let siguiente = 0
await Promise.all(Array.from({ length: 3 }, async () => {
  while (siguiente < catalogo.length) {
    const entidad = catalogo[siguiente++]
    const ruta = `mgem/${entidad.clave}`
    const original = await obtener(ruta, `municipios-${entidad.clave}.json`)
    const municipios = normalizar(original.data, entidad.clave)
    municipios.features.forEach(feature => limites(feature))
    entidad.municipios = municipios.features.length
    await guardar(`municipios/${entidad.clave}.geojson`, municipios, original, ruta)
    console.log(`${entidad.clave} ${entidad.nombre}: ${entidad.municipios} municipios o demarcaciones`)
  }
}))
await writeFile(join(output, 'catalogo.json'), JSON.stringify(catalogo))
await writeFile(join(output, 'procedencia.json'), JSON.stringify({ institucion: 'Instituto Nacional de Estadística y Geografía (INEGI)', documentacion: 'https://www.inegi.org.mx/servicios/catalogounico/', terminos: 'https://www.inegi.org.mx/inegi/terminos.html', transformacion: 'Selección de atributos geográficos y redondeo a 6 decimales. Sin simplificación de vértices. WGS84. No son límites político-administrativos con valor legal.', fuentes: fuentes.sort((a, b) => a.archivo.localeCompare(b.archivo)) }, null, 2))
console.log(`Listo: 32 entidades y ${catalogo.reduce((sum, item) => sum + item.municipios, 0)} municipios/demarcaciones. Archivos servidos localmente.`)
