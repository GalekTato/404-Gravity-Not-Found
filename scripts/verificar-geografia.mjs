import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const base = new URL('../frontend/public/geojson/', import.meta.url)
const json = async nombre => JSON.parse(await readFile(new URL(nombre, base), 'utf8'))
const procedencia = await json('procedencia.json')
const catalogo = await json('catalogo.json')
assert.equal(catalogo.length, 32)
assert.equal(new Set(catalogo.map(item => item.clave)).size, 32)
assert.equal(procedencia.fuentes.length, 33)
let municipios = 0
const estados = await json('estados.geojson')
for (const fuente of procedencia.fuentes) {
  const buffer = await readFile(new URL(fuente.archivo, base))
  assert.equal(createHash('sha256').update(buffer).digest('hex'), fuente.sha256, `Integridad: ${fuente.archivo}`)
  assert.equal(buffer.byteLength, fuente.bytes)
  const data = JSON.parse(buffer)
  assert.equal(data.features.length, fuente.registros)
  assert.equal(new Set(data.features.map(feature => feature.id)).size, data.features.length)
  if (fuente.archivo.startsWith('municipios/')) {
    const clave = fuente.archivo.match(/(\d{2})\.geojson$/)[1]
    const entidad = catalogo.find(item => item.clave === clave)
    assert(entidad, `Entidad faltante: ${clave}`)
    assert.equal(data.features.length, entidad.municipios, `Conteo municipal: ${clave}`)
    assert(data.features.every(feature => feature.properties.entidad === clave && feature.properties.clave.startsWith(clave) && feature.properties.clave.length === 5))
    municipios += data.features.length
  }
}
for (const entidad of catalogo) {
  const feature = estados.features.find(feature => feature.properties.clave === entidad.clave)
  assert.equal(feature?.properties.nombre, entidad.nombre)
  assert(entidad.limites[0] <= entidad.etiqueta[0] && entidad.etiqueta[0] <= entidad.limites[2])
  assert(entidad.limites[1] <= entidad.etiqueta[1] && entidad.etiqueta[1] <= entidad.limites[3])
}
console.log(`Integridad verificada: 32 entidades, ${municipios} municipios/demarcaciones y 33 hashes SHA-256.`)
