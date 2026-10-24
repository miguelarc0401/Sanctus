import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { nombreDeGrupo, useGrupos } from '../grupos/contexto'
import type { Grupo } from '../lib/tipos'
import { Hoja } from './Hoja'

// Iniciales del santo para su medallón: «San Juan Bosco» → «JB».
function iniciales(grupo: Grupo) {
  const palabras = grupo.santo.nombre.split(' ').filter((p) => !/^(san|santa|santo|beato|beata|de|del|la|el)$/i.test(p))
  return (palabras.length ? palabras : [grupo.santo.nombre])
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function Medallon({ grupo }: { grupo: Grupo }) {
  return (
    <span
      aria-hidden
      className="manto grid size-11 shrink-0 place-items-center rounded-full font-serif text-xl font-semibold text-oro-400 ring-2 ring-oro-400/50"
    >
      {iniciales(grupo)}
    </span>
  )
}

// Botón con el grupo actual; si hay varios, abre una hoja para cambiarlo.
// «claro» es para fondos claros (el panel); por defecto va sobre el manto azul.
export function BotonGrupo({ claro = false, className = '' }: { claro?: boolean; className?: string }) {
  const { grupos, grupo, elegirGrupo } = useGrupos()
  const [abierta, setAbierta] = useState(false)
  if (!grupo) return null

  const color = claro ? 'text-cielo-800' : 'text-cielo-100'
  if (grupos.length === 1) return <p className={`truncate text-sm ${color} ${className}`}>{nombreDeGrupo(grupo)}</p>

  return (
    <>
      <button
        onClick={() => setAbierta(true)}
        aria-haspopup="dialog"
        className={`group -mx-2 flex max-w-full min-w-0 items-center gap-1 rounded-lg px-2 py-1 text-left text-sm ${
          claro ? 'font-medium text-cielo-800 hover:bg-cielo-100' : 'text-cielo-100 hover:bg-white/10'
        } ${className}`}
      >
        <span className="sr-only">Grupo: </span>
        <span className="truncate">{nombreDeGrupo(grupo)}</span>
        <ChevronDown className="size-4 shrink-0 opacity-80" aria-hidden />
        <span className="sr-only">, cambiar de grupo</span>
      </button>
      {abierta && (
        <Hoja titulo="Elige tu grupo" onCerrar={() => setAbierta(false)}>
          <ul className="space-y-2">
            {grupos.map((g) => {
              const actual = g.id === grupo.id
              return (
                <li key={g.id}>
                  <button
                    onClick={() => {
                      elegirGrupo(g.id)
                      setAbierta(false)
                    }}
                    aria-current={actual ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition ${
                      actual ? 'bg-white ring-2 ring-cielo-600' : 'bg-white ring-stone-200 hover:bg-cielo-50'
                    }`}
                  >
                    <Medallon grupo={g} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-xl leading-tight font-semibold text-cielo-800">{g.santo.nombre}</span>
                      <span className="block truncate text-sm text-stone-600">{g.nombre}</span>
                    </span>
                    {actual && <Check className="size-5 shrink-0 text-cielo-700" aria-label="Elegido" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </Hoja>
      )}
    </>
  )
}
