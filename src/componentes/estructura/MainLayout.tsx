import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { navegacion } from '../../configuracion/navegacion'
import { Icon } from '../ui/Icon'
import { MiniTutorial } from '../ui/MiniTutorial'
import { FondoEstelar } from './FondoEstelar'
import { SelectorIdioma } from '../../configuracion/idioma'
import { useIdioma } from '../../configuracion/idiomaContexto'
import { proyecto } from '../../configuracion/proyecto'
import { precargarTimeMap } from '../../funcionalidades/explorar/servicios/predicciones'
import { ExplorarPage } from '../../funcionalidades/explorar/paginas/ExplorarPage'
import { playQuintasEasterEgg } from '../../utils/disasterSound'

export function MainLayout() {
  const { pathname, search } = useLocation()
  const { t, idioma } = useIdioma()
  const mapaCompleto = pathname === '/explorar'
  const [explorarPersistente, setExplorarPersistente] = useState(mapaCompleto)
  const [easterActivo, setEasterActivo] = useState(false)
  const [clicsLogo, setClicsLogo] = useState(0)
  const explorarMontado = mapaCompleto || explorarPersistente

  useEffect(() => {
    precargarTimeMap()
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    const ingles: Record<string, string> = { '/': 'Home', '/explorar': 'Explore', '/observar': 'Observations', '/learn': 'Learn' }
    document.title = `${idioma === 'en' ? ingles[pathname] ?? '404' : navegacion.find(item => item.ruta === pathname)?.nombre ?? '404'} · ${proyecto.nombre}`
  }, [pathname, idioma])

  function dispararEasterEgg() {
    playQuintasEasterEgg()
    setEasterActivo(true)
    window.setTimeout(() => setEasterActivo(false), 3000)
    window.open(proyecto.github, '_blank', 'noopener,noreferrer')
  }

  function clickBrand() {
    const siguiente = clicsLogo + 1
    if (siguiente >= 3) {
      setClicsLogo(0)
      dispararEasterEgg()
    } else {
      setClicsLogo(siguiente)
      window.setTimeout(() => setClicsLogo(0), 1500)
    }
  }

  return (
    <div
      className={mapaCompleto ? 'app-shell app-shell-map' : 'app-shell app-shell-space'}
      onClickCapture={() => { if (mapaCompleto && !explorarPersistente) setExplorarPersistente(true) }}
    >
      {!mapaCompleto && <FondoEstelar />}
      <a className="skip-link" href="#contenido">{t('Saltar al contenido', 'Skip to content')}</a>
      {!mapaCompleto && (
        <header className="site-header">
          <Link to="/" className="project-brand" onClick={clickBrand}>
            <img src={proyecto.logoEquipo} width="36" height="36" alt="" />
            <span>{proyecto.nombre}</span>
          </Link>
          <div className="map-header-actions">
            <MiniTutorial autoAbrir={pathname === '/'} />
            <a href={proyecto.github} target="_blank" rel="noreferrer">GitHub ↗</a>
            <SelectorIdioma />
          </div>
        </header>
      )}
      <main id="contenido">
        {explorarMontado && (
          <div
            className={mapaCompleto ? 'explorar-host-activa' : 'explorar-host-oculta'}
            aria-hidden={!mapaCompleto}
            inert={!mapaCompleto ? true : undefined}
          >
            <ExplorarPage activa={mapaCompleto} />
          </div>
        )}
        {!mapaCompleto && <Outlet />}
      </main>
      {pathname === '/' && (
        <footer className="project-footer" aria-label={t('Créditos del equipo', 'Team credits')}>
          <div className="footer-brand-col">
            <strong>{proyecto.nombre}</strong> · <span>{proyecto.equipo}</span>
            <p className="footer-members" aria-label={t('Integrantes por orden alfabético', 'Team members in alphabetical order')}>
              {proyecto.integrantes.join(' · ')}
            </p>
          </div>
          <div className="footer-actions-col">
            <button
              type="button"
              className="easter-egg-trigger"
              onClick={dispararEasterEgg}
              title={t('Anomalía gravitacional 404 — Abrir repositorio en GitHub', 'Gravitational anomaly 404 — Open GitHub repository')}
            >
              🛰️ 404-GNF · {t('Repositorio secreto', 'Secret Repo')} ↗
            </button>
            {easterActivo && (
              <span role="status" className="easter-egg-toast">
                {t('¡Señal orbital capturada! Abriendo GitHub…', 'Orbital signal locked! Opening GitHub…')}
              </span>
            )}
          </div>
        </footer>
      )}
      <nav className="bottom-navigation" aria-label={t('Principal', 'Main navigation')}>
        {navegacion.map(item => (
          <NavLink
            key={item.ruta}
            to={`${item.ruta}${(pathname === '/explorar' || pathname === '/observar') && (item.ruta === '/explorar' || item.ruta === '/observar') ? search : ''}`}
            end={item.ruta === '/'}
          >
            <Icon name={item.icono} size={20} />
            <span>
              {item.ruta === '/'
                ? t('Inicio', 'Home')
                : item.ruta === '/explorar'
                  ? t('Explorar', 'Explore')
                  : item.ruta === '/observar'
                    ? t('Observaciones', 'Observations')
                    : t('Aprende', 'Learn')}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
