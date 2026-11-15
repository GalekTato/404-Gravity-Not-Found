import { Icon } from '../../../componentes/ui/Icon'
import { useIdioma } from '../../../configuracion/idiomaContexto'
export function GlobeControls({ onZoom, onReset, disabled = false }: { onZoom: (factor: number) => void; onReset: () => void; disabled?: boolean }) {
  const { t } = useIdioma()
  return <div className="globe-controls" aria-label={t('Controles del mapa', 'Map controls')}><button className="icon-button" disabled={disabled} onClick={() => onZoom(1)} aria-label={t('Acercar mapa', 'Zoom in')}><Icon name="plus" /></button><button className="icon-button" disabled={disabled} onClick={() => onZoom(-1)} aria-label={t('Alejar mapa', 'Zoom out')}><Icon name="minus" /></button><button className="icon-button" disabled={disabled} onClick={onReset} aria-label={t('Regresar a México', 'Reset to Mexico')}><Icon name="target" /></button></div>
}
