import { BookOpen, CalendarDays, Ellipsis, House, Shield, Vote, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/contexto'
import { useGrupos } from '../grupos/contexto'
import { useEncuestas } from '../lib/participacion'
import { usePreguntasSinResponder, useRespuestasNuevas, useSolicitudesPendientes } from '../lib/pendientes'
import { Insignia } from './Bloques'
import { BotonGrupo } from './ElegirGrupo'

type Seccion = { a: string; texto: string; Icono: LucideIcon; aviso?: string }

// Puntito en el menú cuando hay algo por hacer: una votación abierta o algo pendiente en «Más».
function useSecciones(): { secciones: Seccion[]; pendientesAdmin: number } {
  const { perfil } = useAuth()
  const { grupo } = useGrupos()
  const { data: encuestas = [] } = useEncuestas(grupo?.id ?? null)
  const { data: respuestas = 0 } = useRespuestasNuevas()
  const { data: solicitudes = 0 } = useSolicitudesPendientes()
  const { data: preguntas = 0 } = usePreguntasSinResponder()
  const abierta = encuestas.find((e) => e.fase !== 'cerrada')
  const pendientesAdmin = perfil?.es_admin ? solicitudes + preguntas : 0
  const enMas = respuestas + pendientesAdmin

  return {
    pendientesAdmin,
    secciones: [
      { a: '/', texto: 'Inicio', Icono: House },
      { a: '/calendario', texto: 'Calendario', Icono: CalendarDays },
      { a: '/biblioteca', texto: 'Biblioteca', Icono: BookOpen },
      {
        a: '/temas',
        texto: 'Temas',
        Icono: Vote,
        aviso: abierta ? (abierta.fase === 'votacion' ? 'hay una votación abierta' : 'puedes proponer temas') : undefined,
      },
      { a: '/mas', texto: 'Más', Icono: Ellipsis, aviso: enMas ? `${enMas} ${enMas === 1 ? 'pendiente' : 'pendientes'}` : undefined },
    ],
  }
}

function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <img
        src="/logo.svg"
        alt=""
        className={`shrink-0 rounded-xl shadow-md ring-1 ring-white/25 ${grande ? 'size-12' : 'size-9'}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`font-serif leading-tight font-semibold tracking-wide ${grande ? 'text-3xl' : 'text-2xl'}`}>Santa María</p>
        <div className="min-h-7">
          <BotonGrupo />
        </div>
      </div>
    </div>
  )
}

function SaltarAlContenido() {
  return (
    <a
      href="#contenido"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById('contenido')?.focus()
      }}
      className="sr-only z-50 rounded-xl bg-white px-4 py-3 font-medium text-cielo-800 shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Saltar al contenido
    </a>
  )
}

export function Layout() {
  const { perfil } = useAuth()
  const { pathname } = useLocation()
  const { secciones, pendientesAdmin } = useSecciones()

  // Al cambiar de sección se empieza desde arriba, como en una app.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh lg:pl-72">
      <SaltarAlContenido />

      {/* Teléfono: encabezado arriba y menú abajo. */}
      <header className="manto sticky top-0 z-20 pt-[env(safe-area-inset-top)] text-white shadow-md shadow-cielo-950/20 lg:hidden">
        <div className="mx-auto max-w-2xl px-4 py-2.5">
          <Marca />
        </div>
      </header>

      {/* Computadora: menú a la izquierda. */}
      <aside className="manto fixed inset-y-0 left-0 z-20 hidden w-72 flex-col px-5 py-7 text-white lg:flex">
        <Marca grande />
        <nav aria-label="Secciones" className="mt-10 flex-1">
          <ul className="space-y-1">
            {secciones.map(({ a, texto, Icono, aviso }) => (
              <li key={a}>
                <NavLink
                  to={a}
                  end={a === '/'}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium transition ${
                      isActive ? 'bg-white text-cielo-800 shadow-md' : 'text-cielo-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icono className="size-5" aria-hidden />
                  <span className="flex-1">{texto}</span>
                  {aviso && (
                    <>
                      <span aria-hidden className="size-2.5 rounded-full bg-oro-400 ring-2 ring-cielo-800" />
                      <span className="sr-only">, {aviso}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          {perfil?.es_admin && (
            <>
              <p className="mt-8 px-3 text-xs font-semibold tracking-[0.2em] text-oro-400 uppercase">Coordinación</p>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `mt-2 flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium transition ${
                    isActive ? 'bg-white text-cielo-800 shadow-md' : 'text-cielo-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Shield className="size-5" aria-hidden />
                <span className="flex-1">Panel</span>
                <Insignia cuenta={pendientesAdmin} />
              </NavLink>
            </>
          )}
        </nav>
        <p className="font-serif text-lg text-cielo-200 italic">Santa María, ruega por nosotros.</p>
      </aside>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-2xl px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] outline-none lg:max-w-3xl lg:px-10 lg:pt-12 lg:pb-16"
      >
        <Outlet />
      </main>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-12px_rgb(23_42_82/0.25)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5 px-1">
          {secciones.map(({ a, texto, Icono, aviso }) => (
            <li key={a}>
              <NavLink
                to={a}
                end={a === '/'}
                className={({ isActive }) =>
                  `group flex min-h-16 flex-col items-center justify-center gap-0.5 text-[min(0.75rem,13px)] leading-tight transition ${
                    isActive ? 'font-semibold text-cielo-800' : 'text-stone-600 hover:text-cielo-700'
                  }`
                }
              >
                <span className="relative grid h-8 w-14 place-items-center rounded-full transition group-aria-[current=page]:bg-cielo-100">
                  <Icono className="size-6" aria-hidden />
                  {aviso && (
                    <span aria-hidden className="absolute top-0.5 right-3 size-2.5 rounded-full bg-oro-500 ring-2 ring-white" />
                  )}
                </span>
                {texto}
                {aviso && <span className="sr-only">, {aviso}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
