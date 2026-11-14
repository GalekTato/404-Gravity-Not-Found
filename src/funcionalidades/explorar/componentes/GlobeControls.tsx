import { Icon } from '../../../componentes/ui/Icon'
export function GlobeControls({ onZoom, onReset }: { onZoom: (factor: number) => void; onReset: () => void }) {
  return <div className="globe-controls" aria-label="Controles de la vista ilustrativa"><button className="icon-button" onClick={() => onZoom(.8)} aria-label="Acercar ilustración"><Icon name="plus" /></button><button className="icon-button" onClick={() => onZoom(1.25)} aria-label="Alejar ilustración"><Icon name="minus" /></button><button className="icon-button" onClick={onReset} aria-label="Regresar a la vista de México"><Icon name="target" /></button></div>
}
