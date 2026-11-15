import type { Feature, Point } from 'geojson'
import type { MarcaTimeMap, TipoDesastre } from '../funcionalidades/explorar/servicios/predicciones'

interface PropiedadesAudio {
  type: TipoDesastre
  severity: number
  radius_km: number
}

interface PasoMelodico {
  type: TipoDesastre
  degree: number | null
  intensity: number
  chord: boolean
  percussion: boolean
}

interface OpcionesReproduccion {
  onStop?: () => void
  onError?: (error: unknown) => void
}

export interface AudioPlayback {
  stop: () => void
}

export const INSTRUMENTOS_DESASTRE: Record<TipoDesastre, string> = {
  sismo: 'percusión tectónica y bajo distorsionado',
  huracan: 'sintetizador ambiental y pulsos circulares',
  sequia: 'sintetizador minimalista y notas espaciadas',
  inundacion: 'campanas fluidas y arpegio ondulante',
  incendio: 'sintetizador electrónico y percusión rápida',
}

interface PerfilSonoro {
  bpm: number
  wave: OscillatorType
  bassWave: OscillatorType
  degrees: readonly (number | null)[]
  gain: number
  filter: number
}

const perfiles: Record<TipoDesastre, PerfilSonoro> = {
  sismo: {
    bpm: 112,
    wave: 'sawtooth',
    bassWave: 'triangle',
    degrees: [0, null, 2, 1, null, 3, 1, null, 2, 4, null, 1, 3, null, 2, 0],
    gain: 0.12,
    filter: 900,
  },
  huracan: {
    bpm: 84,
    wave: 'triangle',
    bassWave: 'sine',
    degrees: [0, null, null, 2, null, 1, null, null, 3, null, 2, null, null, 1, null, 0],
    gain: 0.09,
    filter: 1250,
  },
  sequia: {
    bpm: 72,
    wave: 'sine',
    bassWave: 'sine',
    degrees: [0, null, null, null, 2, null, null, 1, null, null, 3, null, null, null, 1, null],
    gain: 0.1,
    filter: 1600,
  },
  inundacion: {
    bpm: 96,
    wave: 'triangle',
    bassWave: 'sine',
    degrees: [0, null, 2, null, 1, 3, null, 2, 4, null, 2, 1, null, 3, null, 0],
    gain: 0.09,
    filter: 1800,
  },
  incendio: {
    bpm: 132,
    wave: 'square',
    bassWave: 'sawtooth',
    degrees: [0, 1, 3, null, 2, 4, 3, 1, null, 4, 2, 3, 1, null, 2, 0],
    gain: 0.1,
    filter: 1400,
  },
}

const ESCALA_QUINTAS = [0, 7, 14, 2, 9, 16, 4, 11, 18, 6, 13, 20]
const RAICES_QUINTAS = [36, 43, 38, 45, 40, 47, 42, 37, 44, 39, 46, 41]

let detenerReproduccionActiva: (() => void) | undefined

function frecuenciaNota(degree: number, rootIndex: number): number {
  const root = RAICES_QUINTAS[rootIndex]
  return 440 * 2 ** ((root + ESCALA_QUINTAS[degree % ESCALA_QUINTAS.length] - 69) / 12)
}

