import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { IdiomaProvider } from '../configuracion/idioma'

export default function App() {
  return <IdiomaProvider><RouterProvider router={router} /></IdiomaProvider>
}
