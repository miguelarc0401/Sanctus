import '../lector/lector.css'
import { BookOpen, Hand, X } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Cargando } from '../components/Bloques'
import { useAjustes, useColorDeBarra } from '../lector/ajustes'
import { useAnotar } from '../lector/anotar'
import { Apariencia } from '../lector/Apariencia'
import { BarraBusqueda, BarraInferior, BarraSeleccion, BarraSuperior } from '../lector/Barras'
import { Cuaderno, type Pestana } from '../lector/Cuaderno'
import { Ficha } from '../lector/Ficha'
import { PaginaPdf } from '../lector/PaginaPdf'
import { dibujarPagina, leerIndice, proporcionDe, textoDePagina, type EntradaIndice } from '../lector/paginas'
import { MensajeAviso, type Aviso } from '../lector/Piezas'
import { rectangulosDe } from '../lector/seleccion'
import { useBusqueda } from '../lector/useBusqueda'
import {
  descargarLibro,
  urlPortada,
  useAnotaciones,
  useLibro,
  useProgreso,
  type Anotacion,
  type ColorAnotacion,
  type Rect,
  type TipoAnotacion,
} from '../lib/libros'
import { abrirPdf } from '../lib/pdf'
import { supabase } from '../lib/supabase'

type Seleccion = { pagina: number; texto: string; rects: Rect[] }

type Ventana =
  // id null: una nota nueva para la página.
  | { tipo: 'ficha'; id: number | null; pagina: number; enfocar: boolean }
  | { tipo: 'cuaderno' }
  | { tipo: 'apariencia' }

const CLAVE_CONSEJO = 'consejo-subrayar-oculto'

const BORRADA: Record<TipoAnotacion, string> = {
  subrayado: 'Se borró el subrayado',
  frase: 'Se borró la frase',
  nota: 'Se borró la nota',
  marcador: 'Se quitó la cinta',
}

function leerConsejoOculto() {
  try {
    return localStorage.getItem(CLAVE_CONSEJO) === '1'
  } catch {
    return false
  }
}

const enTelefono = () => !window.matchMedia('(min-width: 640px)').matches
const limitar = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)
// En el libro abierto, la página de la izquierda es par (la 1, la portada, va sola).
const inicioDePar = (n: number) => (n <= 1 ? 1 : n % 2 === 0 ? n : n - 1)

// Descarga el libro (sólo si la persona puede leerlo) y lo abre.
function useLibroAbierto(archivo: string | undefined) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [avance, setAvance] = useState(0)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!archivo) return
    let vigente = true
    let cerrar: (() => Promise<void>) | undefined
    descargarLibro(archivo, (fraccion) => vigente && setAvance(fraccion))
      .then(abrirPdf)
      .then((abierto) => {
        cerrar = abierto.cerrar
        if (vigente) setPdf(abierto.pdf)
        else void abierto.cerrar()
      })
      .catch(() => vigente && setError(true))
    return () => {
      vigente = false
      void cerrar?.()
    }
  }, [archivo])
  return { pdf, avance, error }
}

function useIndice(pdf: PDFDocumentProxy | null) {
  const [indice, setIndice] = useState<EntradaIndice[] | null>(null)
  useEffect(() => {
    if (!pdf) return
    let vigente = true
    leerIndice(pdf)
      .then((entradas) => vigente && setIndice(entradas))
      .catch(() => vigente && setIndice([]))
    return () => {
      vigente = false
    }
  }, [pdf])
  return indice
}

// Tamaño del área de lectura; cambia al girar el teléfono o al cambiar el tamaño de la ventana.
function useTamano(elemento: HTMLElement | null) {
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 })
  useEffect(() => {
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) =>
      setTamano({ ancho: Math.floor(entrada.contentRect.width), alto: Math.floor(entrada.contentRect.height) }),
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [elemento])
  return tamano
}

