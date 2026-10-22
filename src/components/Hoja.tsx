import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

// Ventana para formularios: sube desde abajo en el teléfono y aparece centrada en pantallas grandes.
export function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
    }
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-crema p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-serif text-3xl font-semibold text-cielo-800">{titulo}</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
          >
            <X className="size-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
