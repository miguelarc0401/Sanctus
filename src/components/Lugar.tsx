import { MapPin, Navigation } from 'lucide-react'
import { TextoConEnlaces } from './TextoConEnlaces'

// El lugar de un evento o una charla y, si el coordinador puso el enlace, un botón para abrirlo en el mapa.
export function Lugar({ lugar, mapa }: { lugar: string | null; mapa: string | null }) {
  if (!lugar && !mapa) return null
  return (
    <div className="space-y-1.5">
      {lugar && (
        <div className="flex items-start gap-1.5 text-sm text-stone-600">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          <TextoConEnlaces className="min-w-0">{lugar}</TextoConEnlaces>
        </div>
      )}
      {mapa && (
        <a
          href={mapa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-cielo-50 px-3.5 text-sm font-medium text-cielo-800 ring-1 ring-cielo-100 transition hover:bg-cielo-100"
        >
          <Navigation className="size-4" aria-hidden /> Ver en el mapa
          {lugar && <span className="sr-only">: {lugar}</span>}
        </a>
      )}
    </div>
  )
}
