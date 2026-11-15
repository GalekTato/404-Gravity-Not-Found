import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ContextoIdioma, useIdioma } from './idiomaContexto'
import type { Idioma } from './idiomaContexto'
export function IdiomaProvider({ children }: { children: ReactNode }) {
  const [idioma, cambiar] = useState<Idioma>(() => {
    try { return localStorage.getItem('terrasync-language') === 'en' ? 'en' : 'es' } catch { return 'es' }
  })
  useEffect(() => {
    document.documentElement.lang = idioma
    try { localStorage.setItem('terrasync-language', idioma) } catch { /* Storage can be disabled. */ }
  }, [idioma])
  return <ContextoIdioma.Provider value={{ idioma, cambiar, t: (es, en) => idioma === 'es' ? es : en }}>{children}</ContextoIdioma.Provider>
}
export function SelectorIdioma() {
  const { idioma, cambiar, t } = useIdioma()
  return <div className="language-switch" role="group" aria-label={t('Idioma', 'Language')}>
    <button type="button" lang="es" aria-pressed={idioma === 'es'} onClick={() => cambiar('es')}>ES</button>
    <button type="button" lang="en" aria-pressed={idioma === 'en'} onClick={() => cambiar('en')}>EN</button>
  </div>
}
