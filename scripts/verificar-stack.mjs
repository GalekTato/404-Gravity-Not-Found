import assert from 'node:assert/strict'

const origen = process.argv[2] ?? 'http://127.0.0.1:8080'
async function consultar(ruta) {
  const response = await fetch(new URL(ruta, origen), { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, `${ruta}: HTTP ${response.status}`)
  return response.json()
}
const geografica = await fetch(new URL('/geojson/estados.geojson', origen), { method: 'HEAD' })
assert.equal(geografica.status, 200)
assert.match(geografica.headers.get('content-type') ?? '', /json/, 'GeoJSON must be served with a JSON MIME type')
const catalogo = await consultar('/geojson/catalogo.json')
assert.equal(catalogo.length, 32, 'State selector must have all 32 states')
const estado = await consultar('/api/catalog/status/')
assert.equal(estado.available, true)
const historial = await consultar('/api/timemap/')
const periodo = historial.markers.at(-1)?.period
assert.ok(periodo, 'Timeline must contain at least one period')
const nacional = await consultar(`/api/predictions/?period=${periodo}`)
const filtrado = await consultar(`/api/predictions/?period=${periodo}&state=12`)
assert.ok(filtrado.features.every(item => item.properties.state_clave === '12'), 'State filter leaked records from another state')
const incendios = await consultar(`/api/predictions/?period=${periodo}&type=incendio`)
assert.ok(incendios.features.every(item => item.properties.type === 'incendio'), 'Hazard filter leaked other hazards')
const vacio = await consultar(`/api/predictions/?period=${periodo}&state=99`)
assert.equal(vacio.features.length, 0, 'An empty state filter must never return national fallback records')
const exportacion = await fetch(new URL(`/api/export/?period=${periodo}&state=12`, origen))
assert.equal(exportacion.status, 200)
assert.match(exportacion.headers.get('content-type') ?? '', /spreadsheetml/)
const archivo = new Uint8Array(await exportacion.arrayBuffer())
assert.deepEqual([...archivo.slice(0, 4)], [80, 75, 3, 4], 'XLSX must be a ZIP workbook')
const invalido = await fetch(new URL('/api/predictions/?period=invalid', origen))
assert.equal(invalido.status, 400)
console.log(JSON.stringify({ origen, periodo, estados: catalogo.length, meses: historial.total_periods, registros: estado.spatial_events_in_postgres, puntos: nacional.features.length, guerrero: filtrado.features.length, excelBytes: archivo.length, resultado: 'OK' }, null, 2))
