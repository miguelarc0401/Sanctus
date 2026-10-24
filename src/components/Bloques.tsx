import { ArrowLeft, Plus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { FASES, TIPOS_EVENTO, type FaseEncuesta, type TipoEvento } from '../lib/tipos'
import { useTituloDocumento } from '../lib/useTituloDocumento'

// «destacada» la enmarca en oro (por ejemplo, la próxima charla).
export function Tarjeta({
  children,
  className = '',
  destacada = false,
}: {
  children: ReactNode
  className?: string
  destacada?: boolean
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 shadow-tarjeta ${destacada ? 'ring-2 ring-oro-400' : 'ring-1 ring-stone-200/80'} ${className}`}
    >
      {children}
    </section>
  )
}

// Contenedor blanco para listas de filas (miembros, avisos del panel…).
export function Lista({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-tarjeta ring-1 ring-stone-200/80">
      {children}
    </ul>
  )
}

export function Vacio({ children, Icono }: { children: ReactNode; Icono?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center">
      {Icono && (
        <span className="mb-3 grid size-12 place-items-center rounded-full bg-cielo-50 text-cielo-600 ring-1 ring-cielo-100">
          <Icono className="size-6" aria-hidden />
        </span>
      )}
      <p className="max-w-xs text-pretty text-stone-600">{children}</p>
    </div>
  )
}

// Siluetas grises mientras llegan los datos.
export function Cargando({ filas = 3 }: { filas?: number }) {
  return (
    <div role="status" className="space-y-3 py-1">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: filas }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="h-16 animate-pulse rounded-2xl bg-stone-200/70"
          style={{ animationDelay: `${i * 150}ms`, opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  )
}

export function Titulo({ children }: { children: ReactNode }) {
  return <h1 className="font-serif text-4xl leading-tight font-semibold text-balance text-cielo-800">{children}</h1>
}

export function Volver({ a, children }: { a: string; children: ReactNode }) {
  return (
    <Link
      to={a}
      className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-cielo-700 hover:bg-cielo-50"
    >
      <ArrowLeft className="size-4" aria-hidden /> {children}
    </Link>
  )
}

// Encabezado de cada pantalla: volver (si hace falta), título, una línea que explica y una acción.
export function Encabezado({
  titulo,
  descripcion,
  volver,
  accion,
}: {
  titulo: string
  descripcion?: ReactNode
  volver?: { a: string; texto: string }
  accion?: ReactNode
}) {
  useTituloDocumento(titulo)
  return (
    <header className="space-y-1">
      {volver && <Volver a={volver.a}>{volver.texto}</Volver>}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <Titulo>{titulo}</Titulo>
          {descripcion && <p className="mt-1 text-pretty text-stone-600">{descripcion}</p>}
        </div>
        {accion}
      </div>
    </header>
  )
}

// Encabezado de las pantallas del panel: volver, título y botón de «Nuevo».
export function EncabezadoAdmin({
  titulo,
  descripcion,
  textoNuevo,
  onNuevo,
}: {
  titulo: string
  descripcion?: ReactNode
  textoNuevo?: string
  onNuevo?: () => void
}) {
  return (
    <Encabezado
      titulo={titulo}
      descripcion={descripcion}
      volver={{ a: '/admin', texto: 'Panel' }}
      accion={
        onNuevo && (
          <button
            onClick={onNuevo}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-cielo-800 px-4 text-sm font-medium text-white shadow-sm shadow-cielo-900/20 transition hover:bg-cielo-700 active:scale-[0.98]"
          >
            <Plus className="size-4" aria-hidden /> {textoNuevo ?? 'Nuevo'}
          </button>
        )
      }
    />
  )
}

// Título pequeño de una sección dentro de una pantalla, con un enlace opcional a la derecha.
export function TituloSeccion({ children, Icono, extra }: { children: ReactNode; Icono?: LucideIcon; extra?: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 px-1">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-stone-600 uppercase">
        {Icono && <Icono className="size-4 text-oro-600" aria-hidden />}
        {children}
      </h2>
      {extra}
    </div>
  )
}

export function EtiquetaTipo({ tipo }: { tipo: TipoEvento }) {
  const { nombre, estilo, Icono } = TIPOS_EVENTO[tipo]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${estilo}`}>
      <Icono className="size-3.5" aria-hidden /> {nombre}
    </span>
  )
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
      <span className="sr-only"> {cuenta === 1 ? 'pendiente' : 'pendientes'}</span>
    </span>
  )
}

// Botones para elegir entre dos o tres vistas («Próximos / Anteriores»).
export function Segmentos<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
}: {
  opciones: { valor: T; texto: string }[]
  valor: T
  onCambiar: (v: T) => void
  etiqueta?: string
}) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="grid rounded-2xl bg-crema-200 p-1 text-sm font-medium ring-1 ring-stone-200/70"
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          onClick={() => onCambiar(opcion.valor)}
          aria-pressed={valor === opcion.valor}
          className={`min-h-10 rounded-xl px-2 transition ${
            valor === opcion.valor ? 'bg-white text-cielo-800 shadow-sm ring-1 ring-stone-200/80' : 'text-stone-600 hover:text-cielo-800'
          }`}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  )
}

// Filtro redondo («Todos», «Misa»…), con ícono opcional.
export function Chip({
  activo,
  onClick,
  Icono,
  children,
}: {
  activo: boolean
  onClick: () => void
  Icono?: LucideIcon
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition ${
        activo ? 'bg-cielo-800 text-white shadow-sm' : 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-cielo-50'
      }`}
    >
      {Icono && <Icono className="size-4" aria-hidden />}
      {children}
    </button>
  )
}
