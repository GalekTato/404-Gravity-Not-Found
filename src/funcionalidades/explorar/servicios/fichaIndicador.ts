import { COLORES_DESASTRE, etiquetaAmenaza, etiquetaEvidencia, type PropiedadesDesastre } from './predicciones'
import { nombreIndicador } from './textosIndicadores'

export function contenidoPopup(props: PropiedadesDesastre, idioma: 'es' | 'en'): HTMLDivElement {
  const t = (es: string, en: string) => idioma === 'es' ? es : en
  const contenedor = document.createElement('div')
  contenedor.className = 'prediccion-popup-contenido'
  const tipo = document.createElement('p')
  tipo.className = 'prediccion-popup-tipo'
  tipo.style.color = COLORES_DESASTRE[props.type]
  const estadoTexto = props.state_name ? ` · ${props.state_name}` : ''
  tipo.textContent = `${etiquetaAmenaza(props.type, idioma)} · ${t('Severidad', 'Severity')} ${props.severity.toFixed(1)}/10${estadoTexto}`
  const nombre = document.createElement('p')
  nombre.className = 'prediccion-popup-nombre'
  nombre.lang = idioma
  nombre.textContent = nombreIndicador(props.name, idioma)
  const detalle = document.createElement('p')
  detalle.className = 'prediccion-popup-detalle'
  detalle.textContent = `${t('Radio', 'Radius')}: ${props.radius_km} km · ${t('Fecha', 'Date')}: ${props.date}`
  const evidencia = document.createElement('p')
  evidencia.className = 'prediccion-popup-detalle'
  const etiqueta = etiquetaEvidencia(props.evidence, idioma)
  const probTexto = typeof props.probability === 'number' ? ` · ${t('Probabilidad', 'Probability')}: ${(props.probability * 100).toFixed(0)}%` : ''
  const scoreTexto = props.score === null || props.score === undefined ? '' : ` · ${t('Puntuación', 'Score')}: ${props.score}`
  evidencia.textContent = `${t('Evidencia', 'Evidence')}: ${etiqueta}${probTexto}${scoreTexto}`
  contenedor.append(tipo, nombre, detalle, evidencia)
  if (props.source) {
    const fuente = document.createElement('p')
    fuente.className = 'prediccion-popup-detalle'
    fuente.textContent = `${t('Fuente', 'Source')}: ${props.source}`
    contenedor.append(fuente)
  }
  return contenedor
}