function Apertura({ titulo, portada, avance }: { titulo: string; portada: string | null; avance: number }) {
  return (
    <div className="flex flex-col items-center gap-5 px-6 text-center">
      {portada ? (
        <img
          src={portada}
          alt=""
          className="w-36 animate-[respirar_2.4s_ease-in-out_infinite] rounded-l-sm rounded-r-lg shadow-2xl ring-1 ring-black/10"
        />
      ) : (
        <BookOpen className="size-16 animate-[respirar_2.4s_ease-in-out_infinite] text-(--lector-acento)" aria-hidden />
      )}
      <p className="max-w-xs font-serif text-2xl leading-tight font-semibold">{titulo}</p>
      <div className="w-52">
        <div className="h-1.5 overflow-hidden rounded-full bg-(--lector-borde)">
          <div
            className={`h-full rounded-full bg-oro-500 transition-[width] duration-300 ${avance ? '' : 'w-1/3 animate-pulse'}`}
            style={avance ? { width: `${Math.max(avance * 100, 4)}%` } : undefined}
          />
        </div>
        <p className="mt-2 text-sm text-(--lector-tenue)" aria-live="polite">
          Abriendo el libro…{avance > 0 && ` ${Math.round(avance * 100)} %`}
        </p>
      </div>
    </div>
  )
}

// Explica cómo subrayar hasta que la persona lo cierre.
function Consejo({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div className="fixed inset-x-3 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-10 mx-auto flex max-w-sm animate-[aparecer_.3s_ease-out] items-start gap-3 rounded-2xl bg-cielo-800 p-4 text-sm text-white shadow-xl">
      <Hand className="mt-0.5 size-5 shrink-0 text-oro-400" aria-hidden />
      <p className="flex-1">
        <strong>Mantén presionado el texto</strong> (o selecciónalo con el mouse) para subrayarlo con un color, escribirle una
        nota o guardarlo en tus frases. Sólo tú lo ves.
      </p>
      <button onClick={onCerrar} aria-label="Entendido" className="-m-1 rounded-full p-1.5 text-cielo-100 hover:bg-white/10">
        <X className="size-4" />
      </button>
    </div>
  )
}

