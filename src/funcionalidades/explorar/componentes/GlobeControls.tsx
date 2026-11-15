import { Icon } from '../../../componentes/ui/Icon'
export function GlobeControls({ onZoom, onReset, disabled = false }: { onZoom: (factor: number) => void; onReset: () => void; disabled?: boolean }) {
  return <div className="globe-controls" aria-label="Controles del mapa"><button className="icon-button" disabled={disabled} onClick={() => onZoom(1)} aria-label="Acercar mapa"><Icon name="plus" /></button><button className="icon-button" disabled={disabled} onClick={() => onZoom(-1)} aria-label="Alejar mapa"><Icon name="minus" /></button><button className="icon-button" disabled={disabled} onClick={onReset} aria-label="Regresar a la vista de México"><Icon name="target" /></button></div>
}
