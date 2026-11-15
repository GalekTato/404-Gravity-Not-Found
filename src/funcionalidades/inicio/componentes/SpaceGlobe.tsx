import { useEffect, useRef, useState } from 'react'
import { crearEscenaEspacial } from '../servicios/escenaEspacial'
import type { ControlEscenaEspacial } from '../tipos/escenaEspacial'
import { Icon } from '../../../componentes/ui/Icon'
import { useIdioma } from '../../../configuracion/idiomaContexto'

export function SpaceGlobe() {
  const { t } = useIdioma()
  const container = useRef<HTMLDivElement>(null)
  const encuadre = useRef<HTMLDivElement>(null)
  const escena = useRef<ControlEscenaEspacial | null>(null)
  const [lista, setLista] = useState(false)
  const [error, setError] = useState<string>()
  const [intento, setIntento] = useState(0)
  const [animar, setAnimar] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (!container.current || !encuadre.current) return
    let activa = true
    function fallo(mensaje: string) { if (activa) { setError(mensaje); setLista(false) } }
    try {
      escena.current = crearEscenaEspacial({ contenedor: container.current, encuadre: encuadre.current,
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
  return <div className="space-experience" aria-label={t('Tierra y órbita ilustrativa de NISAR', 'Earth and illustrative NISAR orbit')}>
    <div ref={container} className="space-canvas" aria-busy={!lista && !error}/>
    <div ref={encuadre} className="space-interface">
    {!lista && <div className="space-feedback" role={error ? 'alert' : 'status'}><p>{error ? t(error, 'The globe could not be loaded.') : t('Preparando el globo…', 'Preparing the globe…')}</p>{error && <button className="button button-primary" onClick={reintentar}>{t('Volver a intentar', 'Retry')}</button>}</div>}
    <div className="space-interaction-hint">{t('Arrastra para girar', 'Drag to rotate')}</div>
    <div className="space-controls" aria-label={t('Controles del globo', 'Globe controls')}>
      <button disabled={!lista} className="space-play" aria-pressed={!animar} onClick={() => setAnimar(value => !value)}>{animar ? t('Pausar recorrido', 'Pause orbit') : t('Reanudar recorrido', 'Resume orbit')}</button>
      <button disabled={!lista} className="icon-button" aria-label={t('Acercar globo', 'Zoom in')} onClick={() => escena.current?.acercar(.9)}><Icon name="plus" size={17}/></button>
      <button disabled={!lista} className="icon-button" aria-label={t('Alejar globo', 'Zoom out')} onClick={() => escena.current?.acercar(1.1)}><Icon name="minus" size={17}/></button>
      <button disabled={!lista} className="icon-button" aria-label={t('Restablecer México', 'Reset Mexico view')} onClick={() => escena.current?.restablecer()}><Icon name="target" size={17}/></button>
    </div>
    </div>
  </div>
}
