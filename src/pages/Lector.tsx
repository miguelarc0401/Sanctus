import '../lector.css'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  MessageSquarePlus,
  NotebookText,
  Quote,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react'
import { TextLayer, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Cargando, Vacio } from '../components/Bloques'
import { AreaTexto, Boton, Campo, MensajeError } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import {
  descargarLibro,
  ICONOS_ANOTACION,
  useAnotaciones,
  useLibro,
  useProgreso,
  type Anotacion,
  type Rect,
  type TipoAnotacion,
} from '../lib/libros'
import { abrirPdf } from '../lib/pdf'
import { supabase } from '../lib/supabase'
import { useEnvio } from '../lib/useEnvio'

type Seleccion = { texto: string; rects: Rect[] }

const COLORES: Partial<Record<TipoAnotacion, string>> = {
  subrayado: 'bg-yellow-300/50',
  frase: 'bg-sky-300/45',
}

// Nombre de quien lee repetido en diagonal sobre la página.
function MarcaDeAgua({ texto }: { texto: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      <div className="absolute -inset-1/2 flex rotate-[-30deg] flex-wrap content-start gap-x-14 gap-y-20 opacity-[0.13]">
        {Array.from({ length: 80 }, (_, i) => (
          <span key={i} className="text-sm font-semibold whitespace-nowrap text-cielo-900">
            {texto}
          </span>
        ))}
      </div>
    </div>
  )
}

function PaginaPdf({
  pdf,
  numero,
  ancho,
  anotaciones,
  marca,
  onSeleccion,
  onTocarAnotacion,
  onSinTexto,
}: {
  pdf: PDFDocumentProxy
  numero: number
  ancho: number
  anotaciones: Anotacion[]
  marca: string
  onSeleccion: (s: Seleccion | null) => void
  onTocarAnotacion: (a: Anotacion) => void
  onSinTexto: (sinTexto: boolean) => void
}) {
  const marco = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const capa = useRef<HTMLDivElement>(null)
  const [alto, setAlto] = useState(0)

  // Dibuja la página y, encima, su texto invisible para poder seleccionarlo.
  useEffect(() => {
    let cancelado = false
    let dibujo: RenderTask | undefined
    let textos: TextLayer | undefined
    void (async () => {
      const pagina = await pdf.getPage(numero)
      if (cancelado) return
      const escala = ancho / pagina.getViewport({ scale: 1 }).width
      const viewport = pagina.getViewport({ scale: escala })
      const densidad = window.devicePixelRatio || 1
      const canvas = lienzo.current!
      canvas.width = Math.floor(viewport.width * densidad)
      canvas.height = Math.floor(viewport.height * densidad)
      setAlto(viewport.height)
      dibujo = pagina.render({
        canvas,
        viewport,
        transform: densidad === 1 ? undefined : [densidad, 0, 0, densidad, 0, 0],
      })
      await dibujo.promise
      const contenido = await pagina.getTextContent()
      if (cancelado) return
      onSinTexto(contenido.items.length === 0)
      const contenedor = capa.current!
      contenedor.replaceChildren()
      contenedor.style.setProperty('--total-scale-factor', String(escala))
      textos = new TextLayer({ textContentSource: contenido, container: contenedor, viewport })
      await textos.render()
    })().catch((e: { name?: string }) => {
      if (!cancelado && e?.name !== 'RenderingCancelledException') console.error(e)
    })
    return () => {
      cancelado = true
      dibujo?.cancel()
      textos?.cancel()
    }
  }, [pdf, numero, ancho, onSinTexto])

  // Avisa qué texto de esta página está seleccionado, con su posición en proporción de la página.
  useEffect(() => {
    let espera: number | undefined
    const alCambiar = () => {
      window.clearTimeout(espera)
      espera = window.setTimeout(() => {
        const seleccion = document.getSelection()
        const texto = seleccion?.toString().trim() ?? ''
        if (!seleccion || seleccion.isCollapsed || !texto || !capa.current?.contains(seleccion.anchorNode)) {
          onSeleccion(null)
          return
        }
        const caja = marco.current!.getBoundingClientRect()
        const rects = [...seleccion.getRangeAt(0).getClientRects()]
          .filter((r) => r.width > 1 && r.height > 1)
          .map((r) => ({
            x: (r.left - caja.left) / caja.width,
            y: (r.top - caja.top) / caja.height,
            w: r.width / caja.width,
            h: r.height / caja.height,
          }))
        onSeleccion({ texto, rects })
      }, 250)
    }
    document.addEventListener('selectionchange', alCambiar)
    return () => {
      window.clearTimeout(espera)
      document.removeEventListener('selectionchange', alCambiar)
    }
  }, [onSeleccion])

  // Tocar un subrayado abre su nota.
  function alTocar(e: React.MouseEvent) {
    if (!document.getSelection()?.isCollapsed) return
    const caja = marco.current!.getBoundingClientRect()
    const x = (e.clientX - caja.left) / caja.width
    const y = (e.clientY - caja.top) / caja.height
    const tocada = anotaciones.find((a) =>
      a.posicion?.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y - 0.005 && y <= r.y + r.h + 0.005),
    )
    if (tocada) onTocarAnotacion(tocada)
  }

  return (
    <div
      ref={marco}
      onClick={alTocar}
      className="relative mx-auto bg-white shadow-md"
      style={{ width: ancho, height: alto || ancho * 1.3 }}
    >
      <canvas ref={lienzo} className="absolute inset-0 z-0" style={{ width: ancho, height: alto }} draggable={false} />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
        {anotaciones.flatMap((a) =>
          (a.posicion ?? []).map((r, i) => (
            <div
              key={`${a.id}-${i}`}
              className={`absolute rounded-sm mix-blend-multiply ${COLORES[a.tipo] ?? ''}`}
              style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
            />
          )),
        )}
      </div>
      <div ref={capa} className="textLayer" />
      <MarcaDeAgua texto={marca} />
    </div>
  )
}

