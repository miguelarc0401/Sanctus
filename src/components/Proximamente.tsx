import type { LucideIcon } from 'lucide-react'

type Props = { titulo: string; descripcion: string; Icono: LucideIcon }

export function Proximamente({ titulo, descripcion, Icono }: Props) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="rounded-full bg-cielo-100 p-4 text-cielo-700">
        <Icono className="size-8" aria-hidden />
      </div>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-cielo-800">{titulo}</h1>
      <p className="mt-2 max-w-sm text-stone-600">{descripcion}</p>
      <p className="mt-5 rounded-full bg-oro-400/20 px-3 py-1 text-sm font-medium text-oro-600">
        Próximamente
      </p>
    </div>
  )
}
