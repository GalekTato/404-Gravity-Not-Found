import type { Feature, Point } from 'geojson'
import type { MarcaTimeMap, PropiedadesDesastre, TipoDesastre } from '../funcionalidades/explorar/servicios/predicciones'

type PropiedadesAudio = Pick<
  PropiedadesDesastre,
  'type' | 'severity' | 'radius_km' | 'score' | 'probability' | 'observed' | 'state_clave'
>

interface PasoMelodico {
  type: TipoDesastre
  degree: number | null
  intensity: number
  chord: boolean
  percussion: boolean
}

interface OpcionesReproduccion {
  idioma?: 'es' | 'en'
  onStep?: (index: number, notaNombre: string) => void
  onStop?: () => void
  onError?: (error: unknown) => void
}

export interface AudioPlayback {
  stop: () => void
}

export const INSTRUMENTOS_DESASTRE: Record<TipoDesastre, string> = {
  sismo: 'percusión tectónica y quintas graves',
  huracan: 'sintetizador orbital por quintas',
  sequia: 'sintetizador minimalista de quintas abiertas',
  inundacion: 'campanas fluidas en ciclo de quintas',
  incendio: 'sintetizador armónico de quintas rápidas',
}

export const INSTRUMENTOS_DESASTRE_EN: Record<TipoDesastre, string> = {
  sismo: 'tectonic percussion & low fifths',
  huracan: 'orbital fifths synthesizer',
  sequia: 'minimalist open-fifths synth',
  inundacion: 'fluid circle-of-fifths bells',
  incendio: 'fast harmonic-fifths synth',
}

export function descripcionInstrumento(tipo: TipoDesastre, idioma: 'es' | 'en'): string {
  return idioma === 'es' ? INSTRUMENTOS_DESASTRE[tipo] : INSTRUMENTOS_DESASTRE_EN[tipo]
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
    gain: 0.11,
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
    gain: 0.09,
    filter: 1400,
  },
}

// Circle-of-fifths interval progression folded into a two-octave register.
export const ESCALA_QUINTAS = [0, 7, 14, 2, 9, 16, 4, 11, 18, 6, 13, 20] as const
export const RAICES_QUINTAS = [36, 43, 38, 45, 40, 47, 42, 37, 44, 39, 46, 41] as const
const NOMBRES_NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

let detenerReproduccionActiva: (() => void) | undefined

export function stopActiveAudio(): void {
  detenerReproduccionActiva?.()
}

function midiANotaNombre(midi: number): string {
  const clase = ((midi % 12) + 12) % 12
  const octava = Math.floor(midi / 12) - 1
  return `${NOMBRES_NOTAS[clase]}${octava}`
}

function frecuenciaNota(degree: number, rootIndex: number): { hz: number; nombre: string } {
  const root = RAICES_QUINTAS[rootIndex % RAICES_QUINTAS.length]!
  const midi = root + ESCALA_QUINTAS[degree % ESCALA_QUINTAS.length]!
  return {
    hz: 440 * 2 ** ((midi - 69) / 12),
    nombre: midiANotaNombre(midi),
  }
}

function crearAudioContext(): AudioContext {
  const ConstructorAudio = window.AudioContext
  if (!ConstructorAudio) {
    throw new Error('Este navegador no admite reproducción de audio Web Audio API.')
  }
  return new ConstructorAudio()
}