// Ancho disponible para la página; se recalcula al girar el teléfono o cambiar el tamaño de la ventana.
function useAnchoDisponible(maximo: number) {
  const [elemento, setElemento] = useState<HTMLElement | null>(null)
  const [ancho, setAncho] = useState(0)
  useEffect(() => {
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) => {
      setAncho(Math.floor(Math.min(entrada.contentRect.width, maximo)))
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [elemento, maximo])
  return { contenedor: setElemento, ancho }
}

function BotonBarra({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs text-cielo-800 hover:bg-cielo-50"
    >
      {children}
      {etiqueta}
    </button>
  )
}

function FormNota({
  cita,
  notaInicial = '',
  onGuardar,
  onEliminar,
}: {
  cita?: string | null
  notaInicial?: string
  onGuardar: (nota: string) => Promise<void>
  onEliminar?: () => Promise<void>
}) {
  const [nota, setNota] = useState(notaInicial)
  const { guardando, error, enviar } = useEnvio()
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(() => onGuardar(nota.trim()))
      }}
    >
      {cita && <p className="font-serif text-lg leading-snug text-cielo-900 italic">«{cita}»</p>}
      <AreaTexto id="nota" etiqueta="Tu nota" ayuda="(sólo tú la ves)" rows={4} value={nota} onChange={(e) => setNota(e.target.value)} />
      {error && <MensajeError>{error}</MensajeError>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {onEliminar ? (
          <Boton type="button" variante="peligro" disabled={guardando} onClick={() => void enviar(onEliminar)}>
            <Trash2 className="size-4" aria-hidden /> Borrar
          </Boton>
        ) : (
          <span />
        )}
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
      </div>
    </form>
  )
}

function FormIrA({ total, actual, onIr }: { total: number; actual: number; onIr: (n: number) => void }) {
  const [valor, setValor] = useState(String(actual))
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onIr(Number(valor))
      }}
    >
      <Campo
        id="pagina"
        etiqueta={`Página (1 a ${total})`}
        type="number"
        inputMode="numeric"
        min={1}
        max={total}
        required
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />
      <Boton type="submit" className="w-full">
        Ir
      </Boton>
    </form>
  )
}

const NOMBRES: Record<TipoAnotacion, string> = {
  subrayado: 'Subrayado',
  frase: 'Frase guardada',
  nota: 'Nota de la página',
  marcador: 'Página marcada',
}

