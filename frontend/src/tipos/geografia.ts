export interface Coordenadas { longitud: number; latitud: number }
export interface RegionEstudio { id: string; nombre: string; centro: Coordenadas; descripcion: string }
export interface VistaCamara { centro: Coordenadas; altura: number }
