import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { navegacion } from '../../configuracion/navegacion'
import { Icon } from '../ui/Icon'

export function MainLayout() {
  const { pathname } = useLocation()
  const mapaCompleto = pathname === '/explorar'
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${navegacion.find(item => item.ruta === pathname)?.nombre ?? 'Página no encontrada'} · México`
  }, [pathname])
  return <div className={mapaCompleto ? 'app-shell app-shell-map' : pathname === '/' ? 'app-shell app-shell-space' : 'app-shell'}>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <main id="contenido"><Outlet /></main>
    {!mapaCompleto && <footer className="footer"><span>La Tierra tiene mucho que contarnos.</span><a className="underline underline-offset-4" href={`${import.meta.env.BASE_URL}creditos-iconos.txt`} target="_blank" rel="noreferrer">Iconos: Solar · 480 Design</a><span>Prototipo de interfaz <span className="status-dot" /> Sin datos científicos conectados</span></footer>}
    <nav className="bottom-navigation" aria-label="Principal">
      {navegacion.map(item => <NavLink key={item.ruta} to={item.ruta} end={item.ruta === '/'}>
        <Icon name={item.icono} size={20}/><span>{item.nombre}</span>
      </NavLink>)}
    </nav>
  </div>
}
