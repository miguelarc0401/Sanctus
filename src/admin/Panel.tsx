import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Church,
  Megaphone,
  Sparkles,
  Users,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Titulo } from '../components/Bloques'

const secciones: { a: string; titulo: string; descripcion: string; Icono: LucideIcon }[] = [
  { a: '/admin/grupos', titulo: 'Grupos', descripcion: 'Crea grupos y asígnales su santo.', Icono: Church },
  { a: '/admin/miembros', titulo: 'Miembros', descripcion: 'Da de alta cuentas y asígnalas a grupos.', Icono: Users },
  { a: '/admin/avisos', titulo: 'Avisos', descripcion: 'Publica avisos para un grupo o para todos.', Icono: Megaphone },
  { a: '/admin/eventos', titulo: 'Calendario', descripcion: 'Actividades, misas, horas santas y más.', Icono: CalendarDays },
  { a: '/admin/virtudes', titulo: 'Virtud de la semana', descripcion: 'Programa la virtud de cada semana.', Icono: Sparkles },
  { a: '/admin/santos', titulo: 'Santos', descripcion: 'La lista de santos para los grupos.', Icono: Church },
]

const proximamente = [
  { titulo: 'Biblioteca', Icono: BookOpen },
  { titulo: 'Encuestas de temas', Icono: Vote },
  { titulo: 'Temario de charlas', Icono: ClipboardList },
  { titulo: 'Preguntas', Icono: CircleHelp },
]

export function Panel() {
  return (
    <div className="space-y-6">
      <Titulo>Panel</Titulo>

      <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
        {secciones.map(({ a, titulo, descripcion, Icono }) => (
          <li key={a}>
            <Link to={a} className="flex items-center gap-4 px-4 py-4 hover:bg-cielo-50">
              <span className="rounded-xl bg-cielo-100 p-2.5 text-cielo-700">
                <Icono className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-medium text-stone-900">{titulo}</span>
                <span className="block text-sm text-stone-500">{descripcion}</span>
              </span>
              <ChevronRight className="size-5 text-stone-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">Próximamente</h2>
        <ul className="grid grid-cols-2 gap-3">
          {proximamente.map(({ titulo, Icono }) => (
            <li key={titulo} className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-3 text-sm text-stone-500">
              <Icono className="size-4 shrink-0" aria-hidden /> {titulo}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
