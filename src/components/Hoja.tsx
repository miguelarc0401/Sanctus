import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

// Ventana para formularios: sube desde abajo en el teléfono y aparece centrada en pantallas grandes.
// Es un <dialog> nativo: atrapa el foco del teclado, se cierra con Esc y al terminar devuelve el foco.
export function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  // Sólo se cierra al tocar el fondo si el toque también empezó ahí (no al soltar una selección de texto).
  const tocoFondo = useRef(false)
  const idTitulo = useId()

  useEffect(() => {
    const elemento = dialogo.current!
    const anterior = document.activeElement as HTMLElement | null
    if (!elemento.open) elemento.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      if (elemento.open) elemento.close()
      anterior?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      onPointerDown={(e) => {
        tocoFondo.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (tocoFondo.current && e.target === e.currentTarget) onCerrar()
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none animate-subir overflow-hidden rounded-t-3xl bg-crema text-stone-800 shadow-2xl backdrop:bg-cielo-950/45 sm:m-auto sm:max-w-lg sm:animate-aparecer sm:rounded-3xl"
    >
      <div className="max-h-[92dvh] overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 -mx-5 mb-4 flex items-center justify-between gap-4 bg-crema/95 px-5 pt-5 pb-2 backdrop-blur">
          <h2 id={idTitulo} className="font-serif text-3xl leading-tight font-semibold text-cielo-800">
            {titulo}
          </h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid size-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-200/70 hover:text-stone-800"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