function iniciarSecuencia(
  pasos: readonly PasoMelodico[],
  segundosPorPaso: number,
  rootIndex: number,
  options: OpcionesReproduccion = {},
): AudioPlayback {
  detenerReproduccionActiva?.()

  const ConstructorAudio = window.AudioContext
  if (!ConstructorAudio) throw new Error('Este navegador no admite reproducción de audio.')

  const contexto = new ConstructorAudio()
  const salida = contexto.createGain()
  const compresor = contexto.createDynamicsCompressor()
  salida.gain.value = 0.72
  compresor.threshold.value = -18
  compresor.ratio.value = 4
  salida.connect(compresor).connect(contexto.destination)

  let detenido = false
  let temporizador: number | undefined
  let proximoPaso = 0
  let indice = 0

  function detener() {
    if (detenido) return
    detenido = true
    if (temporizador !== undefined) window.clearInterval(temporizador)
    if (detenerReproduccionActiva === detener) detenerReproduccionActiva = undefined
    if (contexto.state === 'running') {
      salida.gain.cancelScheduledValues(contexto.currentTime)
      salida.gain.setTargetAtTime(0.0001, contexto.currentTime, 0.025)
    }
    window.setTimeout(() => {
      void contexto.close()
    }, 100)
    options.onStop?.()
  }

  detenerReproduccionActiva = detener

  function tocar(paso: PasoMelodico, cuando: number) {
    const perfil = perfiles[paso.type]
    const volumen = Math.max(0.035, Math.min(perfil.gain, perfil.gain * paso.intensity))
    const pan = paso.percussion ? -0.18 : 0.18
    const notas = paso.degree === null
      ? []
      : paso.chord
        ? [paso.degree, (paso.degree + 1) % ESCALA_QUINTAS.length]
        : [paso.degree]

    for (const [indiceNota, degree] of notas.entries()) {
      const oscilador = contexto.createOscillator()
      const filtro = contexto.createBiquadFilter()
      const envolvente = contexto.createGain()
      const paneo = contexto.createStereoPanner()
      const inicio = cuando + indiceNota * 0.018
      const duracion = Math.max(0.12, segundosPorPaso * (paso.chord ? 0.86 : 0.72))

      oscilador.type = perfil.wave
      oscilador.frequency.setValueAtTime(frecuenciaNota(degree, rootIndex), inicio)
      filtro.type = 'lowpass'
      filtro.frequency.setValueAtTime(perfil.filter * (0.7 + paso.intensity * 0.3), inicio)
      envolvente.gain.setValueAtTime(0.0001, inicio)
      envolvente.gain.exponentialRampToValueAtTime(volumen / notas.length, inicio + 0.025)
      envolvente.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion)
      paneo.pan.setValueAtTime(pan * (indiceNota === 0 ? 1 : -1), inicio)
      oscilador.connect(filtro).connect(envolvente).connect(paneo).connect(salida)
      oscilador.start(inicio)
      oscilador.stop(inicio + duracion + 0.02)
    }

    if (paso.percussion) {
      const bajo = contexto.createOscillator()
      const golpe = contexto.createGain()
      bajo.type = perfil.bassWave
      bajo.frequency.setValueAtTime(Math.max(38, frecuenciaNota(0, rootIndex) / 2), cuando)
      bajo.frequency.exponentialRampToValueAtTime(38, cuando + 0.16)
      golpe.gain.setValueAtTime(0.0001, cuando)
      golpe.gain.exponentialRampToValueAtTime(0.13 * paso.intensity, cuando + 0.012)
      golpe.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.2)
      bajo.connect(golpe).connect(salida)
      bajo.start(cuando)
      bajo.stop(cuando + 0.22)
    }
  }

  void contexto.resume().then(() => {
    if (detenido) return
    proximoPaso = contexto.currentTime + 0.04
    temporizador = window.setInterval(() => {
      if (contexto.state !== 'running') return
      const limite = contexto.currentTime + 0.12
      while (proximoPaso < limite) {
        tocar(pasos[indice], proximoPaso)
        indice = (indice + 1) % pasos.length
        proximoPaso += segundosPorPaso
      }
    }, 25)
  }).catch(error => {
    options.onError?.(error)
    detener()
  })

  return { stop: detener }
}

export function startDisasterLoop(
  feature: Feature<Point, PropiedadesAudio>,
  options?: OpcionesReproduccion,
): AudioPlayback {
  const { type, severity } = feature.properties
  const [, latitude] = feature.geometry.coordinates
  const perfil = perfiles[type]
  const raiz = Math.floor(Math.abs(latitude)) % RAICES_QUINTAS.length
  const pasos = perfil.degrees.map((degree, index): PasoMelodico => ({
    type,
    degree,
    intensity: Math.max(0.3, Math.min(1, severity / 7)),
    chord: degree !== null && index % 4 === 0,
    percussion: degree !== null && [0, 4, 8, 12].includes(index),
  }))

  return iniciarSecuencia(pasos, 60 / perfil.bpm / 2, raiz, options)
}

export function startTimeMapLoop(
  marcas: readonly MarcaTimeMap[],
  options?: OpcionesReproduccion,
): AudioPlayback {
  if (marcas.length === 0) throw new Error('La gráfica no contiene datos para sonificar.')

  const pasos = marcas.map((marca, index): PasoMelodico => {
    const type = marca.dominant_type
    const densidad = Math.log2(marca.total + 1) / 5
    const degree = Math.min(ESCALA_QUINTAS.length - 1, Math.round(
      marca.max_severity * 0.65 + densidad * 4 + index % 3,
    ))
    const ritmo = perfiles[type].degrees
    return {
      type,
      degree,
      intensity: Math.max(0.25, Math.min(1, marca.max_severity / 10 + densidad * 0.35)),
      chord: marca.total >= 8 || marca.observed_count > 0,
      percussion: ritmo[index % ritmo.length] !== null,
    }
  })
  const raiz = marcas.reduce((suma, marca) => suma + Number(marca.period.slice(-2)), 0) % RAICES_QUINTAS.length

  return iniciarSecuencia(pasos, 0.28, raiz, options)
}
