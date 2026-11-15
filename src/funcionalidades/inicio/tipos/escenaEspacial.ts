export interface ControlEscenaEspacial {
  reproducir: (activo: boolean) => void
  restablecer: () => void
  acercar: (factor: number) => void
  destruir: () => void
}
export interface OpcionesEscenaEspacial {
  contenedor: HTMLDivElement
  encuadre: HTMLDivElement
  animar: boolean
  onLista: () => void
  onError: (mensaje: string) => void
}
