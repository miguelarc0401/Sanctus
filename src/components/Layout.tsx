import { BookOpen, CalendarDays, Ellipsis, House, Vote } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

const secciones = [
  { a: '/', texto: 'Inicio', Icono: House },
  { a: '/calendario', texto: 'Calendario', Icono: CalendarDays },
  { a: '/biblioteca', texto: 'Biblioteca', Icono: BookOpen },
  { a: '/temas', texto: 'Temas', Icono: Vote },
  { a: '/mas', texto: 'Más', Icono: Ellipsis },
]

export function Layout() {
  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 bg-cielo-800 pt-[env(safe-area-inset-top)] text-white shadow">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <img src="/logo.svg" alt="" className="size-8 rounded-lg ring-1 ring-white/20" />
          <span className="font-serif text-2xl font-semibold tracking-wide">Santa María</span>
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