function iniciarSecuencia(
  pasos: readonly PasoMelodico[],
  segundosPorPaso: number,
  rootIndex: number,
  options: OpcionesReproduccion = {},
): AudioPlayback {
  detenerReproduccionActiva?.()

  const contexto = crearAudioContext()
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
      void contexto.close().catch(() => {})
    }, 100)
    options.onStop?.()
  }

  detenerReproduccionActiva = detener

  function tocar(paso: PasoMelodico, pasoIdx: number, cuando: number) {
    const perfil = perfiles[paso.type]
    const volumen = Math.max(0.035, Math.min(perfil.gain, perfil.gain * paso.intensity))
    const pan = paso.percussion ? -0.18 : 0.18
    const notas = paso.degree === null
      ? []
      : paso.chord
        ? [paso.degree, (paso.degree + 1) % ESCALA_QUINTAS.length]
        : [paso.degree]

    let etiquetaNota = '—'
    for (const [indiceNota, degree] of notas.entries()) {
      const { hz, nombre } = frecuenciaNota(degree, rootIndex)
      if (indiceNota === 0) etiquetaNota = paso.chord ? `${nombre}+5a` : nombre
      const oscilador = contexto.createOscillator()
      const filtro = contexto.createBiquadFilter()
      const envolvente = contexto.createGain()
      const paneo = contexto.createStereoPanner()
      const inicio = cuando + indiceNota * 0.018
      const duracion = Math.max(0.12, segundosPorPaso * (paso.chord ? 0.86 : 0.72))

      oscilador.type = perfil.wave
      oscilador.frequency.setValueAtTime(hz, inicio)
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
      const base = frecuenciaNota(0, rootIndex).hz
      bajo.type = perfil.bassWave
      bajo.frequency.setValueAtTime(Math.max(38, base / 2), cuando)
      bajo.frequency.exponentialRampToValueAtTime(38, cuando + 0.16)
      golpe.gain.setValueAtTime(0.0001, cuando)
      golpe.gain.exponentialRampToValueAtTime(0.12 * paso.intensity, cuando + 0.012)
      golpe.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.2)
      bajo.connect(golpe).connect(salida)
      bajo.start(cuando)
      bajo.stop(cuando + 0.22)
    }

    options.onStep?.(pasoIdx, etiquetaNota)
  }

  void contexto.resume().then(() => {
    if (detenido) return
    proximoPaso = contexto.currentTime + 0.04
    temporizador = window.setInterval(() => {
      if (contexto.state !== 'running') return
      const limite = contexto.currentTime + 0.12
      while (proximoPaso < limite) {
        tocar(pasos[indice]!, indice, proximoPaso)
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
  const { type, severity, probability, score, observed, state_clave } = feature.properties
  const [, latitude] = feature.geometry.coordinates
  const perfil = perfiles[type]
  const claveNum = state_clave ? Number.parseInt(state_clave, 10) : Math.floor(Math.abs(latitude))
  const raiz = (Number.isFinite(claveNum) ? claveNum : Math.floor(Math.abs(latitude))) % RAICES_QUINTAS.length
  const probBoost = typeof probability === 'number' ? Math.round(probability * 3) : typeof score === 'number' ? Math.round(Math.abs(score)) % 3 : 0

  const pasos = perfil.degrees.map((degree, index): PasoMelodico => ({
    type,
    degree: degree === null ? null : (degree + probBoost) % ESCALA_QUINTAS.length,
    intensity: Math.max(0.3, Math.min(1, severity / 7)),
    chord: degree !== null && (observed ? index % 2 === 0 : index % 4 === 0),
    percussion: degree !== null && [0, 4, 8, 12].includes(index),
  }))

  return iniciarSecuencia(pasos, 60 / perfil.bpm / 2, raiz, options)
}

export function startTimeMapLoop(
  marcas: readonly MarcaTimeMap[],
  options?: OpcionesReproduccion,
): AudioPlayback {
  if (marcas.length === 0) {
    throw new Error(
      options?.idioma === 'en'
        ? 'The timeline has no records to sonify.'
        : 'La gráfica no contiene datos para sonificar.',
    )
  }

  const pasos = marcas.map((marca, index): PasoMelodico => {
    const type = marca.dominant_type
    const densidad = Math.log2(marca.total + 1) / 5
    const degree = Math.min(
      ESCALA_QUINTAS.length - 1,
      Math.round(marca.max_severity * 0.65 + densidad * 4 + (index % 3)),
    )
    const ritmo = perfiles[type].degrees
    return {
      type,
      degree,
      intensity: Math.max(0.25, Math.min(1, marca.max_severity / 10 + densidad * 0.35)),
      chord: marca.total >= 6 || marca.observed_count > 0,
      percussion: ritmo[index % ritmo.length] !== null,
    }
  })
  const raiz = marcas.reduce((suma, marca) => suma + Number(marca.period.slice(-2)), 0) % RAICES_QUINTAS.length

  return iniciarSecuencia(pasos, 0.24, raiz, options)
}

export function playQuintasEasterEgg(): void {
  try {
    const ctx = crearAudioContext()
    const master = ctx.createGain()
    master.gain.value = 0.2
    master.connect(ctx.destination)
    void ctx.resume().then(() => {
      const now = ctx.currentTime + 0.02
      ;[0, 1, 2, 4, 6].forEach((deg, idx) => {
        const osc = ctx.createOscillator()
        const env = ctx.createGain()
        const { hz } = frecuenciaNota(deg, 0)
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(hz * 2, now + idx * 0.07)
        env.gain.setValueAtTime(0.0001, now + idx * 0.07)
        env.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.07 + 0.02)
        env.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.45)
        osc.connect(env).connect(master)
        osc.start(now + idx * 0.07)
        osc.stop(now + idx * 0.07 + 0.48)
      })
      window.setTimeout(() => { void ctx.close().catch(() => {}) }, 1000)
    })
  } catch {
    // Ignore audio context errors on restricted devices.
  }
}
