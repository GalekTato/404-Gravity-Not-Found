import type { TipoDesastre } from './predicciones'

export async function exportarExcel(periodo: string, tipo?: TipoDesastre, estado?: string) {
  const params = new URLSearchParams({ period: periodo })
  if (tipo) params.set('type', tipo)
  if (estado) params.set('state', estado)
  const response = await fetch(`/api/export/?${params}`)
  if (!response.ok) throw new Error(`Excel: HTTP ${response.status}`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `terrasync-${periodo}${estado ? `-${estado}` : ''}${tipo ? `-${tipo}` : ''}.xlsx`
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}
