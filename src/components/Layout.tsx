import { BookOpen, CalendarDays, ChevronDown, Ellipsis, House, Vote } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { nombreDeGrupo, useGrupos } from '../grupos/contexto'

const secciones = [
  { a: '/', texto: 'Inicio', Icono: House },
  { a: '/calendario', texto: 'Calendario', Icono: CalendarDays },
  { a: '/biblioteca', texto: 'Biblioteca', Icono: BookOpen },
  { a: '/temas', texto: 'Temas', Icono: Vote },
  { a: '/mas', texto: 'Más', Icono: Ellipsis },
]

function SelectorDeGrupo() {
  const { grupos, grupo, elegirGrupo } = useGrupos()
  if (!grupo) return null
  if (grupos.length === 1) return <p className="truncate text-sm text-cielo-100">{nombreDeGrupo(grupo)}</p>

  return (
    <label className="relative flex items-center text-sm text-cielo-100">
      <span className="sr-only">Grupo</span>
      <select
        value={grupo.id}
        onChange={(e) => elegirGrupo(Number(e.target.value))}
        className="w-full cursor-pointer appearance-none truncate bg-transparent pr-6 outline-none"
      >
        {grupos.map((g) => (
          <option key={g.id} value={g.id} className="text-stone-900">
            {nombreDeGrupo(g)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 size-4" aria-hidden />
    </label>
  )
}

export function Layout() {
  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 bg-cielo-800 pt-[env(safe-area-inset-top)] text-white shadow">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <img src="/logo.svg" alt="" className="size-9 shrink-0 rounded-lg ring-1 ring-white/20" />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-2xl leading-tight font-semibold tracking-wide">Santa María</p>
            <SelectorDeGrupo />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {secciones.map(({ a, texto, Icono }) => (
            <li key={a}>
              <NavLink
                to={a}
                end={a === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-xs transition ${
                    isActive ? 'font-semibold text-cielo-800' : 'text-stone-500 hover:text-cielo-700'
                  }`
                }
              >
                <Icono className="size-6" aria-hidden />
                {texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
