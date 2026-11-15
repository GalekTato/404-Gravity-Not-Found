import { BoxGeometry, BufferGeometry, CircleGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, TorusGeometry, Vector3 } from 'three'

// Modelo original estilizado. No es un modelo de ingeniería ni mantiene escala con la Tierra.
export function crearModeloNisar() {
  const modelo = new Group()
  const oro = new MeshStandardMaterial({ color: '#d5b26a', metalness: .65, roughness: .38 })
  const aluminio = new MeshStandardMaterial({ color: '#c9d4da', metalness: .5, roughness: .4 })
  const celda = new MeshStandardMaterial({ color: '#173a66', metalness: .55, roughness: .3, emissive: '#081a32', emissiveIntensity: .4 })
  const cuerpo = new Mesh(new BoxGeometry(.16, .21, .15), oro)
  modelo.add(cuerpo)
  const instrumento = new Mesh(new CylinderGeometry(.12, .12, .08, 8), aluminio)
  instrumento.position.y = .15
  modelo.add(instrumento)
  const panelGeometry = new BoxGeometry(.13, .25, .012)
  const lineas = new LineBasicMaterial({ color: '#8caad0', transparent: true, opacity: .75 })
  for (const lado of [-1, 1]) {
    const brazo = new Mesh(new BoxGeometry(.15, .015, .015), aluminio)
    brazo.position.x = lado * .14
    modelo.add(brazo)
    for (let i = 0; i < 3; i++) {
      const panel = new Mesh(panelGeometry, celda)
      panel.position.set(lado * (.24 + i * .14), 0, 0)
      modelo.add(panel)
      const puntos: number[] = []
      for (let fila = 0; fila <= 5; fila++) puntos.push(-.063, -.12 + fila * .048, .008, .063, -.12 + fila * .048, .008)
      puntos.push(0, -.12, .008, 0, .12, .008)
      const rejilla = new LineSegments(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(puntos, 3)), lineas)
      rejilla.position.copy(panel.position)
      modelo.add(rejilla)
    }
  }
  const inicio = new Vector3(0, .17, 0)
  const fin = new Vector3(.28, .52, .035)
  const soporte = new Mesh(new CylinderGeometry(.008, .008, inicio.distanceTo(fin), 6), aluminio)
  soporte.position.copy(inicio).add(fin).multiplyScalar(.5)
  soporte.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), fin.clone().sub(inicio).normalize())
  modelo.add(soporte)
  const reflector = new Group()
  reflector.position.copy(fin)
  reflector.rotation.x = -.35
  const malla = new Mesh(new CircleGeometry(.27, 40), new MeshStandardMaterial({ color: '#dfbd74', metalness: .55, roughness: .5, side: DoubleSide, transparent: true, opacity: .75 }))
  reflector.add(malla)
  reflector.add(new Mesh(new TorusGeometry(.27, .008, 6, 48), oro))
  const radios: number[] = []
  for (let i = 0; i < 20; i++) {
    const angulo = i / 20 * Math.PI * 2
    radios.push(0, 0, .04, Math.cos(angulo) * .27, Math.sin(angulo) * .27, .003)
  }
  reflector.add(new LineSegments(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(radios, 3)), new LineBasicMaterial({ color: '#ffe2a0', transparent: true, opacity: .9 })))
  modelo.add(reflector)
  modelo.scale.setScalar(.75)
  return modelo
}
