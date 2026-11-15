import { useEffect, useRef } from 'react'

// Fondo decorativo compartido. No añade un segundo motor 3D a las páginas.
export function FondoEstelar() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    const context = canvas?.getContext('2d')
    if (!canvas || !container || !context) return
    const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)')
    let semilla = 404
    function aleatorio() { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296 }
    const estrellas = Array.from({ length: 220 }, () => ({
      x: aleatorio(), y: aleatorio(), radio: .4 + aleatorio() * 1.2,
      profundidad: .3 + aleatorio() * .7, fase: aleatorio() * Math.PI * 2,
    }))
    let ancho = 1, alto = 1, frame = 0, anterior = 0, tiempo = 0, activa = true
    let destinoX = 0, destinoY = 0, desplazamientoX = 0, desplazamientoY = 0
    function dibujar() {
      if (!context) return
      context.clearRect(0, 0, ancho, alto)
      const cantidad = Math.min(estrellas.length, Math.max(80, Math.round(ancho * alto / 6500)))
      for (let i = 0; i < cantidad; i++) {
        const estrella = estrellas[i]
        const x = (estrella.x * ancho + desplazamientoX * estrella.profundidad + ancho) % ancho
        const y = (estrella.y * alto + desplazamientoY * estrella.profundidad + alto) % alto
        context.globalAlpha = .4 + .35 * Math.sin(tiempo * .45 + estrella.fase)
        context.fillStyle = i % 5 === 0 ? '#e9f2fa' : '#6fadd6'
        context.beginPath()
        context.arc(x, y, estrella.radio, 0, Math.PI * 2)
        context.fill()
      }
      context.globalAlpha = 1
    }
    function animar(ahora: number) {
      frame = 0
      if (!activa || document.hidden || preferencia.matches) return
      if (ahora - anterior >= 1000 / 24) {
        tiempo += anterior ? Math.min((ahora - anterior) / 1000, .1) : 0
        anterior = ahora
        desplazamientoX += (destinoX - desplazamientoX) * .07
        desplazamientoY += (destinoY - desplazamientoY) * .07
        dibujar()
      }
      frame = requestAnimationFrame(animar)
    }
    function actualizarAnimacion() {
      cancelAnimationFrame(frame)
      frame = 0
      anterior = 0
      if (activa && !document.hidden && !preferencia.matches) frame = requestAnimationFrame(animar)
      else dibujar()
    }
    function redimensionar() {
      if (!canvas || !context || !container) return
      ancho = Math.max(1, container.clientWidth)
      alto = Math.max(1, container.clientHeight)
      const densidad = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(ancho * densidad)
      canvas.height = Math.round(alto * densidad)
      context.setTransform(densidad, 0, 0, densidad, 0, 0)
      dibujar()
    }
    function mover(event: PointerEvent) {
      if (preferencia.matches || event.pointerType === 'touch') return
      destinoX = (event.clientX / ancho - .5) * 18
      destinoY = (event.clientY / alto - .5) * 18
    }
    function centrar() { destinoX = 0; destinoY = 0 }
    const observer = new ResizeObserver(redimensionar)
    observer.observe(container)
    window.addEventListener('pointermove', mover, { passive: true })
    document.documentElement.addEventListener('pointerleave', centrar)
    document.addEventListener('visibilitychange', actualizarAnimacion)
    preferencia.addEventListener('change', actualizarAnimacion)
    redimensionar()
    actualizarAnimacion()
    return () => {
      activa = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('pointermove', mover)
      document.documentElement.removeEventListener('pointerleave', centrar)
      document.removeEventListener('visibilitychange', actualizarAnimacion)
      preferencia.removeEventListener('change', actualizarAnimacion)
    }
  }, [])
  return <div className="space-background" aria-hidden="true"><canvas ref={canvasRef}/></div>
}
