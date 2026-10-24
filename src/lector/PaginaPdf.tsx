import { MessageSquareText, StickyNote } from 'lucide-react'
import { TextLayer, type PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import { COLORES, type Anotacion } from '../lib/libros'
import { dibujarPagina, textoDePagina } from './paginas'
import { prepararCapaDeTexto, resaltarBusqueda, unirRenglones } from './seleccion'

export function PaginaPdf({
  pdf,
  numero,
  ancho,
  proporcion,
  lado,
  anotaciones,
  ocultarMarcas,
  busqueda,
  destello,
  onTocarAnotacion,
  onSinTexto,
}: {
  pdf: PDFDocumentProxy
  numero: number
  ancho: number
  // Alto entre ancho, para reservar el lugar mientras se dibuja.
  proporcion: number
  // En el libro abierto: de qué lado del lomo queda la página.
  lado: 'izquierda' | 'derecha' | null
  anotaciones: Anotacion[]
  ocultarMarcas: boolean
  busqueda: string | null
  destello: number | null
  onTocarAnotacion: (a: Anotacion) => void
  onSinTexto: (numero: number, sinTexto: boolean) => void
}) {
  const marco = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLDivElement>(null)
  const capa = useRef<HTMLDivElement>(null)
  // Alto entre ancho de esta página ya dibujada; con ella cambia de tamaño al instante al agrandarla.
  const [propia, setPropia] = useState<number | null>(null)
  const [capaLista, setCapaLista] = useState(0)
  // Las páginas escaneadas son sólo imagen: no tienen texto que subrayar.
  const [sinTexto, setSinTexto] = useState(false)

  // Pone la página dibujada (si ya estaba guardada, al instante) y encima su texto invisible para seleccionarlo.
  useEffect(() => {
    let cancelado = false
    let textos: TextLayer | undefined
    let desconectar: (() => void) | undefined
    void (async () => {
      const dibujo = await dibujarPagina(pdf, numero, ancho)
      if (cancelado) return
      dibujo.lienzo.className = 'lienzo absolute inset-0 size-full'
      lienzo.current!.replaceChildren(dibujo.lienzo)
      setPropia(dibujo.alto / ancho)
      const [contenido, pagina] = await Promise.all([textoDePagina(pdf, numero), pdf.getPage(numero)])
      if (cancelado) return
      setSinTexto(contenido.items.length === 0)
      onSinTexto(numero, contenido.items.length === 0)
      const viewport = pagina.getViewport({ scale: ancho / pagina.getViewport({ scale: 1 }).width })
      const contenedor = capa.current!
      contenedor.replaceChildren()
      contenedor.style.setProperty('--total-scale-factor', String(viewport.scale))
      textos = new TextLayer({ textContentSource: contenido, container: contenedor, viewport })
      await textos.render()
      if (cancelado) return
      desconectar = prepararCapaDeTexto(contenedor)
      setCapaLista((n) => n + 1)
    })().catch((e: { name?: string }) => {
      if (!cancelado && e?.name !== 'RenderingCancelledException') console.error(e)
    })
    return () => {
      cancelado = true
      textos?.cancel()
      desconectar?.()
    }
  }, [pdf, numero, ancho, onSinTexto])

  useEffect(() => {
    if (!busqueda || !capaLista) return
    return resaltarBusqueda(capa.current!, busqueda)
  }, [busqueda, capaLista])

  const subrayados = ocultarMarcas ? [] : anotaciones.filter((a) => a.posicion?.length)
  const renglones = new Map(subrayados.map((a) => [a.id, unirRenglones(a.posicion!)]))
  const notasDePagina = anotaciones.filter((a) => a.tipo === 'nota' && !a.posicion?.length)
  const marcada = anotaciones.some((a) => a.tipo === 'marcador')

  // Tocar un subrayado lo abre (y no oculta las barras).
  function alTocar(e: React.MouseEvent) {
    if (!document.getSelection()?.isCollapsed) return
    const caja = marco.current!.getBoundingClientRect()
    const x = (e.clientX - caja.left) / caja.width
    const y = (e.clientY - caja.top) / caja.height
    const tocada = subrayados.findLast((a) =>
      renglones.get(a.id)!.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y - 0.006 && y <= r.y + r.h + 0.006),
    )
    if (tocada) {
      e.stopPropagation()
      onTocarAnotacion(tocada)
    }
  }

  return (
    <div
      ref={marco}
      data-pagina={numero}
      onClick={alTocar}
      className="pagina relative shrink-0"
      style={{ width: ancho, height: ancho * (propia ?? proporcion) }}
    >
      <div ref={lienzo} aria-hidden className="absolute inset-0 z-0" />
      {lado && <div aria-hidden className={`lomo lomo-${lado} pointer-events-none absolute inset-y-0 z-[1]`} />}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
        {subrayados.flatMap((a) =>
          renglones.get(a.id)!.map((r, i) => (
            <div
              key={`${a.id}-${i}`}
              className={`marca absolute rounded-[3px] ${a.tipo === 'frase' ? 'marca-frase' : ''} ${destello === a.id ? 'destello' : ''}`}
              style={{
                left: `${r.x * 100}%`,
                top: `${(r.y - r.h * 0.08) * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 1.16 * 100}%`,
                background: a.tipo === 'frase' ? undefined : COLORES[a.color ?? 'amarillo'].marca,
              }}
            />
          )),
        )}
      </div>
      <div ref={capa} className="textLayer" />

      {marcada && <span aria-hidden className="cinta absolute -top-1 right-5 z-[3] h-12 w-5" />}

      {sinTexto && (
        <p className="absolute inset-x-3 bottom-3 z-[3] mx-auto w-fit max-w-[90%] rounded-full bg-stone-900/75 px-3 py-1.5 text-center text-xs text-white backdrop-blur">
          Página de imagen: no se puede subrayar, pero sí escribirle una nota o marcarla.
        </p>
      )}

      {subrayados
        .filter((a) => a.nota)
        .map((a) => (
          <button
            key={a.id}
            onClick={(e) => {
              e.stopPropagation()
              onTocarAnotacion(a)
            }}
            aria-label="Ver tu nota"
            className="absolute right-0.5 z-[3] grid size-7 -translate-y-1 place-items-center rounded-full bg-(--lector-hoja) text-(--lector-acento) shadow ring-2"
            style={{ top: `${renglones.get(a.id)![0].y * 100}%`, ['--tw-ring-color' as string]: a.tipo === 'frase' ? '#c49a2c' : COLORES[a.color ?? 'amarillo'].muestra }}
          >
            <MessageSquareText className="size-3.5" aria-hidden />
          </button>
        ))}

      {notasDePagina.length > 0 && (
        <div className="absolute top-2 left-2 z-[3] flex flex-col gap-1.5">
          {notasDePagina.map((a) => (
            <button
              key={a.id}
              onClick={(e) => {
                e.stopPropagation()
                onTocarAnotacion(a)
              }}
              aria-label="Ver tu nota de esta página"
              className="nota-pagina grid size-8 place-items-center rounded-md bg-amber-200 text-amber-900 shadow-md"
            >
              <StickyNote className="size-4" aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
