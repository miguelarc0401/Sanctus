import { ArrowLeft, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { FASES, TIPOS_EVENTO, type FaseEncuesta, type TipoEvento } from '../lib/tipos'

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 ${className}`}>{children}</section>
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-stone-300 px-5 py-8 text-center text-stone-500">{children}</p>
}

export function Cargando() {
  return <p className="animate-pulse py-8 text-center text-stone-500">Cargando…</p>
}

export function Titulo({ children }: { children: ReactNode }) {
  return <h1 className="font-serif text-4xl font-semibold text-cielo-800">{children}</h1>
}

// Encabezado de las pantallas del panel: volver, título y botón de «Nuevo».
export function EncabezadoAdmin({
  titulo,
  textoNuevo,
  onNuevo,
}: {
  titulo: string
  textoNuevo?: string
  onNuevo?: () => void
}) {
  return (
    <div className="space-y-3">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-cielo-700">
        <ArrowLeft className="size-4" aria-hidden /> Panel
      </Link>
      <div className="flex items-center justify-between gap-3">
        <Titulo>{titulo}</Titulo>
        {onNuevo && (
          <button
            onClick={onNuevo}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cielo-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-cielo-700"
          >
            <Plus className="size-4" aria-hidden /> {textoNuevo ?? 'Nuevo'}
          </button>
        )}
      </div>
    </div>
  )
}

export function EtiquetaTipo({ tipo }: { tipo: TipoEvento }) {
  const { nombre, estilo } = TIPOS_EVENTO[tipo]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estilo}`}>{nombre}</span>
}

export function EtiquetaFase({ fase }: { fase: FaseEncuesta }) {
  const { nombre, estilo } = FASES[fase]
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${estilo}`}>{nombre}</span>
}

// Numerito de pendientes junto a una opción del menú.
export function Insignia({ cuenta }: { cuenta?: number }) {
  if (!cuenta) return null
  return (
    <span className="min-w-6 rounded-full bg-oro-500 px-2 py-0.5 text-center text-xs font-semibold text-white">
      {cuenta}
    </span>
  )
}

// Botones para elegir entre dos o tres vistas («Próximos / Anteriores»).
export function Segmentos<T extends string>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { valor: T; texto: string }[]
  valor: T
  onCambiar: (v: T) => void
}) {
  return (
    <div
      className="grid rounded-xl bg-stone-200/70 p-1 text-sm font-medium"
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          onClick={() => onCambiar(opcion.valor)}
          className={`rounded-lg py-2 transition ${valor === opcion.valor ? 'bg-white text-cielo-800 shadow-sm' : 'text-stone-600'}`}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  )
}
