import { useMemo } from 'react'
import { useIdioma } from '../../../configuracion/idiomaContexto'
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
  const { t } = useIdioma()
  const opciones = useMemo(() => municipios?.features.slice().sort((a, b) => a.properties.nombre.localeCompare(b.properties.nombre, 'es')) ?? [], [municipios])
  return (
    <div className="panel territory-panel">
      <p className="section-kicker">{t('Detalle territorial', 'Area details')}</p>
      <label className="territory-field" htmlFor="entidad">{t('Estado', 'State')}
        <select id="entidad" value={entidad?.clave ?? ''} disabled={!catalogo.length} onChange={e => onEntidad(e.target.value)}>
          <option value="">{t('Todo México', 'All Mexico')}</option>
          {catalogo.map(item => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}
        </select>
      </label>
      <label className="territory-field" htmlFor="municipio">{t('Municipio o demarcación', 'Municipality')}
        <select id="municipio" value={municipio?.properties.clave ?? ''} disabled={!entidad || cargando || !municipios} onChange={e => onMunicipio(e.target.value)}>
          <option value="">{cargando ? t('Cargando municipios…', 'Loading municipalities…') : entidad ? t('Todos los municipios', 'All municipalities') : t('Selecciona un estado', 'Select a state')}</option>
          {opciones.map(item => <option key={item.properties.clave} value={item.properties.clave}>{item.properties.nombre}</option>)}
        </select>
      </label>
      {cargando && <p className="territory-status" role="status">{dibujando ? t('Dibujando municipios…', 'Drawing municipalities…') : t('Cargando cartografía…', 'Loading boundaries…')}</p>}
      {error && <div className="territory-error" role="alert"><p>{t(error, 'Municipal boundaries could not be loaded.')}</p><button className="text-link" onClick={onReintentar}>{t('Reintentar municipios', 'Retry municipalities')}</button></div>}
      {entidad && <div className="territory-details" aria-live="polite">
        <h2>{municipio?.properties.nombre ?? entidad.nombre}</h2>
        <dl>
          <div><dt>{t('Clave geoestadística', 'Geographic code')}</dt><dd>{municipio?.properties.clave ?? entidad.clave}</dd></div>
          <div><dt>{municipio ? t('Estado', 'State') : t('Municipios', 'Municipalities')}</dt><dd>{municipio ? entidad.nombre : entidad.municipios}</dd></div>
        </dl>
      </div>}
      {entidad && <button className="button button-primary territory-reset" onClick={onReset}>{t('Ver todo México', 'View all Mexico')}</button>}
    </div>
  )
}
