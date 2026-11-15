import { Link } from 'react-router-dom'
export function NotFoundPage() {
  return <section className="page-container empty-page"><p className="eyebrow">FUERA DE ÓRBITA · 404</p><h1>Volvamos a la Tierra.</h1><p>La página que buscas no existe.</p><Link className="button button-primary" to="/">Regresar al inicio</Link></section>
}