export function Lector() {
  const id = Number(useParams().id)
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const clienteConsultas = useQueryClient()
  const { data: libro, isPending: cargandoLibro } = useLibro(id)
  const { data: progreso } = useProgreso()
  const { data: anotaciones = [] } = useAnotaciones(id)
  const { pdf, avance, error: errorPdf } = useLibroAbierto(libro?.archivo)
  const indice = useIndice(pdf)
  const busqueda = useBusqueda(pdf)
  const anotar = useAnotar(id)
  const [ajustes, cambiarAjustes] = useAjustes()
  useColorDeBarra(ajustes.tema)

  const [area, setArea] = useState<HTMLElement | null>(null)
  const espacio = useTamano(area)
  const hojas = useRef<HTMLDivElement>(null)
  const [elegida, setElegida] = useState<number | null>(null)
  const [direccion, setDireccion] = useState<'adelante' | 'atras' | null>(null)
  const [proporcion, setProporcion] = useState(1.414)
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const [sinTexto, setSinTexto] = useState<Record<number, boolean>>({})
  const [abierta, setVentana] = useState<Ventana | null>(null)
  const [pestana, setPestana] = useState<Pestana>('indice')
  const [barras, setBarras] = useState(true)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [resaltando, setResaltando] = useState(false)
  const [destello, setDestello] = useState<number | null>(Number(parametros.get('marca')) || null)
  const [consejoOculto, setConsejoOculto] = useState(leerConsejoOculto)

  // Una tarjeta cuya anotación ya no existe (por ejemplo, si no se pudo guardar) cuenta como cerrada.
  const fichaAnotacion =
    abierta?.tipo === 'ficha' && abierta.id !== null ? (anotar.buscar(anotaciones, abierta.id) ?? null) : null
  const ventana = abierta?.tipo === 'ficha' && abierta.id !== null && !fichaAnotacion ? null : abierta

  // ─── Qué páginas se ven y de qué tamaño ──────────────────────────────────
  const total = pdf?.numPages ?? 0
  const pedida = Number(parametros.get('pagina')) || null
  const deseada = limitar(elegida ?? pedida ?? progreso?.get(id)?.pagina ?? 1, 1, Math.max(total, 1))
  const anchoUtil = espacio.ancho - 16
  const ajustadaAlAlto = Math.floor((espacio.alto - 16) / proporcion)
  const libroAbierto =
    ajustes.dosPaginas && ajustes.zoom === 1 && total > 2 && ajustadaAlAlto >= 280 && anchoUtil >= ajustadaAlAlto * 2 + 2
  // Página completa a la vista; en pantallas apaisadas, a lo ancho (hasta un máximo cómodo de leer).
  const base = libroAbierto
    ? ajustadaAlAlto
    : ajustadaAlAlto >= anchoUtil * 0.6
      ? Math.min(anchoUtil, ajustadaAlAlto)
      : Math.min(anchoUtil, 760)
  const ancho = Math.max(Math.floor(base * ajustes.zoom), 120)
  const actual = libroAbierto ? inicioDePar(deseada) : deseada
  const paginas = libroAbierto && actual > 1 && actual < total ? [actual, actual + 1] : [actual]
  const ultimaVisible = paginas[paginas.length - 1]
  const puedeDosPaginas = total > 2 && ajustes.zoom === 1 && anchoUtil >= ajustadaAlAlto * 2 + 2 && ajustadaAlAlto >= 280

  useEffect(() => {
    if (!pdf) return
    let vigente = true
    void proporcionDe(pdf, actual).then((p) => vigente && setProporcion(p))
    return () => {
      vigente = false
    }
  }, [pdf, actual])

  // Al cambiar de página: arriba de todo y, en un momento, las vecinas ya dibujadas para pasar sin esperar.
  const clavePaginas = paginas.join('-')
  const precargarVecinas = useEffectEvent(() => {
    if (!pdf || !espacio.ancho) return
    const vecinas = [ultimaVisible + 1, ultimaVisible + 2, paginas[0] - 1, paginas[0] - 2]
    for (const n of vecinas.filter((n) => n >= 1 && n <= total)) {
      void dibujarPagina(pdf, n, ancho).catch(() => {})
      void textoDePagina(pdf, n).catch(() => {})
    }
  })
  useEffect(() => {
    area?.scrollTo({ top: 0, left: 0 })
    const espera = window.setTimeout(precargarVecinas, 350)
    return () => window.clearTimeout(espera)
  }, [area, clavePaginas, ancho, pdf])

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

  function limpiarSeleccion() {
    setSeleccion(null)
    document.getSelection()?.removeAllRanges()
  }

  function irA(numero: number) {
    if (!total) return
    const destino = limitar(numero, 1, total)
    setDireccion(destino > ultimaVisible ? 'adelante' : destino < actual ? 'atras' : null)
    setElegida(destino)
    limpiarSeleccion()
  }
  const siguiente = () => irA(ultimaVisible + 1)
  const anterior = () => irA(libroAbierto ? inicioDePar(actual - 1) : actual - 1)

  // ─── Teclado, selección y gestos ─────────────────────────────────────────
  const alTeclear = useEffectEvent((e: KeyboardEvent) => {
    if (ventana || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (e.key === 'ArrowRight' || e.key === 'PageDown') siguiente()
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') anterior()
    if (e.key === 'Escape') limpiarSeleccion()
  })
  useEffect(() => {
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  // Qué texto está seleccionado, en qué página y en qué lugar de ella.
  useEffect(() => {
    let espera: number | undefined
    const alCambiar = () => {
      window.clearTimeout(espera)
      espera = window.setTimeout(() => {
        const elegido = document.getSelection()
        const texto = elegido?.toString().replace(/\s+/g, ' ').trim() ?? ''
        const ancla = elegido?.anchorNode
        const marco = (ancla instanceof Element ? ancla : ancla?.parentElement)?.closest<HTMLElement>('[data-pagina]')
        if (!elegido || elegido.isCollapsed || !texto || !marco?.querySelector('.textLayer')?.contains(ancla!)) {
          setSeleccion(null)
          return
        }
        const rects = rectangulosDe(elegido.getRangeAt(0), marco)
        setSeleccion(rects.length ? { pagina: Number(marco.dataset.pagina), texto, rects } : null)
      }, 250)
    }
    document.addEventListener('selectionchange', alCambiar)
    return () => {
      window.clearTimeout(espera)
      document.removeEventListener('selectionchange', alCambiar)
    }
  }, [])

  // Deslizar el dedo a los lados pasa de página; la página sigue al dedo.
  const toque = useRef<{ x: number; y: number; t: number; arrastrando: boolean } | null>(null)
  const puntero = useRef<{ tipo: string; conSeleccion: boolean }>({ tipo: '', conSeleccion: false })
  const ampliada = ajustes.zoom > 1

  function alEmpezarToque(e: React.TouchEvent) {
    toque.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), arrastrando: false } : null
  }
  function alMoverToque(e: React.TouchEvent) {
    const t = toque.current
    if (!t) return
    const dx = e.touches[0].clientX - t.x
    const dy = e.touches[0].clientY - t.y
    if (!t.arrastrando) {
      if (ampliada || !document.getSelection()?.isCollapsed || Math.abs(dy) > 14) {
        toque.current = null
        return
      }
      if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.4) return
      t.arrastrando = true
    }
    const sinMas = (dx > 0 && actual <= 1) || (dx < 0 && ultimaVisible >= total)
    if (hojas.current) {
      hojas.current.style.transition = 'none'
      hojas.current.style.transform = `translateX(${sinMas ? dx / 4 : dx}px)`
    }
  }
  function alSoltarToque(e: React.TouchEvent) {
    const t = toque.current
    toque.current = null
    if (!t?.arrastrando) return
    const dx = e.changedTouches[0].clientX - t.x
    const rapido = Math.abs(dx) / (Date.now() - t.t) > 0.5
    if ((Math.abs(dx) > 70 || rapido) && dx < 0 && ultimaVisible < total) siguiente()
    else if ((Math.abs(dx) > 70 || rapido) && dx > 0 && actual > 1) anterior()
    else if (hojas.current) {
      hojas.current.style.transition = 'transform .2s ease-out'
      hojas.current.style.transform = ''
    }
  }

  // ─── Anotar ──────────────────────────────────────────────────────────────
  const avisar = (texto: string, deshacer?: () => void) => setAviso({ texto, deshacer })
  const cerrarAviso = useCallback(() => setAviso(null), [])
  const sinConexion = () => avisar('No se pudo guardar. Revisa tu conexión.')
  const marcarSinTexto = useCallback(
    (numero: number, vacia: boolean) => setSinTexto((s) => (s[numero] === vacia ? s : { ...s, [numero]: vacia })),
    [],
  )

  function desdeSeleccion(tipo: 'subrayado' | 'frase', color: ColorAnotacion | null) {
    if (!seleccion) return null
    const { provisional, guardada } = anotar.crear({
      pagina: seleccion.pagina,
      tipo,
      texto: seleccion.texto,
      posicion: seleccion.rects,
      color,
    })
    guardada.catch(sinConexion)
    limpiarSeleccion()
    return { provisional, guardada }
  }

  function subrayar(color: ColorAnotacion) {
    cambiarAjustes({ color })
    desdeSeleccion('subrayado', color)
  }

  function guardarFrase() {
    const creada = desdeSeleccion('frase', null)
    creada?.guardada.then(
      (fila) => avisar('Guardada en «Mis frases y notas»', () => void anotar.borrar(fila).catch(sinConexion)),
      () => {},
    )
  }

  function notaDesdeSeleccion() {
    const creada = desdeSeleccion('subrayado', ajustes.color)
    if (creada) setVentana({ tipo: 'ficha', id: creada.provisional.id, pagina: creada.provisional.pagina, enfocar: true })
  }

  function borrar(anotacion: Anotacion) {
    setVentana(null)
    anotar
      .borrar(anotacion)
      .then(() => avisar(BORRADA[anotacion.tipo], () => void anotar.restaurar(anotacion).guardada.catch(sinConexion)))
      .catch(sinConexion)
  }

  const marcador = anotaciones.find((a) => a.tipo === 'marcador' && a.pagina === actual)
  function alternarMarcador() {
    if (marcador) {
      anotar
        .borrar(marcador)
        .then(() => avisar('Quitaste la cinta de esta página'))
        .catch(sinConexion)
    } else {
      anotar
        .crear({ pagina: actual, tipo: 'marcador' })
        .guardada.then(() => avisar('Página marcada con una cinta. La encuentras en el Cuaderno.'))
        .catch(sinConexion)
    }
  }

  useEffect(() => {
    if (destello === null) return
    const espera = window.setTimeout(() => setDestello(null), 2800)
    return () => window.clearTimeout(espera)
  }, [destello])
  // ─── Búsqueda resaltada ──────────────────────────────────────────────────
  const resaltado = resaltando && busqueda.buscado ? busqueda.buscado : null
  const paginasConResultado = [...new Set(busqueda.resultados.map((r) => r.pagina))]
  function irAResultado(sentido: 1 | -1) {
    if (!paginasConResultado.length) return
    const destino =
      sentido === 1
        ? (paginasConResultado.find((p) => p > ultimaVisible) ?? paginasConResultado[0])
        : (paginasConResultado.findLast((p) => p < actual) ?? paginasConResultado[paginasConResultado.length - 1])
    irA(destino)
  }

  // ─── Pantalla ────────────────────────────────────────────────────────────
  if (cargandoLibro) return <Cargando />
  if (!libro) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="rounded-2xl border border-dashed border-stone-300 px-5 py-8 text-stone-500">
          Este libro no existe o no está compartido con tu grupo.
        </p>
        <Link to="/biblioteca" className="mt-4 inline-block text-cielo-700">
          Volver a la biblioteca
        </Link>
      </div>
    )
  }

  const notas = anotaciones.filter((a) => a.tipo !== 'marcador')
  const capitulo = indice?.findLast((e) => e.pagina <= actual)?.titulo
  const listo = pdf && espacio.ancho > 0 && progreso !== undefined
  const animacion =
    direccion === 'adelante' ? 'animate-[pasar-adelante_.28s_ease-out]' : direccion === 'atras' ? 'animate-[pasar-atras_.28s_ease-out]' : ''

  return (
    <div
      className="lector lector-protegido fixed inset-0 overflow-hidden"
      data-tema={ajustes.tema}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      <main
        ref={setArea}
        className="absolute inset-0 overflow-auto overscroll-contain pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(6.25rem+env(safe-area-inset-bottom))] [scrollbar-gutter:stable]"
        style={{ touchAction: ampliada ? 'auto' : 'pan-y pinch-zoom' }}
        onPointerDown={(e) => {
          puntero.current = { tipo: e.pointerType, conSeleccion: !document.getSelection()?.isCollapsed }
        }}
        // En el teléfono, tocar la página esconde o muestra las barras para leer sin distracciones.
        onClick={() => {
          if (puntero.current.tipo === 'touch' && !puntero.current.conSeleccion && listo) setBarras((v) => !v)
        }}
        onTouchStart={alEmpezarToque}
        onTouchMove={alMoverToque}
        onTouchEnd={alSoltarToque}
        onTouchCancel={alSoltarToque}
      >
        <div className="flex min-h-full w-max min-w-full flex-col items-center justify-center p-2">
          {errorPdf ? (
            <div className="max-w-sm px-4 text-center">
              <p className="text-(--lector-tenue)">No se pudo abrir el libro. Revisa tu conexión e inténtalo de nuevo.</p>
              <button onClick={() => location.reload()} className="mt-4 rounded-xl bg-cielo-800 px-5 py-2.5 font-medium text-white">
                Reintentar
              </button>
            </div>
          ) : !listo ? (
            <Apertura titulo={libro.titulo} portada={urlPortada(libro.portada)} avance={avance} />
          ) : (
            <div ref={hojas} key={clavePaginas} className={`flex ${animacion}`}>
              {paginas.map((numero, i) => (
                <PaginaPdf
                  key={numero}
                  pdf={pdf}
                  numero={numero}
                  ancho={ancho}
                  proporcion={proporcion}
                  lado={paginas.length === 2 ? (i === 0 ? 'izquierda' : 'derecha') : null}
                  anotaciones={anotaciones.filter((a) => a.pagina === numero)}
                  ocultarMarcas={ajustes.ocultarMarcas}
                  busqueda={resaltado}
                  destello={destello}
                  onTocarAnotacion={(a) => setVentana({ tipo: 'ficha', id: a.id, pagina: a.pagina, enfocar: false })}
                  onSinTexto={marcarSinTexto}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BarraSuperior
        visible={barras}
        titulo={libro.titulo}
        subtitulo={capitulo ?? libro.autor ?? (total ? `${total} páginas` : '')}
        cuentaNotas={notas.length}
        onVolver={() => navegar('/biblioteca')}
        onBuscar={() => {
          setPestana('buscar')
          setVentana({ tipo: 'cuaderno' })
        }}
        onCuaderno={() => {
          setPestana((p) => (p === 'buscar' ? 'indice' : p))
          setVentana({ tipo: 'cuaderno' })
        }}
        onApariencia={() => setVentana({ tipo: 'apariencia' })}
      />

      {resaltado && (
        <BarraBusqueda
          buscado={resaltado}
          cuenta={busqueda.resultados.length}
          conBarras={barras}
          onAnterior={() => irAResultado(-1)}
          onSiguiente={() => irAResultado(1)}
          onQuitar={() => setResaltando(false)}
        />
      )}

      {seleccion ? (
        <BarraSeleccion
          texto={seleccion.texto}
          ultimoColor={ajustes.color}
          onSubrayar={subrayar}
          onNota={notaDesdeSeleccion}
          onFrase={guardarFrase}
          onCancelar={limpiarSeleccion}
        />
      ) : (
        <BarraInferior
          visible={barras}
          actual={actual}
          total={total}
          marcada={!!marcador}
          nombreDe={(n) => indice?.findLast((e) => e.pagina <= n)?.titulo ?? null}
          onIr={irA}
          onAnterior={anterior}
          onSiguiente={siguiente}
          onMarcar={alternarMarcador}
          onNota={() => setVentana({ tipo: 'ficha', id: null, pagina: actual, enfocar: true })}
        />
      )}

      {!barras && !seleccion && total > 0 && (
        <p className="pointer-events-none fixed inset-x-0 bottom-[calc(0.4rem+env(safe-area-inset-bottom))] text-center text-xs text-(--lector-tenue) tabular-nums">
          {paginas.join('–')} / {total}
        </p>
      )}

      {listo && !consejoOculto && !seleccion && !ventana && barras && paginas.some((n) => sinTexto[n] === false) && (
        <Consejo
          onCerrar={() => {
            setConsejoOculto(true)
            try {
              localStorage.setItem(CLAVE_CONSEJO, '1')
            } catch {
              // Sin almacenamiento sólo se oculta mientras el libro esté abierto.
            }
          }}
        />
      )}

      {aviso && <MensajeAviso aviso={aviso} onCerrar={cerrarAviso} />}

      {ventana?.tipo === 'ficha' && (ventana.id === null || fichaAnotacion) && (
        <Ficha
          anotacion={fichaAnotacion ?? null}
          pagina={ventana.pagina}
          enfocar={ventana.enfocar}
          onGuardarNota={async (nota) => {
            if (fichaAnotacion) await anotar.cambiar(fichaAnotacion.id, { nota: nota || null })
            else if (nota) {
              await anotar.crear({ pagina: ventana.pagina, tipo: 'nota', nota }).guardada
              avisar('Nota guardada')
            }
          }}
          onColor={(color) => {
            cambiarAjustes({ color })
            anotar.cambiar(fichaAnotacion!.id, { color, tipo: 'subrayado' }).catch(sinConexion)
          }}
          onFrase={(esFrase) => anotar.cambiar(fichaAnotacion!.id, { tipo: esFrase ? 'frase' : 'subrayado' }).catch(sinConexion)}
          onBorrar={() => borrar(fichaAnotacion!)}
          onCerrar={() => setVentana(null)}
        />
      )}

      {ventana?.tipo === 'cuaderno' && (
        <Cuaderno
          pestana={pestana}
          onPestana={setPestana}
          indice={indice}
          anotaciones={anotaciones}
          busqueda={busqueda}
          actual={actual}
          total={total}
          onIrPagina={(n) => {
            irA(n)
            if (enTelefono()) setVentana(null)
          }}
          onIrAnotacion={(a) => {
            irA(a.pagina)
            setDestello(a.id)
            if (enTelefono()) setVentana(null)
          }}
          onIrResultado={(n) => {
            irA(n)
            setResaltando(true)
            if (enTelefono()) setVentana(null)
          }}
          onCerrar={() => setVentana(null)}
        />
      )}

      {ventana?.tipo === 'apariencia' && (
        <Apariencia ajustes={ajustes} onCambiar={cambiarAjustes} puedeDosPaginas={puedeDosPaginas} onCerrar={() => setVentana(null)} />
      )}
    </div>
  )
}
