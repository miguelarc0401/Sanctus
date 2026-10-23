import { Trophy } from 'lucide-react'
import type { Tema } from '../lib/tipos'

// Barras con los votos de cada tema, de más a menos votado.
export function BarrasDeResultados({
  temas,
  votos,
  ganadorId,
}: {
  temas: Tema[]
  votos: Map<number, number>
  ganadorId: number | null
}) {
  const total = [...votos.values()].reduce((a, b) => a + b, 0)
  const ordenados = [...temas].sort((a, b) => (votos.get(b.id) ?? 0) - (votos.get(a.id) ?? 0))

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">
        {total} {total === 1 ? 'voto' : 'votos'}
      </p>
      <ul className="space-y-3">
        {ordenados.map((tema) => {
          const cuantos = votos.get(tema.id) ?? 0
          const porcentaje = total ? Math.round((cuantos / total) * 100) : 0
          const gano = tema.id === ganadorId
          return (
            <li key={tema.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={`flex items-center gap-1.5 ${gano ? 'font-semibold text-cielo-800' : 'text-stone-800'}`}>
                  {gano && <Trophy className="size-4 shrink-0 text-oro-500" aria-label="Ganador" />}
                  {tema.titulo}
                </span>
                <span className="shrink-0 text-sm text-stone-500">
                  {cuantos} · {porcentaje}%
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full ${gano ? 'bg-oro-500' : 'bg-cielo-500/60'}`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
