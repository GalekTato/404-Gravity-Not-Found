import { useEffect, useState } from 'react'
import { cargarGeografia, cargarMunicipios } from '../servicios/geografia'
import type { ColeccionAreas, GeografiaMexico } from '../tipos/cartografia'

export function useGeografia() {
  const [datos, setDatos] = useState<GeografiaMexico>()
  const [error, setError] = useState<string>()
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void cargarGeografia(controller.signal).then(data => {
      if (!controller.signal.aborted) setDatos(data)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'No se pudo cargar la geografía de México.')
    })
    return () => controller.abort()
  }, [intento])
  function reintentar() { setError(undefined); setDatos(undefined); setIntento(value => value + 1) }
  return { datos, error, reintentar }
}

export function useMunicipios(clave?: string) {
  const [resultado, setResultado] = useState<{ clave: string; datos?: ColeccionAreas; error?: string }>()
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (!clave) return
    const controller = new AbortController()
    void cargarMunicipios(clave, controller.signal).then(datos => {
      if (!controller.signal.aborted) setResultado({ clave, datos })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResultado({ clave, error: error instanceof Error ? error.message : 'No se pudieron cargar los municipios.' })
    })
    return () => controller.abort()
  }, [clave, intento])
  const actual = resultado?.clave === clave ? resultado : undefined
  function reintentar() { setResultado(undefined); setIntento(value => value + 1) }
  return { datos: actual?.datos, error: actual?.error, cargando: !!clave && !actual, reintentar }
}
