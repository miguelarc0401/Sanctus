import { useEffect, useEffectEvent, type RefObject } from 'react'

// Un punto de una página (en fracciones de su ancho y su alto) y el lugar de la pantalla donde debe quedar.
export type Foco = { pagina: number; fx: number; fy: number; x: number; y: number }

// La página más cercana a un punto de la pantalla y en qué lugar de ella cae.
export function focoEn(hojas: HTMLElement, x: number, y: number): Foco | null {
  let cercana: { caja: DOMRect; pagina: number; distancia: number } | null = null
  for (const pagina of hojas.querySelectorAll<HTMLElement>('[data-pagina]')) {
    const caja = pagina.getBoundingClientRect()
    const distancia = Math.hypot(Math.max(caja.left - x, 0, x - caja.right), Math.max(caja.top - y, 0, y - caja.bottom))
    if (!cercana || distancia < cercana.distancia) cercana = { caja, pagina: Number(pagina.dataset.pagina), distancia }
  }
  if (!cercana) return null
  const { caja, pagina } = cercana
  return { pagina, fx: (x - caja.left) / caja.width, fy: (y - caja.top) / caja.height, x, y }
}

type Gesto = {
  elemento: HTMLElement
  foco: Foco
  // Dónde empezó y dónde está ahora el centro del gesto.
  inicio: { x: number; y: number }
  x: number
  y: number
  // Separación de los dedos al empezar; null si el gesto es con la rueda o el panel táctil.
  dedos: number | null
  escala: number
}

// Eventos de Safari en la Mac al pellizcar el panel táctil.
type GestoSafari = Event & { scale: number; clientX: number; clientY: number }

const distancia = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
const centro = (t: TouchList) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 })

// Separar o juntar dos dedos (o Ctrl y la rueda del mouse, o pellizcar el panel táctil) agranda o achica la página.
// Mientras dura el gesto sólo se estira la imagen; al terminar se avisa cuánto, para volver a dibujarla nítida.
// alTerminar dice si cambió el tamaño; si no, la imagen vuelve a su lugar.
export function useAmpliar(
  area: HTMLElement | null,
  hojas: RefObject<HTMLElement | null>,
  limitar: (escala: number) => number,
  alTerminar: (escala: number, foco: Foco) => boolean,
) {
  const limitarEscala = useEffectEvent(limitar)
  const terminar = useEffectEvent(alTerminar)

  useEffect(() => {
    if (!area) return
    let gesto: Gesto | null = null
    let espera: number | undefined

    function empezar(x: number, y: number, dedos: number | null): Gesto | null {
      const elemento = hojas.current
      if (!elemento) return null
      elemento.style.transition = 'none'
      elemento.style.transform = ''
      const foco = focoEn(elemento, x, y)
      if (!foco) return null
      const caja = elemento.getBoundingClientRect()
      elemento.style.transformOrigin = `${x - caja.left}px ${y - caja.top}px`
      return { elemento, foco, inicio: { x, y }, x, y, dedos, escala: 1 }
    }

    function mostrar(g: Gesto) {
      g.elemento.style.transform = `translate(${g.x - g.inicio.x}px, ${g.y - g.inicio.y}px) scale(${g.escala})`
    }

    function soltar() {
      window.clearTimeout(espera)
      const g = gesto
      gesto = null
      if (!g) return
      if (!terminar(g.escala, { ...g.foco, x: g.x, y: g.y })) {
        g.elemento.style.transition = 'transform .2s ease-out'
        g.elemento.style.transform = ''
      }
    }

    function alTocar(e: TouchEvent) {
      if (e.touches.length !== 2 || gesto) return
      const { x, y } = centro(e.touches)
      gesto = empezar(x, y, distancia(e.touches))
    }

    function alMover(e: TouchEvent) {
      if (!gesto?.dedos || e.touches.length !== 2) return
      // Que el navegador no agrande toda la pantalla.
      if (e.cancelable) e.preventDefault()
      Object.assign(gesto, centro(e.touches))
      gesto.escala = limitarEscala(distancia(e.touches) / gesto.dedos)
      mostrar(gesto)
    }

    function alLevantar(e: TouchEvent) {
      if (gesto?.dedos && e.touches.length < 2) soltar()
    }

    // Ctrl y la rueda del mouse; al pellizcar el panel táctil, Chrome y Firefox también la envían con Ctrl.
    function alGirar(e: WheelEvent) {
      if (!e.ctrlKey) return
      e.preventDefault()
      gesto ??= empezar(e.clientX, e.clientY, null)
      if (!gesto || gesto.dedos) return
      const paso = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1)
      gesto.escala = limitarEscala(gesto.escala * Math.exp(-Math.min(Math.max(paso, -25), 25) / 100))
      mostrar(gesto)
      window.clearTimeout(espera)
      espera = window.setTimeout(soltar, 250)
    }

    function alPellizcar(e: Event) {
      e.preventDefault()
      // En pantallas táctiles el gesto se sigue con los dedos (alTocar y alMover).
      if (navigator.maxTouchPoints > 0) return
      const g = e as GestoSafari
      if (e.type === 'gesturestart') gesto ??= empezar(g.clientX, g.clientY, null)
      else if (e.type === 'gesturechange' && gesto && !gesto.dedos) {
        gesto.escala = limitarEscala(g.scale)
        mostrar(gesto)
      } else if (e.type === 'gestureend') soltar()
    }

    const activo = { passive: false }
    area.addEventListener('touchstart', alTocar)
    area.addEventListener('touchmove', alMover, activo)
    area.addEventListener('touchend', alLevantar)
    area.addEventListener('touchcancel', alLevantar)
    area.addEventListener('wheel', alGirar, activo)
    for (const tipo of ['gesturestart', 'gesturechange', 'gestureend']) area.addEventListener(tipo, alPellizcar, activo)
    return () => {
      window.clearTimeout(espera)
      area.removeEventListener('touchstart', alTocar)
      area.removeEventListener('touchmove', alMover)
      area.removeEventListener('touchend', alLevantar)
      area.removeEventListener('touchcancel', alLevantar)
      area.removeEventListener('wheel', alGirar)
      for (const tipo of ['gesturestart', 'gesturechange', 'gestureend']) area.removeEventListener(tipo, alPellizcar)
    }
  }, [area, hojas])
}
