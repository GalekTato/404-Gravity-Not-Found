import { AdditiveBlending, AmbientLight, BackSide, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, Group, Line, LineBasicMaterial, LineLoop, Material, Mesh, MeshBasicMaterial, MeshPhongMaterial, PerspectiveCamera, Points, Scene, ShaderMaterial, SphereGeometry, Spherical, SRGBColorSpace, TextureLoader, Vector3, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { crearModeloNisar } from './modeloNisar'
import type { ControlEscenaEspacial, OpcionesEscenaEspacial } from '../tipos/escenaEspacial'

const radioTierra = 1.5
const radioOrbita = 2.12
const faseInicial = .58
const distanciaInicial = 7.25
const dosPi = Math.PI * 2

function puntoGeografico(longitud: number, latitud: number, radio: number) {
  const lon = longitud * Math.PI / 180
  const lat = latitud * Math.PI / 180
  return new Vector3(radio * Math.cos(lat) * Math.cos(lon), radio * Math.sin(lat), -radio * Math.cos(lat) * Math.sin(lon))
}

function crearEstrellas() {
  let semilla = 404
  function aleatorio() { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296 }
  const posiciones: number[] = [], tamanos: number[] = [], fases: number[] = []
  for (let i = 0; i < 4500; i++) {
    const angulo = aleatorio() * dosPi
    const vertical = aleatorio() * 2 - 1
    const radio = 20 + aleatorio() * 30
    const plano = Math.sqrt(1 - vertical * vertical)
    posiciones.push(Math.cos(angulo) * plano * radio, vertical * radio, Math.sin(angulo) * plano * radio)
    tamanos.push(.7 + aleatorio() * 1.9)
    fases.push(aleatorio() * dosPi)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(posiciones, 3))
  geometry.setAttribute('tamano', new Float32BufferAttribute(tamanos, 1))
  geometry.setAttribute('fase', new Float32BufferAttribute(fases, 1))
  const material = new ShaderMaterial({
    uniforms: { tiempo: { value: 0 }, densidad: { value: 1 } },
    vertexShader: 'attribute float tamano; attribute float fase; uniform float tiempo; uniform float densidad; varying float brillo; void main(){ brillo=0.6+0.4*sin(tiempo*0.45+fase); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_PointSize=tamano*densidad; }',
    fragmentShader: 'varying float brillo; void main(){ float distancia=length(gl_PointCoord-vec2(0.5)); float alfa=(1.0-smoothstep(0.1,0.5,distancia))*brillo; gl_FragColor=vec4(0.75,0.85,1.0,alfa); }',
    transparent: true, depthWrite: false,
  })
  return new Points(geometry, material)
}

export function crearEscenaEspacial({ contenedor, encuadre, animar, onLista, onError }: OpcionesEscenaEspacial): ControlEscenaEspacial {
  const scene = new Scene()
  scene.background = new Color('#101f29')
  const camera = new PerspectiveCamera(40, 1, .1, 150)
  camera.position.copy(puntoGeografico(-102, 23, distanciaInicial))
  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  contenedor.append(renderer.domElement)
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'Globo terrestre 3D interactivo. Arrastra para girar, usa las flechas y los botones para acercarte. La rueda desplaza la página.')
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  renderer.domElement.style.touchAction = 'pan-y'
  controls.enableDamping = true
  controls.dampingFactor = .08
  controls.enablePan = false
  controls.minDistance = 4.7
  controls.maxDistance = 10
  controls.minPolarAngle = .15
  controls.maxPolarAngle = Math.PI - .15
  controls.saveState()

  scene.add(new AmbientLight('#b6cde5', 1.1))
  const sol = new DirectionalLight('#fff4df', 2.4)
  sol.position.set(-3, 4, 6)
  scene.add(sol)
  const estrellas = crearEstrellas()
  scene.add(estrellas)
  const materialTierra = new MeshPhongMaterial({ color: '#b4c8cb', shininess: 18, specular: '#274363' })
  const tierra = new Mesh(new SphereGeometry(radioTierra, 96, 64), materialTierra)
  scene.add(tierra)
  const atmosfera = new Mesh(new SphereGeometry(radioTierra * 1.025, 64, 48), new ShaderMaterial({
    vertexShader: 'varying vec3 normalVista; varying vec3 posicionVista; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); normalVista=normalize(normalMatrix*normal); posicionVista=-p.xyz; gl_Position=projectionMatrix*p; }',
    fragmentShader: 'varying vec3 normalVista; varying vec3 posicionVista; void main(){ float borde=pow(1.0-abs(dot(normalize(normalVista),normalize(posicionVista))),3.0); gl_FragColor=vec4(0.18,0.55,1.0,borde*0.55); }',
    side: BackSide, blending: AdditiveBlending, transparent: true, depthWrite: false,
  }))
  scene.add(atmosfera)
  const mexico = new Mesh(new SphereGeometry(.018, 12, 8), new MeshBasicMaterial({ color: '#a2f3cf' }))
  mexico.position.copy(puntoGeografico(-102.55, 23.63, radioTierra * 1.005))
  tierra.add(mexico)

  const planoOrbital = new Group()
  planoOrbital.rotation.set(1.16, .22, -.45)
  scene.add(planoOrbital)
  const puntosOrbita: Vector3[] = []
  for (let i = 0; i < 200; i++) puntosOrbita.push(new Vector3(Math.cos(i / 200 * dosPi) * radioOrbita, Math.sin(i / 200 * dosPi) * radioOrbita, 0))
  planoOrbital.add(new LineLoop(new BufferGeometry().setFromPoints(puntosOrbita), new LineBasicMaterial({ color: '#b7b7a5', transparent: true, opacity: .26 })))
  const satelite = crearModeloNisar()
  planoOrbital.add(satelite)
  const posicionesRastro = new Float32Array(72 * 3)
  const coloresRastro = new Float32Array(72 * 3)
  for (let i = 0; i < 72; i++) {
    const intensidad = i / 71
    coloresRastro.set([.85 * intensidad, .65 * intensidad, .3 * intensidad], i * 3)
  }
  const rastroGeometry = new BufferGeometry()
  rastroGeometry.setAttribute('position', new Float32BufferAttribute(posicionesRastro, 3))
  rastroGeometry.setAttribute('color', new Float32BufferAttribute(coloresRastro, 3))
  const rastro = new Line(rastroGeometry, new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .75 }))
  planoOrbital.add(rastro)

  let destruida = false, visible = true, contextoValido = true, reproduciendo = animar
  let fase = faseInicial, tiempo = 0, frame = 0, anterior = 0
  let distanciaEncuadre = distanciaInicial
  function dibujar() {
    if (destruida || !contextoValido) return
    satelite.position.set(Math.cos(fase) * radioOrbita, Math.sin(fase) * radioOrbita, 0)
    satelite.rotation.set(.35, .2, fase - Math.PI / 2)
    const attribute = rastroGeometry.getAttribute('position')
    for (let i = 0; i < 72; i++) {
      const angulo = fase - (1 - i / 71) * .75
      attribute.setXYZ(i, Math.cos(angulo) * radioOrbita, Math.sin(angulo) * radioOrbita, 0)
    }
    attribute.needsUpdate = true
    rastroGeometry.computeBoundingSphere()
    estrellas.material.uniforms.tiempo.value = tiempo
    controls.update()
    scene.updateMatrixWorld()
    renderer.render(scene, camera)
  }
  function ejecutar(ahora: number) {
    if (destruida || !visible || document.hidden || !contextoValido) { frame = 0; return }
    frame = requestAnimationFrame(ejecutar)
    if (ahora - anterior < 1000 / 30) return
    const delta = anterior ? Math.min((ahora - anterior) / 1000, .08) : 0
    anterior = ahora
    if (reproduciendo) { fase += delta * .16; tierra.rotation.y += delta * .018; tiempo += delta }
    dibujar()
  }
  function activar() { anterior = 0; if (!frame && !destruida && visible && !document.hidden && contextoValido) frame = requestAnimationFrame(ejecutar) }
  function redimensionar() {
    const ancho = contenedor.clientWidth, alto = contenedor.clientHeight
    if (ancho < 2 || alto < 2 || destruida) return
    const area = encuadre.getBoundingClientRect(), fondo = contenedor.getBoundingClientRect()
    if (area.width < 2 || area.height < 2) return
    camera.aspect = area.width / area.height
    const distanciaNueva = distanciaInicial * (camera.aspect < 1 ? 1.08 / camera.aspect : 1)
    camera.position.setLength(camera.position.length() / distanciaEncuadre * distanciaNueva)
    distanciaEncuadre = distanciaNueva
    controls.minDistance = distanciaEncuadre * .65
    controls.maxDistance = distanciaEncuadre * 1.6
    // Amplía el campo estelar a todo el hero y conserva el globo en su columna.
    camera.setViewOffset(area.width, area.height, fondo.left - area.left, fondo.top - area.top, ancho, alto)
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(ancho, alto, false)
    renderer.domElement.style.width = `${ancho}px`
    renderer.domElement.style.height = `${alto}px`
    renderer.setViewport(0, 0, ancho, alto)
    estrellas.material.uniforms.densidad.value = renderer.getPixelRatio()
    dibujar()
  }
  function teclado(event: KeyboardEvent) {
    const giros: Record<string, [number, number]> = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.12], ArrowDown: [0, .12] }
    const giro = giros[event.key]
    if (!giro && !['+', '-', '='].includes(event.key)) return
    event.preventDefault()
    const posicion = new Spherical().setFromVector3(camera.position)
    if (giro) { posicion.theta += giro[0]; posicion.phi = Math.min(Math.PI - .15, Math.max(.15, posicion.phi + giro[1])) }
    else posicion.radius = Math.min(controls.maxDistance, Math.max(controls.minDistance, posicion.radius * (event.key === '-' ? 1.12 : .9)))
    camera.position.setFromSpherical(posicion)
    dibujar()
  }
  function perderContexto(event: Event) {
    event.preventDefault()
    contextoValido = false
    onError('La visualización 3D se interrumpió. Puedes volver a cargarla.')
  }
  const observer = new ResizeObserver(redimensionar)
  observer.observe(contenedor)
  observer.observe(encuadre)
  const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; if (visible) activar() }, { threshold: .01 })
  intersection.observe(contenedor)
  renderer.domElement.addEventListener('keydown', teclado)
  renderer.domElement.addEventListener('webglcontextlost', perderContexto)
  document.addEventListener('visibilitychange', activar)

  const texture = new TextureLoader().load(`${import.meta.env.BASE_URL}assets/espacio/tierra-blue-marble.jpg`, imagen => {
    if (destruida) { imagen.dispose(); return }
    imagen.colorSpace = SRGBColorSpace
    imagen.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4)
    materialTierra.map = imagen
    materialTierra.color.set('#ffffff')
    materialTierra.needsUpdate = true
    dibujar()
    onLista()
  }, undefined, () => { if (!destruida) onError('No se pudo cargar la textura terrestre. Vuelve a intentarlo.') })
  redimensionar()
  activar()

  return {
    reproducir(activo) { reproduciendo = activo; activar() },
    restablecer() { fase = faseInicial; tierra.rotation.y = 0; tiempo = 0; controls.reset(); camera.position.copy(puntoGeografico(-102, 23, distanciaEncuadre)); dibujar() },
    acercar(factor) { camera.position.setLength(Math.min(controls.maxDistance, Math.max(controls.minDistance, camera.position.length() * factor))); dibujar() },
    destruir() {
      if (destruida) return
      destruida = true
      cancelAnimationFrame(frame)
      observer.disconnect(); intersection.disconnect()
      document.removeEventListener('visibilitychange', activar)
      renderer.domElement.removeEventListener('keydown', teclado)
      renderer.domElement.removeEventListener('webglcontextlost', perderContexto)
      controls.dispose()
      const geometrias = new Set<BufferGeometry>(), materiales = new Set<Material>()
      scene.traverse(objeto => {
        if (objeto instanceof Mesh || objeto instanceof Line || objeto instanceof Points) {
          geometrias.add(objeto.geometry)
          for (const material of Array.isArray(objeto.material) ? objeto.material : [objeto.material]) materiales.add(material)
        }
      })
      geometrias.forEach(geometry => geometry.dispose())
      materiales.forEach(material => material.dispose())
      texture.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
