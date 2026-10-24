import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  NotebookPen,
  NotebookText,
  Quote,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { COLORES, type ColorAnotacion } from '../lib/libros'
import { BotonIcono } from './Piezas'

const ocultable = (visible: boolean, hacia: 'arriba' | 'abajo') =>
  `transition-transform duration-300 ease-out ${visible ? '' : hacia === 'arriba' ? '-translate-y-full' : 'translate-y-full'}`

export function BarraSuperior({
  visible,
  titulo,
  subtitulo,
  cuentaNotas,
  onVolver,
  onBuscar,
  onCuaderno,
  onApariencia,
}: {
  visible: boolean
  titulo: string
  subtitulo: string
  cuentaNotas: number
  onVolver: () => void
  onBuscar: () => void
  onCuaderno: () => void
  onApariencia: () => void
}) {
  return (
    <header
      className={`fixed inset-x-0 top-0 z-20 border-b border-(--lector-borde) bg-(--lector-barra) pt-[env(safe-area-inset-top)] backdrop-blur-md ${ocultable(visible, 'arriba')}`}
    >
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-0.5 px-1.5">
        <BotonIcono etiqueta="Volver a la biblioteca" onClick={onVolver}>
          <ArrowLeft className="size-5" aria-hidden />
        </BotonIcono>
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate font-serif text-xl leading-tight font-semibold text-(--lector-tinta)">{titulo}</h1>
          <p className="truncate text-xs text-(--lector-tenue)">{subtitulo}</p>
        </div>
        <BotonIcono etiqueta="Buscar en el libro" onClick={onBuscar}>
          <Search className="size-5" aria-hidden />
        </BotonIcono>
        <BotonIcono etiqueta="Índice y mis notas" onClick={onCuaderno}>
          <NotebookText className="size-5" aria-hidden />
          {cuentaNotas > 0 && (
            <span className="absolute top-1 right-0.5 min-w-4 rounded-full bg-oro-500 px-1 text-[10px] leading-4 font-semibold text-white">
              {cuentaNotas > 99 ? '99+' : cuentaNotas}
            </span>
          )}
        </BotonIcono>
        <BotonIcono etiqueta="Apariencia: fondo y tamaño" onClick={onApariencia}>
          <span aria-hidden className="font-serif text-xl leading-none font-semibold">
            Aa
          </span>
        </BotonIcono>
      </div>
    </header>
  )
}

