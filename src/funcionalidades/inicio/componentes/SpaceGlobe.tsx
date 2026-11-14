import { useEffect, useRef, useState } from 'react'
import { crearEscenaEspacial } from '../servicios/escenaEspacial'
import type { ControlEscenaEspacial } from '../tipos/escenaEspacial'
import { Icon } from '../../../componentes/ui/Icon'

export function SpaceGlobe() {
  const container = useRef<HTMLDivElement>(null)
  const etiqueta = useRef<HTMLDivElement>(null)
  const escena = useRef<ControlEscenaEspacial | null>(null)
  const [lista, setLista] = useState(false)
  const [error, setError] = useState<string>()
  const [intento, setIntento] = useState(0)
  const [animar, setAnimar] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (!container.current || !etiqueta.current) return
    let activa = true
    function fallo(mensaje: string) { if (activa) { setError(mensaje); setLista(false) } }
    try {
      escena.current = crearEscenaEspacial({ contenedor: container.current, etiqueta: etiqueta.current,
        animar: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        onLista: () => { if (activa) setLista(true) }, onError: fallo })
    } catch { fallo('Tu navegador no pudo iniciar el globo 3D. Comprueba WebGL y vuelve a intentarlo.') }
    return () => { activa = false; escena.current?.destruir(); escena.current = null }
  }, [intento])

  useEffect(() => { escena.current?.reproducir(animar) }, [animar, intento])
  useEffect(() => {
    const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)')
    function actualizar() { if (preferencia.matches) setAnimar(false) }
    preferencia.addEventListener('change', actualizar)
    return () => preferencia.removeEventListener('change', actualizar)
  }, [])
  function reintentar() { setError(undefined); setLista(false); setIntento(value => value + 1) }
  return <div className="space-experience" aria-label="Tierra y recorrido ilustrativo de NISAR">
    <div ref={container} className="space-canvas" aria-busy={!lista && !error}/>
    <div ref={etiqueta} className="satellite-label" hidden><span className="status-dot"/><span>NISAR<small>RECORRIDO ILUSTRATIVO</small></span></div>
    {!lista && <div className="space-feedback" role={error ? 'alert' : 'status'}><p>{error ?? 'Preparando una nueva perspectiva…'}</p>{error && <button className="button button-primary" onClick={reintentar}>Volver a intentar</button>}</div>}
    <div className="space-interaction-hint">ARRASTRA PARA GIRAR <span>·</span> ACÉRCATE PARA EXPLORAR</div>
    <div className="space-controls" aria-label="Controles de la escena espacial">
      <button disabled={!lista} className="space-play" aria-pressed={!animar} onClick={() => setAnimar(value => !value)}>{animar ? 'Pausar recorrido' : 'Reanudar recorrido'}</button>
      <button disabled={!lista} className="icon-button" aria-label="Acercar globo" onClick={() => escena.current?.acercar(.9)}><Icon name="plus" size={17}/></button>
      <button disabled={!lista} className="icon-button" aria-label="Alejar globo" onClick={() => escena.current?.acercar(1.1)}><Icon name="minus" size={17}/></button>
      <button disabled={!lista} className="icon-button" aria-label="Restablecer vista de México" onClick={() => escena.current?.restablecer()}><Icon name="target" size={17}/></button>
    </div>
    <p className="space-disclaimer">Órbita y modelo ilustrativos, sin escala ni telemetría en tiempo real.<br/><a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/" target="_blank" rel="noreferrer">Textura terrestre: NASA · Blue Marble</a></p>
  </div>
}
