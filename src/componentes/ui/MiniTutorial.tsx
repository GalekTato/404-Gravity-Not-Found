import { useId, useRef, useState } from 'react'
import { useIdioma } from '../../configuracion/idiomaContexto'

export function MiniTutorial() {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [paso, setPaso] = useState(0)
  const { t } = useIdioma()
  const pasos = [
    [t('Elige tu territorio', 'Choose your area'), t('Haz clic en un estado o usa el selector. El mapa, la línea del tiempo y la exportación compartirán ese filtro.', 'Click a state or use the selector. The map, timeline and export will share that filter.')],
    [t('Recorre el tiempo', 'Move through time'), t('Arrastra el slider, usa las flechas del teclado o elige un mes. Filtra por fenómeno para comparar sus registros.', 'Drag the slider, use the arrow keys or select a month. Filter by hazard to compare its records.')],
    [t('Lee la evidencia', 'Read the evidence'), t('Abre un punto para revisar fecha, fuente y evidencia. Un indicador proxy no confirma un evento ni constituye una alerta oficial.', 'Open a point to inspect its date, source and evidence. A proxy indicator does not confirm an event and is not an official alert.')],
    [t('Lleva los datos contigo', 'Take the data with you'), t('Excel descarga únicamente el mes, estado y fenómeno seleccionados. En Observaciones puedes consultar esos mismos registros en una tabla.', 'Excel downloads only the selected month, state and hazard. Observations presents the same records in a table.')],
  ]
  return <><button className="quiet-button" onClick={() => { setPaso(0); dialog.current?.showModal() }}>{t('Cómo usar', 'Quick guide')}</button>
    <dialog ref={dialog} className="tutorial-dialog" aria-labelledby={titleId}>
      <div className="dialog-top"><span>{t('Guía rápida', 'Quick guide')} · {paso + 1}/4</span><button autoFocus aria-label={t('Cerrar tutorial', 'Close tutorial')} onClick={() => dialog.current?.close()}>×</button></div>
      <div className="tutorial-number" aria-hidden="true">0{paso + 1}</div><h2 id={titleId}>{pasos[paso]![0]}</h2><p>{pasos[paso]![1]}</p>
      <div className="dialog-actions"><button disabled={paso === 0} onClick={() => setPaso(value => value - 1)}>{t('Anterior', 'Back')}</button><button className="button button-primary" onClick={() => paso === 3 ? dialog.current?.close() : setPaso(value => value + 1)}>{paso === 3 ? t('Explorar', 'Explore') : t('Siguiente', 'Next')}</button></div>
    </dialog></>
}
