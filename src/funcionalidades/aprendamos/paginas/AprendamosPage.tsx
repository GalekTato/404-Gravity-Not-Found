import { temas } from '../servicios/temas'
import { Icon } from '../../../componentes/ui/Icon'
export function AprendamosPage() {
  return <section className="page-container"><p className="eyebrow">03 / APRENDER</p><h1>La ciencia, más cerca.</h1><p className="page-intro">No necesitas ser especialista para empezar a mirar diferente. Esta será nuestra biblioteca de observación terrestre.</p><div className="learning-grid">{temas.map((tema, i) => <article className="module-card" key={tema.id}><div className="card-top"><Icon name={i === 0 ? 'satellite' : 'book'} size={26}/><span className="card-number">0{i + 1} / APRENDER</span></div><h2>{tema.titulo}</h2><p>{tema.descripcion}</p><span className="small-badge">CONTENIDO EN PREPARACIÓN</span></article>)}</div><p className="source-note">Para conocer la misión desde su fuente: <a href="https://nisar.jpl.nasa.gov/" target="_blank" rel="noreferrer">sitio oficial de NISAR ↗</a></p></section>
}
