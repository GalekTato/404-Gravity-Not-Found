import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '../componentes/estructura/MainLayout'
import { InicioPage } from '../funcionalidades/inicio/paginas/InicioPage'
import { ExplorarPage } from '../funcionalidades/explorar/paginas/ExplorarPage'
import { ObservacionesPage } from '../funcionalidades/observaciones/paginas/ObservacionesPage'
import { AprendamosPage } from '../funcionalidades/aprendamos/paginas/AprendamosPage'
import { NotFoundPage } from '../componentes/estructura/NotFoundPage'

export const router = createBrowserRouter([
  { element: <MainLayout />, children: [
    { path: '/', element: <InicioPage /> },
    { path: '/explorar', element: <ExplorarPage /> },
    { path: '/observar', element: <ObservacionesPage /> },
    { path: '/learn', element: <AprendamosPage /> },
    { path: '*', element: <NotFoundPage /> },
  ] },
], { basename: import.meta.env.BASE_URL })
