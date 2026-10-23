import { getDocument, GlobalWorkerOptions, version, type PDFDocumentProxy } from 'pdfjs-dist'
import trabajador from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = trabajador

// Fuentes, mapas de caracteres y decodificadores que algunos PDF necesitan (p. ej. escaneos).
const RECURSOS = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}`

// Devuelve el documento y una función para liberarlo cuando ya no se use.
export async function abrirPdf(datos: Uint8Array) {
  const tarea = getDocument({
    data: datos,
    cMapUrl: `${RECURSOS}/cmaps/`,
    standardFontDataUrl: `${RECURSOS}/standard_fonts/`,
    wasmUrl: `${RECURSOS}/wasm/`,
  })
  const cerrar = () => tarea.destroy()
  try {
    return { pdf: await tarea.promise, cerrar }
  } catch (e) {
    await cerrar()
    throw e
  }
}

// Imagen de la primera página para usarla como portada.
export async function portadaDe(pdf: PDFDocumentProxy, ancho = 480): Promise<Blob> {
  const pagina = await pdf.getPage(1)
  const base = pagina.getViewport({ scale: 1 })
  const viewport = pagina.getViewport({ scale: ancho / base.width })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  // Con intent 'print' PDF.js no espera a los cuadros de animación del navegador, así la portada
  // se genera aunque la pestaña quede en segundo plano mientras se sube el libro.
  await pagina.render({ canvas, viewport, intent: 'print' }).promise
  return new Promise((resolver, rechazar) =>
    canvas.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo crear la portada.'))), 'image/webp', 0.85),
  )
}
