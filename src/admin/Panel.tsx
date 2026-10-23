import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Church,
  CircleHelp,
  ClipboardList,
  Megaphone,
  Sparkles,
  Users,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Insignia, Titulo } from '../components/Bloques'
import { usePreguntasSinResponder, useSolicitudesPendientes } from '../lib/pendientes'

type Seccion = { a: string; titulo: string; descripcion: string; Icono: LucideIcon; insignia?: number }

export function Panel() {
  const { data: solicitudes } = useSolicitudesPendientes()
  const { data: preguntas } = usePreguntasSinResponder()

  const secciones: Seccion[] = [
    { a: '/admin/miembros', titulo: 'Miembros', descripcion: 'Aprueba solicitudes y administra cuentas.', Icono: Users, insignia: solicitudes },
    { a: '/admin/preguntas', titulo: 'Preguntas', descripcion: 'Responde lo que te preguntan en privado.', Icono: CircleHelp, insignia: preguntas },
    { a: '/admin/avisos', titulo: 'Avisos', descripcion: 'Publica avisos para un grupo o para todos.', Icono: Megaphone },
    { a: '/admin/eventos', titulo: 'Calendario', descripcion: 'Actividades, misas, horas santas y más.', Icono: CalendarDays },
    { a: '/admin/virtudes', titulo: 'Virtud de la semana', descripcion: 'Programa la virtud de cada semana.', Icono: Sparkles },
    { a: '/admin/libros', titulo: 'Biblioteca', descripcion: 'Sube libros y compártelos con los grupos.', Icono: BookOpen },
    { a: '/admin/encuestas', titulo: 'Encuestas de temas', descripcion: 'Propuestas, votación y resultados.', Icono: Vote },
    { a: '/admin/temario', titulo: 'Temario de charlas', descripcion: 'El plan de charlas de cada grupo.', Icono: ClipboardList },
    { a: '/admin/grupos', titulo: 'Grupos', descripcion: 'Crea grupos y asígnales su santo.', Icono: Church },
    { a: '/admin/santos', titulo: 'Santos', descripcion: 'La lista de santos para los grupos.', Icono: Church },
  ]

  return (
    <div className="space-y-6">
      <Titulo>Panel</Titulo>

      <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
        {secciones.map(({ a, titulo, descripcion, Icono, insignia }) => (
          <li key={a}>
            <Link to={a} className="flex items-center gap-4 px-4 py-4 hover:bg-cielo-50">
              <span className="rounded-xl bg-cielo-100 p-2.5 text-cielo-700">
                <Icono className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-medium text-stone-900">{titulo}</span>
                <span className="block text-sm text-stone-500">{descripcion}</span>
              </span>
              <Insignia cuenta={insignia} />
              <ChevronRight className="size-5 text-stone-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
