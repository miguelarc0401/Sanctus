import type { Rect } from '../lib/libros'
import { coincidencias } from './paginas'

// ─── Selección más precisa ───────────────────────────────────────────────────
// Adaptado de TextLayerBuilder (pdfjs-dist/web/pdf_viewer.mjs, Mozilla, licencia Apache 2.0):
// un elemento al final de la capa de texto evita que, al arrastrar sobre un espacio vacío,
// la selección salte de golpe hasta el final de la página.

const capas = new Map<HTMLElement, HTMLElement>()
let escucha: AbortController | null = null

function reiniciar(fin: HTMLElement, capa: HTMLElement) {
  capa.append(fin)
  fin.style.width = ''
  fin.style.height = ''
  fin.style.userSelect = ''
  capa.classList.remove('selecting')
}

// Se llama cuando la capa de texto ya está dibujada; devuelve cómo desconectarla.
export function prepararCapaDeTexto(capa: HTMLElement) {
  const fin = document.createElement('div')
  fin.className = 'endOfContent'
  capa.append(fin)
  const alPresionar = () => capa.classList.add('selecting')
  capa.addEventListener('mousedown', alPresionar)
  capas.set(capa, fin)
  escucharSeleccion()
  return () => {
    capa.removeEventListener('mousedown', alPresionar)
    capas.delete(capa)
    if (capas.size === 0) {
      escucha?.abort()
      escucha = null
    }
  }
}

// Chrome 148 o posterior ya selecciona bien por sí solo.
function chromeModerno() {
  const version = /\bChrome\/(\d+)\b/.exec(navigator.userAgent)?.[1]
  return !!version && Number(version) >= 148
}

function escucharSeleccion() {
  if (escucha) return
  escucha = new AbortController()
  const { signal } = escucha
  let presionado = false
  const moderno = chromeModerno()
  let rangoAnterior: Range | undefined

  document.addEventListener('pointerdown', () => (presionado = true), { signal })
  document.addEventListener(
    'pointerup',
    () => {
      presionado = false
      capas.forEach(reiniciar)
    },
    { signal },
  )
  window.addEventListener(
    'blur',
    () => {
      presionado = false
      capas.forEach(reiniciar)
    },
    { signal },
  )
  document.addEventListener('keyup', () => !presionado && capas.forEach(reiniciar), { signal })
  document.addEventListener(
    'selectionchange',
    () => {
      const seleccion = document.getSelection()
      if (!seleccion || seleccion.rangeCount === 0) {
        capas.forEach(reiniciar)
        return
      }
      const activas = new Set<HTMLElement>()
      for (let i = 0; i < seleccion.rangeCount; i++) {
        const rango = seleccion.getRangeAt(i)
        for (const capa of capas.keys()) if (rango.intersectsNode(capa)) activas.add(capa)
      }
      for (const [capa, fin] of capas) {
        if (activas.has(capa)) capa.classList.add('selecting')
        else reiniciar(fin, capa)
      }
      if (moderno || activas.size === 0) return

      // Lleva el elemento final junto al extremo de la selección que se está moviendo.
      const rango = seleccion.getRangeAt(0)
      const modificaInicio =
        !!rangoAnterior &&
        (rango.compareBoundaryPoints(Range.END_TO_END, rangoAnterior) === 0 ||
          rango.compareBoundaryPoints(Range.START_TO_END, rangoAnterior) === 0)
      let ancla: Node | null = modificaInicio ? rango.startContainer : rango.endContainer
      if (ancla.nodeType === Node.TEXT_NODE) ancla = ancla.parentNode
      if (ancla && !modificaInicio && rango.endOffset === 0) {
        do {
          while (ancla && !ancla.previousSibling) ancla = ancla.parentNode
          ancla = ancla?.previousSibling ?? null
        } while (ancla && !ancla.childNodes.length)
      }
      const capa = ancla?.parentElement?.closest<HTMLElement>('.textLayer')
      const fin = capa && capas.get(capa)
      if (ancla && capa && fin) {
        fin.style.width = capa.style.width
        fin.style.height = capa.style.height
        fin.style.userSelect = 'text'
        ancla.parentElement!.insertBefore(fin, modificaInicio ? ancla : ancla.nextSibling)
      }
      rangoAnterior = rango.cloneRange()
    },
    { signal },
  )
}

// ─── Posición de lo seleccionado ─────────────────────────────────────────────

const redondear = (n: number) => Math.round(n * 10000) / 10000

// Junta los pedazos de un mismo renglón en un solo rectángulo: así el color no se encima.
export function unirRenglones(rects: Rect[]): Rect[] {
  const renglones: Rect[] = []
  for (const r of [...rects].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2))) {
    const centro = r.y + r.h / 2
    const mismo = renglones.find(
      (l) =>
        Math.abs(l.y + l.h / 2 - centro) < Math.min(l.h, r.h) * 0.6 && r.x <= l.x + l.w + 0.04 && r.x + r.w >= l.x - 0.04,
    )
    if (mismo) {
      const x = Math.min(mismo.x, r.x)
      const y = Math.min(mismo.y, r.y)
      mismo.w = Math.max(mismo.x + mismo.w, r.x + r.w) - x
      mismo.h = Math.max(mismo.y + mismo.h, r.y + r.h) - y
      mismo.x = x
      mismo.y = y
    } else renglones.push({ ...r })
  }
  return renglones.map((r) => ({ x: redondear(r.x), y: redondear(r.y), w: redondear(r.w), h: redondear(r.h) }))
}

// Rectángulos de un rango de texto, en proporción de la página (de 0 a 1).
export function rectangulosDe(rango: Range, marco: HTMLElement) {
  const caja = marco.getBoundingClientRect()
  return unirRenglones(
    [...rango.getClientRects()]
      // Fuera quedan las cajas enormes que no son renglones (como el elemento final de la capa).
      .filter((r) => r.width > 1 && r.height > 1 && r.height < caja.height * 0.08)
      .map((r) => ({
        x: (r.left - caja.left) / caja.width,
        y: (r.top - caja.top) / caja.height,
        w: r.width / caja.width,
        h: r.height / caja.height,
      })),
  )
}

// ─── Resaltar lo que se buscó ────────────────────────────────────────────────

const resaltado = typeof Highlight !== 'undefined' && 'highlights' in CSS ? new Highlight() : null
if (resaltado) CSS.highlights.set('busqueda', resaltado)

// Marca en la capa de texto dónde aparece lo buscado; devuelve cómo quitar las marcas.
export function resaltarBusqueda(capa: HTMLElement, termino: string) {
  if (!resaltado || !termino.trim()) return () => {}
  const rangos: Range[] = []
  const recorrido = document.createTreeWalker(capa, NodeFilter.SHOW_TEXT)
  for (let nodo = recorrido.nextNode(); nodo; nodo = recorrido.nextNode()) {
    for (const [inicio, fin] of coincidencias(nodo.textContent ?? '', termino)) {
      const rango = new Range()
      rango.setStart(nodo, inicio)
      rango.setEnd(nodo, fin)
      rangos.push(rango)
      resaltado.add(rango)
    }
  }
  return () => rangos.forEach((r) => resaltado.delete(r))
}
