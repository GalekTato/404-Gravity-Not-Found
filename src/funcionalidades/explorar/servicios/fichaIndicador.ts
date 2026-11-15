import { COLORES_DESASTRE, etiquetaAmenaza, etiquetaEvidencia, type PropiedadesDesastre } from './predicciones'
import { nombreIndicador } from './textosIndicadores'
import { descripcionInstrumento } from '../../../utils/disasterSound'

export interface OpcionesAudioPopup {
  activo: boolean
  onToggleAudio: () => boolean
}

export function contenidoPopup(
  props: PropiedadesDesastre,
  idioma: 'es' | 'en',
  audio?: OpcionesAudioPopup,
): HTMLDivElement {
  const t = (es: string, en: string) => (idioma === 'es' ? es : en)
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

  if (audio) {
    const filaAudio = document.createElement('div')
    filaAudio.className = 'prediccion-popup-audio-row'
    const botonAudio = document.createElement('button')
    botonAudio.type = 'button'
    botonAudio.className = 'quiet-button prediccion-popup-audio-btn'
    const estadoAudio = document.createElement('p')
    estadoAudio.className = 'prediccion-popup-audio-estado'
    estadoAudio.setAttribute('aria-live', 'polite')

    const actualizarEstado = (sonando: boolean) => {
      botonAudio.setAttribute('aria-pressed', sonando ? 'true' : 'false')
      botonAudio.textContent = sonando
        ? `■ ${t('Detener quintas', 'Stop 5ths audio')}`
        : `♫ ${t('Escuchar firma (quintas)', 'Listen (5ths signature)')}`
      estadoAudio.textContent = sonando
        ? `${t('Sonando:', 'Playing:')} ${descripcionInstrumento(props.type, idioma)}`
        : t('Círculo de quintas mapeado a severidad y probabilidad.', 'Circle of fifths mapped to severity & probability.')
    }

    actualizarEstado(audio.activo)
    botonAudio.addEventListener('click', () => {
      const nuevoEstado = audio.onToggleAudio()
      actualizarEstado(nuevoEstado)
    })

    filaAudio.append(botonAudio, estadoAudio)
    contenedor.append(filaAudio)
  }

  return contenedor
}
