import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { navegacion } from '../../configuracion/navegacion'
import { Icon } from '../ui/Icon'
import { FondoEstelar } from './FondoEstelar'
import { SelectorIdioma } from '../../configuracion/idioma'
import { useIdioma } from '../../configuracion/idiomaContexto'
import { proyecto } from '../../configuracion/proyecto'

export function MainLayout() {
  const { pathname, search } = useLocation()
  const { t, idioma } = useIdioma()
  const mapaCompleto = pathname === '/explorar'
  useEffect(() => {
    window.scrollTo(0, 0)
    const ingles: Record<string, string> = { '/': 'Home', '/explorar': 'Explore', '/observar': 'Observations', '/learn': 'Learn' }
    document.title = `${idioma === 'en' ? ingles[pathname] ?? '404' : navegacion.find(item => item.ruta === pathname)?.nombre ?? '404'} · ${proyecto.nombre}`
  }, [pathname, idioma])
  return <div className={mapaCompleto ? 'app-shell app-shell-map' : 'app-shell app-shell-space'}>
    {!mapaCompleto && <FondoEstelar/>}
    <a className="skip-link" href="#contenido">{t('Saltar al contenido', 'Skip to content')}</a>
    {!mapaCompleto && <header className="site-header"><Link to="/" className="project-brand"><img src={proyecto.logoEquipo} width="36" height="36" alt=""/><span>{proyecto.nombre}</span></Link><div className="map-header-actions"><a href={proyecto.github} target="_blank" rel="noreferrer">GitHub ↗</a><SelectorIdioma/></div></header>}
    <main id="contenido"><Outlet /></main>
    <nav className="bottom-navigation" aria-label={t('Principal', 'Main navigation')}>
      {navegacion.map(item => <NavLink key={item.ruta} to={`${item.ruta}${(pathname === '/explorar' || pathname === '/observar') && (item.ruta === '/explorar' || item.ruta === '/observar') ? search : ''}`} end={item.ruta === '/'}>
        <Icon name={item.icono} size={20}/><span>{item.ruta === '/' ? t('Inicio', 'Home') : item.ruta === '/explorar' ? t('Explorar', 'Explore') : item.ruta === '/observar' ? t('Observaciones', 'Observations') : t('Aprende', 'Learn')}</span>
      </NavLink>)}
    </nav>
  </div>
}
