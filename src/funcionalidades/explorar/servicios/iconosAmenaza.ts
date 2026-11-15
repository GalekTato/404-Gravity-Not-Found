import type { TipoDesastre } from './predicciones'

// Shared 24 × 24 geometry for the map symbols and filter buttons.
export const ICONOS_AMENAZA: Record<TipoDesastre, readonly string[]> = {
  sismo: ['M2 12h4l3-8 6 16 3-8h4'],
  huracan: [
    'M20 3C12 0 4 5 4 12c0 3 2 5 5 5M4 21c8 3 16-2 16-9 0-3-2-5-5-5',
    'M16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0',
  ],
  sequia: [
    'M16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0',
    'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
  ],
  inundacion: [
    'M2 6c2-3 4 3 7 0s5 3 8 0 4 0 5 0',
    'M2 12c2-3 4 3 7 0s5 3 8 0 4 0 5 0',
    'M2 18c2-3 4 3 7 0s5 3 8 0 4 0 5 0',
  ],
  incendio: [
    'M12 2c1 6 7 7 7 13a7 7 0 0 1-14 0c0-3 2-5 4-7 0 3 1 4 2 4 2-3 1-6 1-10Z',
    'M12 14c-2 2-3 3-3 4a3 3 0 0 0 6 0c0-1-1-3-3-4Z',
  ],
}
