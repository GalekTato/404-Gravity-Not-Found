import type { TemaEducativo } from '../tipos/aprendizaje'
export const temas: readonly TemaEducativo[] = [
  { id: 'nisar', titulo: '¿Qué es NISAR?', descripcion: 'Una introducción a la misión de observación terrestre de NASA e ISRO.' },
  { id: 'sar', titulo: 'Ver con radar', descripcion: 'Conoce las ideas detrás del radar de apertura sintética, o SAR.' },
  { id: 'cambios', titulo: 'Un planeta que cambia', descripcion: 'Cómo comparar observaciones para estudiar cambios en la superficie terrestre.' },
  { id: 'polarizaciones', titulo: 'Las polarizaciones', descripcion: 'Una guía a las orientaciones de transmisión y recepción de las señales de radar.' },
  { id: 'interpretacion', titulo: 'Aprender a interpretar', descripcion: 'El contexto, los metadatos y los límites de una observación satelital.' },
]
