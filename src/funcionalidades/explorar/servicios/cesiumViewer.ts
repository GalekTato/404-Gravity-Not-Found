import { buildModuleUrl, Cartesian3, Color, Credit, EllipsoidTerrainProvider, Math as CesiumMath, TileMapServiceImageryProvider, Viewer } from 'cesium'
import type { VistaCamara } from '../../../tipos/geografia'

export const alturaMinima = 100_000
export const alturaMaxima = 25_000_000

export function destinoCamara(vista: VistaCamara) {
  return {
    destination: Cartesian3.fromDegrees(vista.centro.longitud, vista.centro.latitud, vista.altura),
    orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
  }
}

// Sin proveedores ion implícitos: todos los recursos proceden del propio despliegue.
export function crearVisor(container: HTMLDivElement, vista: VistaCamara) {
  const viewer = new Viewer(container, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    baseLayer: false,
    terrainProvider: new EllipsoidTerrainProvider(),
    geocoder: false,
    homeButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    showRenderLoopErrors: false,
    shouldAnimate: false,
  })
  viewer.scene.backgroundColor = Color.fromCssColorString('#080d13')
  viewer.scene.globe.baseColor = Color.fromCssColorString('#183642')
  viewer.scene.globe.enableLighting = false
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = alturaMinima
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = alturaMaxima
  viewer.camera.setView(destinoCamara(vista))
  viewer.canvas.setAttribute('aria-label', 'Globo terrestre 3D. Arrastra para navegar y usa la rueda para acercar. Los botones permiten zoom y volver a México.')
  return viewer
}

export function cargarMapaBase() {
  return TileMapServiceImageryProvider.fromUrl(buildModuleUrl('Assets/Textures/NaturalEarthII'), {
    credit: new Credit('Natural Earth · mapa base de referencia, no observaciones NISAR', true),
  })
}
