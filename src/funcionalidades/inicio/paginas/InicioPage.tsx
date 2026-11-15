import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useIdioma } from '../../../configuracion/idiomaContexto'
const SpaceGlobe = lazy(() => import('../componentes/SpaceGlobe').then(module => ({ default: module.SpaceGlobe })))

export function InicioPage() {
  const { t } = useIdioma()
  return <div className="home-space"><section className="hero-section space-hero">
    <div className="hero-copy"><h1>{t('La danza de la tierra en Mexico.', 'The dance of the Earth in Mexico.')}<br/><span>{t('Sigue su registro.', 'Follow its record.')}</span></h1><p className="hero-description">{t('Explora observaciones e indicadores de México por estado, fenómeno y mes. Consulta las fuentes y lleva los datos a tu análisis.', 'Explore observations and indicators across Mexico by state, hazard and month. Inspect their sources and take the data into your analysis.')}</p><div className="hero-actions"><Link className="button button-primary" to="/explorar">{t('Abrir el mapa', 'Open the map')} ↗</Link><Link className="text-link" to="/learn">{t('Cómo interpretar los datos', 'How to read the data')} →</Link></div></div>
    <Suspense fallback={<div className="space-experience space-placeholder" role="status">{t('Cargando el globo…', 'Loading the globe…')}</div>}><SpaceGlobe/></Suspense>
  </section><section className="home-paths"><span className="section-kicker">{t('De la consulta al análisis', 'From exploration to analysis')}</span><h2>{t('Tres formas de acercarte al territorio.', 'Three ways to explore the land.')}</h2><div>{[
    { ruta: '/explorar', numero: '01', titulo: t('Explora el mapa', 'Explore the map'), texto: t('Elige un estado y compara los meses con la línea del tiempo.', 'Choose a state and compare months with the timeline.') },
    { ruta: '/observar', numero: '02', titulo: t('Revisa los registros', 'Inspect the records'), texto: t('Consulta las fuentes y exporta tu selección a Excel.', 'Inspect the sources and export your selection to Excel.') },
    { ruta: '/learn', numero: '03', titulo: t('Aprende a interpretar', 'Learn to interpret'), texto: t('Distingue observaciones, indicadores y límites de la evidencia.', 'Distinguish observations, indicators and the limits of evidence.') },
  ].map(item => <Link to={item.ruta} key={item.ruta}><span>{item.numero}</span><h3>{item.titulo} ↗</h3><p>{item.texto}</p></Link>)}</div></section></div>
}
