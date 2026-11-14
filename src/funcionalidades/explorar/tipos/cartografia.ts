import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { Ref } from 'react'

export interface PropiedadesArea { clave: string; entidad: string; nombre: string; abreviatura?: string }
export type AreaGeografica = Feature<Polygon | MultiPolygon, PropiedadesArea>
export type ColeccionAreas = FeatureCollection<Polygon | MultiPolygon, PropiedadesArea>
export type Limites = [number, number, number, number]
export interface Entidad extends PropiedadesArea {
  limites: Limites
  etiqueta: [number, number]
  municipios: number
}
export interface GeografiaMexico { estados: ColeccionAreas; catalogo: readonly Entidad[] }
export type EstadoCarga = 'cargando' | 'listo' | 'error'
export interface EstadoCapaMunicipal { clave?: string; estado: EstadoCarga; mensaje?: string }
export interface MapaHandle { zoom: (delta: number) => void; restablecer: () => void }
export interface MapaMexicoProps {
  ref?: Ref<MapaHandle>
  geografia: GeografiaMexico
  entidad?: Entidad
  municipios?: ColeccionAreas
  municipio?: string
  mostrarLimites: boolean
  mostrarMunicipios: boolean
  onEntidad: (clave: string) => void
  onMunicipio: (clave: string) => void
  onReadyChange: (ready: boolean) => void
  onEstadoCapaMunicipal: (estado: EstadoCapaMunicipal) => void
}
