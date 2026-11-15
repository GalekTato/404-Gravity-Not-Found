import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useIdioma } from '../../configuracion/idiomaContexto'

const STORAGE_KEY = 'earthsync-tutorial-dismissed'

export function MiniTutorial({ autoAbrir = false }: { autoAbrir?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()
  const [paso, setPaso] = useState(0)
  const [noMostrarMas, setNoMostrarMas] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })
  const { t } = useIdioma()

  const pasos = [
    {
      titulo: t('Elige tu territorio (32 entidades)', 'Choose your territory (32 states)'),
      texto: t(
        'Usa el selector superior o haz clic sobre cualquier estado en el mapa. El mapa, el TimeMap, las gráficas de música y la exportación Excel se filtran de forma sincronizada por esa entidad federativa.',
        'Use the top selector or click any state on the map. The map, TimeMap, fifths sonification, and Excel export automatically synchronize to that federal entity.',
      ),
      nota: t('Consejo: abre "Municipios y capas" para bajar al nivel municipal.', 'Tip: open "Municipalities & layers" to zoom into municipal polygons.'),
    },
    {
      titulo: t('TimeMap histórico y música por quintas', 'Historical TimeMap & circle-of-fifths audio'),
      texto: t(
        'Recorre los meses con el deslizador o botones ← / → en lugar de buscar fechas a ciegas. Pulsa "♫ Escuchar quintas" para convertir la severidad, frecuencia y tipo de evento en una progresión armónica por círculo de quintas.',
        'Scrub months via the slider or ← / → buttons instead of guessing dates blindly. Press "♫ Listen (5ths)" to transform severity, event count, and hazard type into a circle-of-fifths harmonic sequence.',
      ),
      nota: t('También puedes escuchar la firma acústica de un punto individual al abrirlo.', 'You can also listen to an individual event’s acoustic signature from its marker popup.'),
    },
    {
      titulo: t('Lee la evidencia y los modelos', 'Inspect evidence & data-mining models'),
      texto: t(
        'Al tocar un marcador verás su fecha, radio de impacto, probabilidad calibrada y etiqueta de evidencia: observada, supervisada o indicador indirecto (proxy). Nunca reemplaza una alerta oficial.',
        'Selecting a marker reveals its date, impact radius, calibrated probability, and evidence tag: observed, supervised, or proxy indicator. It does not replace official alerts.',
      ),
      nota: t('Usa las flechas ← / → del teclado para navegar entre pasos de esta guía.', 'Use your keyboard ← / → arrow keys to step through this guide.'),
    },
    {
      titulo: t('Observaciones y exportación Excel', 'Observations & Excel export'),
      texto: t(
        'En la pestaña Observaciones consultarás el resumen interpretativo por sensor (GPM, MODIS, GLDAS, ALOS, NISAR, FIRMS, USGS, IBTrACS), la cobertura nacional y marítima (200 mn ZEE) y la tabla descargable en Excel.',
        'In Observations you can review sensor-level data interpretations (GPM, MODIS, GLDAS, ALOS, NISAR, FIRMS, USGS, IBTrACS), national + maritime EEZ (200 nm) coverage, and export the table to Excel.',
      ),
      nota: t('Tu filtro de estado, mes y fenómeno se conserva automáticamente entre pestañas.', 'Your active state, month, and hazard filters carry over seamlessly across tabs.'),
    },
    {
      titulo: t('Aprendizaje, minería y Easter Egg', 'Learning, data mining & Easter Egg'),
      texto: t(
        'En Aprende podrás explorar la arquitectura matemática de los 6 modelos de minería de datos y sus métricas de backtesting. Además, busca el botón orbital "404-GNF" en la barra inferior para desbloquear el enlace secreto al repositorio en GitHub.',
        'In Learn you can inspect the mathematical architecture of our 6 data-mining models and backtesting metrics. Also spot the orbital "404-GNF" badge in the footer to unlock a musical shortcut to the GitHub repository.',
      ),
      nota: t('Puedes cambiar entre ES y EN en cualquier momento desde la esquina superior derecha.', 'Switch seamlessly between ES and EN anytime from the top-right toggle.'),
    },
  ]

  const cerrar = useCallback(() => {
    try {
      if (noMostrarMas) localStorage.setItem(STORAGE_KEY, '1')
    } catch { /* ignore */ }
    dialog.current?.close()
  }, [noMostrarMas])

  useEffect(() => {
    if (!autoAbrir || noMostrarMas) return
    try {
      if (sessionStorage.getItem('earthsync-tutorial-shown-session') === '1') return
      sessionStorage.setItem('earthsync-tutorial-shown-session', '1')
    } catch { /* ignore */ }
    const id = window.setTimeout(() => {
      if (dialog.current && !dialog.current.open) dialog.current.showModal()
    }, 550)
    return () => window.clearTimeout(id)
  }, [autoAbrir, noMostrarMas])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!dialog.current?.open) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPaso(prev => Math.min(pasos.length - 1, prev + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPaso(prev => Math.max(0, prev - 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pasos.length])

  const actual = pasos[paso]!

  return (
    <>
      <button
        type="button"
        className="quiet-button"
        onClick={() => { setPaso(0); dialog.current?.showModal() }}
        aria-haspopup="dialog"
      >
        {t('Cómo usar', 'Quick guide')}
      </button>
      <dialog
        ref={dialog}
        className="tutorial-dialog"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onCancel={e => { e.preventDefault(); cerrar() }}
      >
        <div className="dialog-top">
          <span>{t('Guía interactiva', 'Interactive guide')} · {paso + 1}/{pasos.length}</span>
          <button type="button" autoFocus aria-label={t('Cerrar tutorial', 'Close tutorial')} onClick={cerrar}>×</button>
        </div>

        <div className="tutorial-dots" role="tablist" aria-label={t('Pasos del tutorial', 'Tutorial steps')}>
          {pasos.map((item, idx) => (
            <button
              key={item.titulo}
              type="button"
              role="tab"
              aria-selected={idx === paso}
              aria-label={`${t('Paso', 'Step')} ${idx + 1}: ${item.titulo}`}
              className={idx === paso ? 'tutorial-dot active' : 'tutorial-dot'}
              onClick={() => setPaso(idx)}
            />
          ))}
        </div>

        <div className="tutorial-number" aria-hidden="true">0{paso + 1}</div>
        <h2 id={titleId}>{actual.titulo}</h2>
        <p id={descId} aria-live="polite">{actual.texto}</p>
        <p className="tutorial-hint">{actual.nota}</p>

        <label className="tutorial-optout">
          <input
            type="checkbox"
            checked={noMostrarMas}
            onChange={e => {
              const checked = e.target.checked
              setNoMostrarMas(checked)
              try {
                if (checked) localStorage.setItem(STORAGE_KEY, '1')
                else localStorage.removeItem(STORAGE_KEY)
              } catch { /* ignore */ }
            }}
          />
          <span>{t('No volver a mostrar automáticamente al entrar', "Don't show automatically on startup")}</span>
        </label>

        <div className="dialog-actions">
          <button type="button" disabled={paso === 0} onClick={() => setPaso(value => value - 1)}>
            ← {t('Anterior', 'Back')}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => (paso === pasos.length - 1 ? cerrar() : setPaso(value => value + 1))}
          >
            {paso === pasos.length - 1 ? t('¡Listo, explorar!', 'Ready, explore!') : `${t('Siguiente', 'Next')} →`}
          </button>
        </div>
      </dialog>
    </>
  )
}
