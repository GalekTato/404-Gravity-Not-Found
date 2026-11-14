import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { navegacion } from '../../configuracion/navegacion'
import { Icon } from '../ui/Icon'

export function MainLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0); document.title = `${navegacion.find(item => item.ruta === pathname)?.nombre ?? 'Página no encontrada'} · Earth Symphony` }, [pathname])
  return <div className="app-shell">
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="header">
      <Link to="/" className="brand" aria-label="Earth Symphony, inicio"><span className="brand-symbol"><Icon name="globe" size={31} /></span><span>earth<span className="brand-light">symphony</span><small>UNA NUEVA PERSPECTIVA</small></span></Link>
      <button className="menu-toggle icon-button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="navegacion" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></button>
      <nav id="navegacion" className={open ? 'navigation open' : 'navigation'} aria-label="Principal">{navegacion.map(item => <NavLink key={item.ruta} to={item.ruta} end={item.ruta === '/'} onClick={() => setOpen(false)}><Icon name={item.icono} size={17} />{item.nombre}</NavLink>)}</nav>
      <div className="header-meta"><span className="status-dot" /> ENFOQUE EN MÉXICO <span className="country-code">MX</span></div>
    </header>
    <main id="contenido"><Outlet /></main>
    <footer className="footer"><span>EARTH SYMPHONY <span className="footer-divider">/</span> La Tierra tiene mucho que contarnos.</span><span>Prototipo de interfaz <span className="status-dot" /> Sin datos científicos conectados</span></footer>
  </div>
}
