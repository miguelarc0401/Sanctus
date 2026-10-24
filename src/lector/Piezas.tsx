import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

// Botón redondo con ícono; la etiqueta se lee en voz alta y aparece al pasar el mouse.
export function BotonIcono({
  etiqueta,
  onClick,
  activo = false,
  disabled,
  children,
  className = '',
}: {
  etiqueta: string
  onClick: () => void
  activo?: boolean
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      aria-pressed={activo || undefined}
      title={etiqueta}
      className={`relative grid size-11 shrink-0 place-items-center rounded-full text-(--lector-tinta) transition hover:bg-(--lector-suave) focus-visible:ring-2 focus-visible:ring-(--lector-acento) focus-visible:outline-none active:scale-95 disabled:opacity-30 ${activo ? 'text-(--lector-acento)' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

// Ventana del lector, con sus colores. «cajon»: alta (a la derecha en pantallas grandes);
// «tarjeta»: pequeña (arriba a la derecha en pantallas grandes). En el teléfono ambas suben desde abajo.
export function Panel({
  titulo,
  variante,
  onCerrar,
  children,
}: {
  titulo: string
  variante: 'cajon' | 'tarjeta'
  onCerrar: () => void
  children: ReactNode
}) {
  const ventana = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alPresionar)
    // Lleva el foco a la ventana para que el teclado y el lector de pantalla empiecen ahí.
    if (!ventana.current?.contains(document.activeElement)) ventana.current?.focus()
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  const estilo =
    variante === 'cajon'
      ? 'h-[88dvh] sm:inset-y-0 sm:right-0 sm:left-auto sm:h-auto sm:w-[25rem] sm:rounded-none sm:animate-[entrar-derecha_.25s_ease-out]'
      : 'max-h-[88dvh] sm:top-[calc(3.75rem+env(safe-area-inset-top))] sm:right-3 sm:bottom-auto sm:left-auto sm:w-80 sm:rounded-2xl sm:animate-[aparecer_.15s_ease-out]'

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="Cerrar" tabIndex={-1} onClick={onCerrar} className="absolute inset-0 size-full bg-black/30 sm:bg-black/15" />
      <div
        ref={ventana}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={`absolute inset-x-0 bottom-0 flex animate-[subir_.25s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-(--lector-hoja) text-(--lector-tinta) shadow-2xl outline-none ${estilo}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-(--lector-borde) py-2 pr-2 pl-5 sm:pt-[max(0.5rem,env(safe-area-inset-top))]">
          <h2 className="font-serif text-2xl font-semibold">{titulo}</h2>
          <BotonIcono etiqueta="Cerrar" onClick={onCerrar}>
            <X className="size-5" aria-hidden />
          </BotonIcono>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

// Pestañas dentro de un panel.
export function Pestanas<T extends string>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { valor: T; texto: string }[]
  valor: T
  onCambiar: (v: T) => void
}) {
  return (
    <div role="tablist" className="grid gap-1 rounded-xl bg-(--lector-suave) p-1 text-sm font-medium" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          role="tab"
          aria-selected={valor === opcion.valor}
          onClick={() => onCambiar(opcion.valor)}
          className={`rounded-lg py-2 transition ${valor === opcion.valor ? 'bg-(--lector-hoja) text-(--lector-acento) shadow-sm' : 'text-(--lector-tenue)'}`}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  )
}

export type Aviso = { texto: string; deshacer?: () => void }

// Mensaje breve sobre la barra de abajo, con «Deshacer» cuando se puede.
export function MensajeAviso({ aviso, onCerrar }: { aviso: Aviso; onCerrar: () => void }) {
  useEffect(() => {
    const espera = window.setTimeout(onCerrar, aviso.deshacer ? 5000 : 2500)
    return () => window.clearTimeout(espera)
  }, [aviso, onCerrar])
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm animate-[aparecer_.2s_ease-out] items-center gap-3 rounded-2xl bg-stone-900/95 py-2 pr-2 pl-4 text-sm text-white shadow-xl"
    >
      <p className="flex-1 py-1.5">{aviso.texto}</p>
      {aviso.deshacer && (
        <button
          onClick={() => {
            aviso.deshacer!()
            onCerrar()
          }}
          className="rounded-xl px-3 py-1.5 font-semibold text-oro-400 hover:bg-white/10"
        >
          Deshacer
        </button>
      )}
    </div>
  )
}