export function BarraInferior({
  visible,
  actual,
  total,
  marcada,
  nombreDe,
  onIr,
  onAnterior,
  onSiguiente,
  onMarcar,
  onNota,
}: {
  visible: boolean
  actual: number
  total: number
  marcada: boolean
  // Capítulo de una página, para mostrarlo mientras se arrastra.
  nombreDe: (pagina: number) => string | null
  onIr: (pagina: number) => void
  onAnterior: () => void
  onSiguiente: () => void
  onMarcar: () => void
  onNota: () => void
}) {
  // Página que se está eligiendo con el deslizador; salta a ella al soltar o al quedarse quieto.
  const [previa, setPrevia] = useState<number | null>(null)
  const ir = useEffectEvent(onIr)
  useEffect(() => {
    if (previa === null) return
    const espera = window.setTimeout(() => {
      ir(previa)
      setPrevia(null)
    }, 450)
    return () => window.clearTimeout(espera)
  }, [previa])

  const mostrada = previa ?? actual
  const capitulo = previa !== null ? nombreDe(previa) : null
  const avance = total > 1 ? ((mostrada - 1) / (total - 1)) * 100 : 0

  return (
    <nav
      aria-label="Páginas"
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-(--lector-borde) bg-(--lector-barra) pb-[env(safe-area-inset-bottom)] backdrop-blur-md ${ocultable(visible, 'abajo')}`}
    >
      <div className="relative mx-auto max-w-4xl px-4 pt-2.5">
        {previa !== null && (
          <p
            aria-hidden
            className="absolute bottom-full mb-2 max-w-60 -translate-x-1/2 truncate rounded-xl bg-stone-900/90 px-3 py-1.5 text-center text-sm text-white shadow-lg"
            // Sobre el botón del deslizador, sin salirse de la pantalla.
            style={{ left: `clamp(7.5rem, calc(1rem + (100% - 2rem) * ${avance / 100}), calc(100% - 7.5rem))` }}
          >
            Página {previa}
            {capitulo && <span className="block truncate text-xs text-stone-300">{capitulo}</span>}
          </p>
        )}
        <input
          type="range"
          min={1}
          max={Math.max(total, 1)}
          value={mostrada}
          disabled={total < 2}
          onChange={(e) => setPrevia(Number(e.target.value))}
          aria-label="Ir a la página"
          aria-valuetext={`Página ${mostrada} de ${total}`}
          className="deslizador block w-full"
          style={{ ['--avance' as string]: `${avance}%` }}
        />
      </div>
      <div className="mx-auto flex max-w-4xl items-center justify-between px-1.5 pb-1">
        <BotonIcono etiqueta={marcada ? 'Quitar la cinta de esta página' : 'Marcar esta página con una cinta'} activo={marcada} onClick={onMarcar}>
          {marcada ? <BookmarkCheck className="size-5 text-oro-500" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}
        </BotonIcono>
        <div className="flex items-center">
          <BotonIcono etiqueta="Página anterior" onClick={onAnterior} disabled={actual <= 1}>
            <ChevronLeft className="size-6" aria-hidden />
          </BotonIcono>
          <p className="min-w-24 text-center text-sm text-(--lector-tenue) tabular-nums" aria-live="polite">
            {total ? (
              <>
                <span className="font-semibold text-(--lector-tinta)">{mostrada}</span> de {total}
              </>
            ) : (
              '…'
            )}
          </p>
          <BotonIcono etiqueta="Página siguiente" onClick={onSiguiente} disabled={!total || actual >= total}>
            <ChevronRight className="size-6" aria-hidden />
          </BotonIcono>
        </div>
        <BotonIcono etiqueta="Escribir una nota en esta página" onClick={onNota}>
          <NotebookPen className="size-5" aria-hidden />
        </BotonIcono>
      </div>
    </nav>
  )
}

// Aparece al seleccionar texto: un toque en un color lo subraya.
export function BarraSeleccion({
  texto,
  ultimoColor,
  onSubrayar,
  onNota,
  onFrase,
  onCancelar,
}: {
  texto: string
  ultimoColor: ColorAnotacion
  onSubrayar: (color: ColorAnotacion) => void
  onNota: () => void
  onFrase: () => void
  onCancelar: () => void
}) {
  return (
    // preventDefault evita que, al tocar un botón, el navegador borre la selección antes de usarla.
    <div
      className="fixed inset-x-0 bottom-0 z-30 animate-[subir_.2s_ease-out] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="mx-auto max-w-md rounded-3xl bg-(--lector-hoja) p-3 text-(--lector-tinta) shadow-2xl ring-1 ring-(--lector-borde)">
        <div className="flex items-start gap-2 pl-1">
          <p className="line-clamp-2 flex-1 pt-1 font-serif text-lg leading-snug italic">«{texto}»</p>
          <BotonIcono etiqueta="Cancelar" onClick={onCancelar} className="-mt-1 -mr-1 size-9">
            <X className="size-5" aria-hidden />
          </BotonIcono>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div role="group" aria-label="Subrayar" className="flex flex-col gap-1">
            <span className="pl-1 text-xs text-(--lector-tenue)">Subrayar</span>
            <div className="flex gap-1">
              {(Object.keys(COLORES) as ColorAnotacion[]).map((color) => (
                <button
                  key={color}
                  onClick={() => onSubrayar(color)}
                  aria-label={`Subrayar en ${COLORES[color].nombre.toLowerCase()}`}
                  className="grid size-11 place-items-center rounded-full transition hover:bg-(--lector-suave) active:scale-90"
                >
                  <span
                    className={`size-8 rounded-full shadow-sm ring-(--lector-acento) ${color === ultimoColor ? 'ring-2 ring-offset-2 ring-offset-(--lector-hoja)' : ''}`}
                    style={{ background: COLORES[color].muestra }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={onNota}
              className="flex w-16 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-xs font-medium hover:bg-(--lector-suave) active:scale-95"
            >
              <MessageSquarePlus className="size-6 text-(--lector-acento)" aria-hidden />
              Nota
            </button>
            <button
              onClick={onFrase}
              className="flex w-16 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-xs font-medium hover:bg-(--lector-suave) active:scale-95"
            >
              <Quote className="size-6 text-oro-500" aria-hidden />
              Frase
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Lo buscado queda resaltado; desde aquí se salta entre las páginas donde aparece.
export function BarraBusqueda({
  buscado,
  cuenta,
  onAnterior,
  onSiguiente,
  onQuitar,
  conBarras,
}: {
  buscado: string
  cuenta: number
  onAnterior: () => void
  onSiguiente: () => void
  onQuitar: () => void
  conBarras: boolean
}) {
  return (
    <div
      className={`fixed inset-x-0 z-10 flex justify-center px-3 transition-[top] duration-300 ${conBarras ? 'top-[calc(4rem+env(safe-area-inset-top))]' : 'top-[calc(0.5rem+env(safe-area-inset-top))]'}`}
    >
      <div className="flex max-w-full items-center gap-0.5 rounded-full bg-(--lector-hoja) py-0.5 pr-0.5 pl-4 text-sm text-(--lector-tinta) shadow-lg ring-1 ring-(--lector-borde)">
        <Search className="mr-1.5 size-4 shrink-0 text-(--lector-tenue)" aria-hidden />
        <p className="truncate">
          «{buscado}» <span className="text-(--lector-tenue)">· {cuenta === 1 ? '1 resultado' : `${cuenta} resultados`}</span>
        </p>
        <BotonIcono etiqueta="Resultado anterior" onClick={onAnterior} disabled={!cuenta} className="size-9">
          <ChevronLeft className="size-5" aria-hidden />
        </BotonIcono>
        <BotonIcono etiqueta="Resultado siguiente" onClick={onSiguiente} disabled={!cuenta} className="size-9">
          <ChevronRight className="size-5" aria-hidden />
        </BotonIcono>
        <BotonIcono etiqueta="Dejar de resaltar" onClick={onQuitar} className="size-9">
          <X className="size-5" aria-hidden />
        </BotonIcono>
      </div>
    </div>
  )
}