type Ventana =
  | { tipo: 'notaSeleccion'; seleccion: Seleccion }
  | { tipo: 'notaPagina' }
  | { tipo: 'anotacion'; anotacion: Anotacion }
  | { tipo: 'lista' }
  | { tipo: 'ir' }

export function Lector() {
  const id = Number(useParams().id)
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const clienteConsultas = useQueryClient()
  const { perfil } = useAuth()
  const { data: libro, isPending: cargandoLibro } = useLibro(id)
  const { data: progreso } = useProgreso()
  const { data: anotaciones = [] } = useAnotaciones(id)
  const { contenedor, ancho } = useAnchoDisponible(900)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [errorPdf, setErrorPdf] = useState(false)
  const [elegida, setElegida] = useState<number | null>(null)
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const [sinTexto, setSinTexto] = useState(false)
  const [ventana, setVentana] = useState<Ventana | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const archivo = libro?.archivo

  // Descarga el libro (sólo si la persona puede leerlo) y lo abre.
  useEffect(() => {
    if (!archivo) return
    let vigente = true
    let cerrar: (() => Promise<void>) | undefined
    descargarLibro(archivo)
      .then(abrirPdf)
      .then((abierto) => {
        cerrar = abierto.cerrar
        if (vigente) setPdf(abierto.pdf)
        else void abierto.cerrar()
      })
      .catch(() => vigente && setErrorPdf(true))
    return () => {
      vigente = false
      void cerrar?.()
    }
  }, [archivo])

  const total = pdf?.numPages ?? 0
  const pedida = Number(parametros.get('pagina')) || null
  const actual = Math.min(Math.max(elegida ?? pedida ?? progreso?.get(id) ?? 1, 1), Math.max(total, 1))

  // Recuerda la página después de un momento sin cambiarla.
  useEffect(() => {
    if (!pdf) return
    const espera = window.setTimeout(() => {
      void supabase.rpc('guardar_progreso', { libro: id, pagina: actual }).then(() => {
        void clienteConsultas.invalidateQueries({ queryKey: ['progreso'] })
      })
    }, 1500)
    return () => window.clearTimeout(espera)
  }, [pdf, id, actual, clienteConsultas])

  function irA(numero: number) {
    if (!total) return
    setElegida(Math.min(Math.max(numero, 1), total))
    setSeleccion(null)
    document.getSelection()?.removeAllRanges()
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (ventana) return
      if (e.key === 'ArrowRight') irA(actual + 1)
      if (e.key === 'ArrowLeft') irA(actual - 1)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })

  const temporizadorAviso = useRef<number | undefined>(undefined)
  function avisar(texto: string) {
    setAviso(texto)
    window.clearTimeout(temporizadorAviso.current)
    temporizadorAviso.current = window.setTimeout(() => setAviso(null), 2500)
  }

  const recargarAnotaciones = () => void clienteConsultas.invalidateQueries({ queryKey: ['anotaciones'] })

  async function anotar(tipo: TipoAnotacion, extra: Partial<Pick<Anotacion, 'texto' | 'posicion' | 'nota'>> = {}) {
    const { error } = await supabase.from('anotaciones').insert({ libro_id: id, pagina: actual, tipo, ...extra })
    if (error) throw error
    recargarAnotaciones()
  }

  async function desdeSeleccion(tipo: 'subrayado' | 'frase') {
    if (!seleccion) return
    try {
      await anotar(tipo, { texto: seleccion.texto, posicion: seleccion.rects })
      avisar(tipo === 'frase' ? 'Frase guardada en «Mis frases y notas»' : 'Subrayado')
    } catch {
      avisar('No se pudo guardar. Revisa tu conexión.')
    }
    setSeleccion(null)
    document.getSelection()?.removeAllRanges()
  }

  const delaPagina = anotaciones.filter((a) => a.pagina === actual)
  const marcador = delaPagina.find((a) => a.tipo === 'marcador')

  async function alternarMarcador() {
    try {
      if (marcador) {
        const { error } = await supabase.from('anotaciones').delete().eq('id', marcador.id)
        if (error) throw error
        recargarAnotaciones()
        avisar('Quitaste la marca de esta página')
      } else {
        await anotar('marcador')
        avisar('Página marcada')
      }
    } catch {
      avisar('No se pudo guardar. Revisa tu conexión.')
    }
  }

  async function borrar(anotacion: Anotacion) {
    const { error } = await supabase.from('anotaciones').delete().eq('id', anotacion.id)
    if (error) throw error
    recargarAnotaciones()
    setVentana(null)
  }

  if (cargandoLibro) return <Cargando />
  if (!libro) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <Vacio>Este libro no existe o no está compartido con tu grupo.</Vacio>
        <Link to="/biblioteca" className="mt-4 block text-center text-cielo-700">
          Volver a la biblioteca
        </Link>
      </div>
    )
  }

  const marca = `${perfil?.nombre ?? ''} · ${perfil?.acceso ?? ''}`

  return (
    <div
      className="lector-protegido flex min-h-dvh flex-col bg-stone-200/60"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      <header className="sticky top-0 z-20 bg-cielo-800 pt-[env(safe-area-inset-top)] text-white shadow">
        <div className="mx-auto flex max-w-3xl items-center gap-1 px-2 py-2">
          <button onClick={() => navegar('/biblioteca')} aria-label="Volver a la biblioteca" className="rounded-full p-2 hover:bg-white/10">
            <ArrowLeft className="size-5" />
          </button>
          <p className="min-w-0 flex-1 truncate font-serif text-xl font-semibold">{libro.titulo}</p>
          <button
            onClick={() => void alternarMarcador()}
            aria-label={marcador ? 'Quitar marca de esta página' : 'Marcar esta página'}
            className="rounded-full p-2 hover:bg-white/10"
          >
            {marcador ? <BookmarkCheck className="size-5 text-oro-400" /> : <Bookmark className="size-5" />}
          </button>
          <button onClick={() => setVentana({ tipo: 'notaPagina' })} aria-label="Nota en esta página" className="rounded-full p-2 hover:bg-white/10">
            <StickyNote className="size-5" />
          </button>
          <button onClick={() => setVentana({ tipo: 'lista' })} aria-label="Mis notas de este libro" className="rounded-full p-2 hover:bg-white/10">
            <NotebookText className="size-5" />
          </button>
        </div>
      </header>

      <main
        ref={contenedor}
        className="mx-auto w-full max-w-3xl flex-1 px-2 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
      >
        {errorPdf ? (
          <Vacio>No se pudo abrir el libro. Revisa tu conexión e inténtalo de nuevo.</Vacio>
        ) : pdf && ancho > 0 && progreso !== undefined ? (
          <>
            <PaginaPdf
              pdf={pdf}
              numero={actual}
              ancho={ancho}
              anotaciones={delaPagina}
              marca={marca}
              onSeleccion={setSeleccion}
              onTocarAnotacion={(anotacion) => setVentana({ tipo: 'anotacion', anotacion })}
              onSinTexto={setSinTexto}
            />
            {sinTexto && (
              <p className="mx-auto mt-3 max-w-md text-center text-sm text-stone-500">
                Esta página es una imagen: no se puede subrayar, pero puedes ponerle una nota o marcarla.
              </p>
            )}
          </>
        ) : (
          <Cargando />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {seleccion ? (
          // preventDefault evita que, al tocar un botón, el navegador borre la selección antes de usarla.
          <div className="mx-auto flex max-w-3xl items-center gap-1 px-2 py-2" onMouseDown={(e) => e.preventDefault()}>
            <p className="line-clamp-2 min-w-0 flex-1 px-1 text-sm text-stone-600 italic">«{seleccion.texto}»</p>
            <BotonBarra etiqueta="Subrayar" onClick={() => void desdeSeleccion('subrayado')}>
              <Highlighter className="size-5" aria-hidden />
            </BotonBarra>
            <BotonBarra etiqueta="Nota" onClick={() => setVentana({ tipo: 'notaSeleccion', seleccion })}>
              <MessageSquarePlus className="size-5" aria-hidden />
            </BotonBarra>
            <BotonBarra etiqueta="Frase" onClick={() => void desdeSeleccion('frase')}>
              <Quote className="size-5" aria-hidden />
            </BotonBarra>
            <button
              onClick={() => {
                setSeleccion(null)
                document.getSelection()?.removeAllRanges()
              }}
              aria-label="Cancelar"
              className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl items-center justify-between px-2 py-2">
            <button
              onClick={() => irA(actual - 1)}
              disabled={actual <= 1}
              className="flex items-center gap-1 rounded-xl px-3 py-2.5 font-medium text-cielo-800 hover:bg-cielo-50 disabled:opacity-30"
            >
              <ChevronLeft className="size-5" aria-hidden /> Anterior
            </button>
            <button onClick={() => setVentana({ tipo: 'ir' })} className="rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-100">
              {total ? `${actual} de ${total}` : '…'}
            </button>
            <button
              onClick={() => irA(actual + 1)}
              disabled={!total || actual >= total}
              className="flex items-center gap-1 rounded-xl px-3 py-2.5 font-medium text-cielo-800 hover:bg-cielo-50 disabled:opacity-30"
            >
              Siguiente <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        )}
      </nav>

      {aviso && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-sm rounded-xl bg-stone-900/90 px-4 py-3 text-center text-sm text-white shadow-lg"
        >
          {aviso}
        </p>
      )}

      {ventana?.tipo === 'notaSeleccion' && (
        <Hoja titulo="Nota" onCerrar={() => setVentana(null)}>
          <FormNota
            cita={ventana.seleccion.texto}
            onGuardar={async (nota) => {
              await anotar('subrayado', { texto: ventana.seleccion.texto, posicion: ventana.seleccion.rects, nota: nota || null })
              setVentana(null)
              setSeleccion(null)
              document.getSelection()?.removeAllRanges()
            }}
          />
        </Hoja>
      )}
      {ventana?.tipo === 'notaPagina' && (
        <Hoja titulo={`Nota en la página ${actual}`} onCerrar={() => setVentana(null)}>
          <FormNota
            onGuardar={async (nota) => {
              if (!nota) return setVentana(null)
              await anotar('nota', { nota })
              setVentana(null)
              avisar('Nota guardada')
            }}
          />
        </Hoja>
      )}
      {ventana?.tipo === 'anotacion' && (
        <Hoja titulo={NOMBRES[ventana.anotacion.tipo]} onCerrar={() => setVentana(null)}>
          <FormNota
            cita={ventana.anotacion.texto}
            notaInicial={ventana.anotacion.nota ?? ''}
            onGuardar={async (nota) => {
              const { error } = await supabase.from('anotaciones').update({ nota: nota || null }).eq('id', ventana.anotacion.id)
              if (error) throw error
              recargarAnotaciones()
              setVentana(null)
            }}
            onEliminar={() => borrar(ventana.anotacion)}
          />
        </Hoja>
      )}
      {ventana?.tipo === 'ir' && (
        <Hoja titulo="Ir a la página" onCerrar={() => setVentana(null)}>
          <FormIrA
            total={total}
            actual={actual}
            onIr={(n) => {
              irA(n)
              setVentana(null)
            }}
          />
        </Hoja>
      )}
      {ventana?.tipo === 'lista' && (
        <Hoja titulo="Mis notas de este libro" onCerrar={() => setVentana(null)}>
          {anotaciones.length === 0 ? (
            <Vacio>Todavía no tienes notas, subrayados ni páginas marcadas en este libro.</Vacio>
          ) : (
            <ul className="space-y-2">
              {anotaciones.map((anotacion) => {
                const Icono = ICONOS_ANOTACION[anotacion.tipo]
                return (
                  <li key={anotacion.id} className="flex items-start gap-2 rounded-xl bg-white p-3 ring-1 ring-stone-200">
                    <button
                      onClick={() => {
                        irA(anotacion.pagina)
                        setVentana(null)
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-1.5 text-xs text-stone-500">
                        <Icono className="size-3.5 text-oro-600" aria-hidden /> Página {anotacion.pagina} · {NOMBRES[anotacion.tipo]}
                      </span>
                      {anotacion.texto && <span className="mt-1 line-clamp-3 block text-stone-800 italic">«{anotacion.texto}»</span>}
                      {anotacion.nota && <span className="mt-1 block whitespace-pre-line text-stone-600">{anotacion.nota}</span>}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('¿Borrar esta nota?')) void borrar(anotacion).then(() => setVentana({ tipo: 'lista' }))
                      }}
                      aria-label="Borrar"
                      className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-red-700"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Hoja>
      )}
    </div>
  )
}
