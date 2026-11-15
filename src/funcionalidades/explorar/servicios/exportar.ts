import { apiUrlConBase, obtenerPredicciones, type TipoDesastre } from './predicciones'

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function escaparCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto
  return `"${seguro.replace(/"/g, '""')}"`
}

export async function exportarExcel(periodo: string, tipo?: TipoDesastre, estado?: string) {
  const params = new URLSearchParams({ period: periodo })
  if (tipo) params.set('type', tipo)
  if (estado) params.set('state', estado)
  const sufijo = `${periodo}${estado ? `-${estado}` : ''}${tipo ? `-${tipo}` : ''}`
  try {
    const response = await fetch(apiUrlConBase(`/api/export/?${params}`))
    const contentType = response.headers.get('content-type') ?? ''
    if (response.ok && (contentType.includes('spreadsheetml') || contentType.includes('octet-stream'))) {
      const blob = await response.blob()
      descargarBlob(blob, `earthsync-${sufijo}.xlsx`)
      return
    }
  } catch {
    // Fallback to client-side CSV export when deployed statically (e.g., GitHub Pages).
  }
  const coleccion = await obtenerPredicciones(periodo, undefined, tipo, estado)
  const encabezados = ['ID', 'Date', 'Period', 'State code', 'State', 'Hazard', 'Name', 'Severity', 'Radius km', 'Evidence', 'Observed', 'Score', 'Probability', 'Source', 'Longitude', 'Latitude']
  const filas = [encabezados.map(escaparCsv).join(',')]
  for (const feature of coleccion.features) {
    const p = feature.properties
    const [lon, lat] = feature.geometry.coordinates
    filas.push([
      p.id, p.date, p.month ?? periodo, p.state_clave ?? '', p.state_name ?? '', p.type, p.name,
      p.severity, p.radius_km, p.evidence ?? '', p.observed ?? '', p.score ?? '', p.probability ?? '', p.source ?? '', lon, lat,
    ].map(escaparCsv).join(','))
  }
  const csvBlob = new Blob([`\uFEFF${filas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  descargarBlob(csvBlob, `earthsync-${sufijo}.csv`)
}
