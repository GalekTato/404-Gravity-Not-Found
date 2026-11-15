import type { Idioma } from '../../../configuracion/idiomaContexto'

const TITULOS = [
  ['Incendio forestal observado', 'Observed wildfire'],
  ['Riesgo de incendio', 'Fire risk'],
  ['Riesgo hidrometeorológico de inundación', 'Hydrometeorological flood risk'],
  ['Estrés hídrico / Sequía', 'Water stress / Drought'],
  ['Indicador de sequía', 'Drought indicator'],
  ['Indicador de inundación', 'Flood indicator'],
  ['Screening SAR', 'SAR screening'],
  ['Screening tectónico', 'Tectonic screening'],
  ['Sismo M', 'Earthquake M'],
  ['Ciclón Tropical', 'Tropical cyclone'],
  ['Ciclón ', 'Cyclone '],
] as const

export function nombreIndicador(nombre: string, idioma: Idioma): string {
  // Catalog text may contain non-breaking spaces or extra spacing around the count.
  const viirs = /^\s*(?:Focos?\s+activos?\s+VIIRS|VIIRS\s+active\s+fires?)\s*\(\s*(\d+)\s+(?:detecciones|detección|detections|detection)\s*\)/iu.exec(nombre)
  if (viirs) {
    const cantidad = Number(viirs[1])
    const etiqueta = idioma === 'es'
      ? `${cantidad === 1 ? 'Foco activo' : 'Focos activos'} VIIRS (${cantidad} ${cantidad === 1 ? 'detección' : 'detecciones'})`
      : `VIIRS active ${cantidad === 1 ? 'fire' : 'fires'} (${cantidad} ${cantidad === 1 ? 'detection' : 'detections'})`
    return etiqueta + nombre.slice(viirs[0].length)
  }
  if (idioma === 'es' && nombre.startsWith('Evaluación preliminar SAR')) return nombre
  for (const [es, en] of TITULOS) {
    if (nombre.startsWith(es)) {
      const etiqueta = idioma === 'es' ? es.replace('Screening', 'Evaluación preliminar') : en
      return etiqueta + nombre.slice(es.length)
    }
    if (nombre.startsWith(en)) {
      return (idioma === 'es' ? es.replace('Screening', 'Evaluación preliminar') : en) + nombre.slice(en.length)
    }
  }
  return nombre
}
