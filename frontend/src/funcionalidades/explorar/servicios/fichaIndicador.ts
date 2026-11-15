import { COLORES_DESASTRE, etiquetaAmenaza, etiquetaEvidencia, type PropiedadesDesastre } from './predicciones'
import { nombreIndicador } from './textosIndicadores'

export interface ResumenIndicador {
  color: string
  encabezado: string
  titulo: string
  detalle: string
  evidencia: string
  fuente?: string
}

export function resumenIndicador(props: PropiedadesDesastre, idioma: 'es' | 'en'): ResumenIndicador {
  const t = (es: string, en: string) => (idioma === 'es' ? es : en)
  const estadoTexto = props.state_name ? ` · ${props.state_name}` : ''
  const encabezado = `${etiquetaAmenaza(props.type, idioma)} · ${t('Severidad', 'Severity')} ${props.severity.toFixed(1)}/10${estadoTexto}`
  const titulo = nombreIndicador(props.name, idioma)
  const detalle = `${t('Radio', 'Radius')}: ${props.radius_km} km · ${t('Fecha', 'Date')}: ${props.date}`
  const etiqueta = etiquetaEvidencia(props.evidence, idioma)
  const probTexto = typeof props.probability === 'number'
    ? ` · ${t('Probabilidad', 'Probability')}: ${(props.probability * 100).toFixed(0)}%`
    : ''
  const scoreTexto = props.score === null || props.score === undefined
    ? ''
    : ` · ${t('Puntuación', 'Score')}: ${props.score}`

  return {
    color: COLORES_DESASTRE[props.type],
    encabezado,
    titulo,
    detalle,
    evidencia: `${t('Evidencia', 'Evidence')}: ${etiqueta}${probTexto}${scoreTexto}`,
    fuente: props.source ? `${t('Fuente', 'Source')}: ${props.source}` : undefined,
  }
}
