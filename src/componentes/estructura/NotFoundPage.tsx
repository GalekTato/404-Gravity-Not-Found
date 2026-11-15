import { Link } from 'react-router-dom'
import { useIdioma } from '../../configuracion/idiomaContexto'
export function NotFoundPage() {
  const { t } = useIdioma()
  return <section className="content-page empty-page"><p className="section-kicker">404</p><h1>{t('Página no encontrada.', 'Page not found.')}</h1><p>{t('La página que buscas no existe.', 'The page you requested does not exist.')}</p><Link className="button button-primary" to="/">{t('Regresar al inicio', 'Go home')}</Link></section>
}
