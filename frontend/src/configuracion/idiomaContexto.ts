import { createContext, useContext } from 'react'
export type Idioma = 'es' | 'en'
export const ContextoIdioma = createContext({ idioma: 'es' as Idioma, cambiar: (_idioma: Idioma) => {}, t: (es: string, _en: string) => es })
export function useIdioma() { return useContext(ContextoIdioma) }
