import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

export type TextoPagina = Awaited<ReturnType<PDFPageProxy['getTextContent']>>

type Dibujo = { lienzo: HTMLCanvasElement; alto: number }

// Páginas ya dibujadas de cada libro, para pasar de página al instante (se guardan unas pocas).
const MAXIMO_DIBUJOS = 6
const MAXIMO_PIXELES = 8_000_000
const dibujos = new WeakMap<PDFDocumentProxy, Map<string, Promise<Dibujo>>>()
const textos = new WeakMap<PDFDocumentProxy, Map<number, Promise<TextoPagina>>>()

function cacheDe<K, V>(mapa: WeakMap<PDFDocumentProxy, Map<K, V>>, pdf: PDFDocumentProxy) {
  let cache = mapa.get(pdf)
  if (!cache) mapa.set(pdf, (cache = new Map()))
  return cache
}

// Dibuja una página al ancho indicado (en píxeles de pantalla) y la guarda para reutilizarla.
export function dibujarPagina(pdf: PDFDocumentProxy, numero: number, ancho: number) {
  const densidad = window.devicePixelRatio || 1
  const clave = `${numero}@${ancho}@${densidad}`
  const cache = cacheDe(dibujos, pdf)
  const guardado = cache.get(clave)
  if (guardado) {
    // La más reciente pasa al final: se borran primero las que hace más que no se usan.
    cache.delete(clave)
    cache.set(clave, guardado)
    return guardado
  }
  const dibujo = (async () => {
    const pagina = await pdf.getPage(numero)
    const viewport = pagina.getViewport({ scale: ancho / pagina.getViewport({ scale: 1 }).width })
    // Con la página muy ampliada, menos detalle: los teléfonos no aguantan lienzos enormes.
    const escala = Math.min(densidad, Math.sqrt(MAXIMO_PIXELES / (viewport.width * viewport.height)))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.floor(viewport.width * escala)
    lienzo.height = Math.floor(viewport.height * escala)
    await pagina.render({
      canvas: lienzo,
      viewport,
      transform: escala === 1 ? undefined : [escala, 0, 0, escala, 0, 0],
    }).promise
    return { lienzo, alto: viewport.height }
  })()
  dibujo.catch(() => cache.delete(clave))
  cache.set(clave, dibujo)
  while (cache.size > MAXIMO_DIBUJOS) cache.delete(cache.keys().next().value!)
  return dibujo
}

export function textoDePagina(pdf: PDFDocumentProxy, numero: number) {
  const cache = cacheDe(textos, pdf)
  let texto = cache.get(numero)
  if (!texto) {
    texto = pdf.getPage(numero).then((pagina) => pagina.getTextContent())
    texto.catch(() => cache.delete(numero))
    cache.set(numero, texto)
  }
  return texto
}

// Alto entre ancho de cada página, para reservar su lugar antes de dibujarla.
export async function proporcionDe(pdf: PDFDocumentProxy, numero: number) {
  const { width, height } = (await pdf.getPage(numero)).getViewport({ scale: 1 })
  return height / width
}

export type EntradaIndice = { titulo: string; pagina: number; nivel: number }

// Índice del libro (los marcadores del PDF), con la página a la que lleva cada entrada.
export async function leerIndice(pdf: PDFDocumentProxy): Promise<EntradaIndice[]> {
  const raiz = await pdf.getOutline()
  const entradas: EntradaIndice[] = []
  async function recorrer(nodos: typeof raiz, nivel: number) {
    for (const nodo of nodos) {
      try {
        const destino = typeof nodo.dest === 'string' ? await pdf.getDestination(nodo.dest) : nodo.dest
        const referencia = destino?.[0]
        const indice =
          typeof referencia === 'number' ? referencia : referencia ? await pdf.getPageIndex(referencia) : null
        if (indice !== null && nodo.title.trim()) {
          entradas.push({ titulo: nodo.title.trim(), pagina: indice + 1, nivel })
        }
      } catch {
        // Una entrada rota no impide leer las demás.
      }
      if (nivel < 2 && nodo.items?.length) await recorrer(nodo.items, nivel + 1)
    }
  }
  if (raiz?.length) await recorrer(raiz, 0)
  return entradas
}

// ─── Búsqueda ────────────────────────────────────────────────────────────────

// Texto en minúsculas y sin acentos, con la posición de cada letra en el texto original,
// para encontrar «oracion» en «Oración» y luego marcar el lugar exacto.
export function normalizarConMapa(texto: string) {
  let normal = ''
  const mapa: number[] = []
  for (let i = 0; i < texto.length; i++) {
    const letra = texto[i]
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
    for (const parte of letra) {
      normal += parte
      mapa.push(i)
    }
  }
  return { normal, mapa }
}

export const normalizar = (texto: string) => normalizarConMapa(texto).normal

// Dónde aparece el término en el texto: pares [inicio, fin) en el texto original.
export function coincidencias(texto: string, termino: string): [number, number][] {
  const buscado = normalizar(termino.trim())
  if (!buscado) return []
  const { normal, mapa } = normalizarConMapa(texto)
  const resultado: [number, number][] = []
  for (let i = normal.indexOf(buscado); i !== -1; i = normal.indexOf(buscado, i + buscado.length)) {
    resultado.push([mapa[i], mapa[i + buscado.length - 1] + 1])
  }
  return resultado
}

export type Resultado = { pagina: number; antes: string; encontrado: string; despues: string }

function textoPlano(contenido: TextoPagina) {
  return contenido.items
    .map((item) => ('str' in item ? item.str + (item.hasEOL ? ' ' : '') : ''))
    .join('')
    .replace(/\s+/g, ' ')
}

// Busca en todo el libro, página por página; avisa los resultados conforme los encuentra.
export async function buscarEnLibro(
  pdf: PDFDocumentProxy,
  termino: string,
  alEncontrar: (resultados: Resultado[], paginaRevisada: number) => void,
  senal: AbortSignal,
) {
  for (let numero = 1; numero <= pdf.numPages; numero++) {
    if (senal.aborted) return
    const texto = textoPlano(await textoDePagina(pdf, numero))
    const encontrados = coincidencias(texto, termino)
      .slice(0, 5)
      .map(([inicio, fin]) => {
        // Un poco de contexto alrededor, sin cortar la primera palabra a la mitad.
        const desde = Math.max(0, inicio - 50)
        const hasta = Math.min(texto.length, fin + 70)
        const antes = texto.slice(desde, inicio)
        return {
          pagina: numero,
          antes: desde > 0 ? `…${antes.replace(/^\S*\s/, '')}` : antes,
          encontrado: texto.slice(inicio, fin),
          despues: texto.slice(fin, hasta) + (hasta < texto.length ? '…' : ''),
        }
      })
    if (!senal.aborted) alEncontrar(encontrados, numero)
  }
}
