import { useMemo } from 'react'
import type { AreaGeografica, ColeccionAreas, Entidad } from '../tipos/cartografia'

interface RegionInfoPanelProps {
  catalogo: readonly Entidad[]
  entidad?: Entidad
  municipios?: ColeccionAreas
  municipio?: AreaGeografica
  cargando: boolean
  dibujando?: boolean
  error?: string
  onEntidad: (clave: string) => void
  onMunicipio: (clave: string) => void
  onReintentar: () => void
  onReset: () => void
}

export function RegionInfoPanel({ catalogo, entidad, municipios, municipio, cargando, dibujando, error,
  onEntidad, onMunicipio, onReintentar, onReset }: RegionInfoPanelProps) {
  const opciones = useMemo(() => municipios?.features.slice().sort((a, b) => a.properties.nombre.localeCompare(b.properties.nombre, 'es')) ?? [], [municipios])
  return (
    <aside className="panel territory-panel" aria-label="Selección territorial">
      <p className="eyebrow">EXPLORA EL TERRITORIO</p>
      <label className="territory-field" htmlFor="entidad">Entidad federativa
        <select id="entidad" value={entidad?.clave ?? ''} disabled={!catalogo.length} onChange={e => onEntidad(e.target.value)}>
          <option value="">Todo México · 32 entidades</option>
          {catalogo.map(item => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}
        </select>
      </label>
      <label className="territory-field" htmlFor="municipio">Municipio o demarcación
        <select id="municipio" value={municipio?.properties.clave ?? ''} disabled={!entidad || cargando || !municipios} onChange={e => onMunicipio(e.target.value)}>
          <option value="">{cargando ? 'Cargando municipios…' : entidad ? 'Todos los municipios' : 'Selecciona una entidad'}</option>
          {opciones.map(item => <option key={item.properties.clave} value={item.properties.clave}>{item.properties.nombre}</option>)}
        </select>
      </label>
      {cargando && <p className="territory-status" role="status">{dibujando ? 'Dibujando los municipios en el mapa…' : 'Cargando la cartografía municipal local…'}</p>}
      {error && <div className="territory-error" role="alert"><p>{error}</p><button className="text-link" onClick={onReintentar}>Reintentar municipios</button></div>}
      <div className="territory-details" aria-live="polite">
        <h2>{municipio?.properties.nombre ?? entidad?.nombre ?? '32 entidades. Un solo territorio.'}</h2>
        {entidad ? <dl>
          <div><dt>Clave geoestadística</dt><dd>{municipio?.properties.clave ?? entidad.clave}</dd></div>
          <div><dt>{municipio ? 'Entidad' : 'Municipios / demarcaciones'}</dt><dd>{municipio ? entidad.nombre : entidad.municipios}</dd></div>
        </dl> : <p>Selecciona una entidad en el mapa o en la lista. Acércate para conocer sus divisiones municipales.</p>}
      </div>
      {entidad && <button className="button button-primary territory-reset" onClick={onReset}>Ver todo México</button>}
      <div className="panel-note">Fuente: INEGI, Marco Geoestadístico.<br/>Geometría: diciembre de 2025.<br/><a href="https://www.inegi.org.mx/servicios/catalogounico/" target="_blank" rel="noreferrer">Consultar fuente ↗</a></div>
    </aside>
  )
}
