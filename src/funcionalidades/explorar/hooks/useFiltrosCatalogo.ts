import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { esTipoDesastre } from '../servicios/predicciones'
import type { TipoDesastre } from '../servicios/predicciones'

export function useFiltrosCatalogo() {
  const [params, setParams] = useSearchParams()
  const mes = params.get('period') ?? ''
  const entidad = params.get('state') ?? ''
  const fenomeno = params.get('type')
  const periodo = /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : ''
  const estado = /^(0[1-9]|[12]\d|3[0-2])$/.test(entidad) ? entidad : ''
  const tipo = esTipoDesastre(fenomeno) ? fenomeno : undefined
  const actualizar = useCallback((campo: 'period' | 'state' | 'type', valor?: string) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (valor) next.set(campo, valor)
      else next.delete(campo)
      return next
    }, { replace: true })
  }, [setParams])
  const setPeriodo = useCallback((valor: string) => actualizar('period', valor), [actualizar])
  const setEstado = useCallback((valor?: string) => actualizar('state', valor), [actualizar])
  const setTipo = useCallback((valor?: TipoDesastre) => actualizar('type', valor), [actualizar])
  const consulta = new URLSearchParams()
  if (periodo) consulta.set('period', periodo)
  if (estado) consulta.set('state', estado)
  if (tipo) consulta.set('type', tipo)
  return { periodo, estado, tipo, actualizar, setPeriodo, setEstado, setTipo, consulta: consulta.toString() }
}
