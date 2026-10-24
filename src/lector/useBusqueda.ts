import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useState } from 'react'
import { buscarEnLibro, normalizar, type Resultado } from './paginas'

type Estado = { buscado: string; resultados: Resultado[]; revisadas: number }

const VACIO: Estado = { buscado: '', resultados: [], revisadas: 0 }

// Búsqueda en todo el libro: empieza un momento después de dejar de escribir.
export function useBusqueda(pdf: PDFDocumentProxy | null) {
  const [termino, setTermino] = useState('')
  const [estado, setEstado] = useState<Estado>(VACIO)
  const buscado = termino.trim()
  const valido = !!pdf && normalizar(buscado).length >= 2

  useEffect(() => {
    if (!pdf || !valido) return
    const control = new AbortController()
    const espera = window.setTimeout(() => {
      setEstado({ buscado, resultados: [], revisadas: 0 })
      void buscarEnLibro(
        pdf,
        buscado,
        (nuevos, pagina) =>
          setEstado((e) => ({ ...e, resultados: nuevos.length ? [...e.resultados, ...nuevos] : e.resultados, revisadas: pagina })),
        control.signal,
      )
    }, 400)
    return () => {
      window.clearTimeout(espera)
      control.abort()
    }
  }, [pdf, buscado, valido])

  const actual = valido && estado.buscado === buscado ? estado : VACIO
  const total = pdf?.numPages ?? 0
  return {
    termino,
    setTermino,
    // Lo que de verdad se buscó (puede ir un paso atrás de lo que se está escribiendo).
    buscado: actual.buscado,
    resultados: actual.resultados,
    revisadas: actual.revisadas,
    buscando: valido && (estado.buscado !== buscado || actual.revisadas < total),
    total,
  }
}
