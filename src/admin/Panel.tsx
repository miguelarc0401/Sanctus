import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Church,
  CircleHelp,
  ClipboardList,
  Crown,
  Megaphone,
  Sparkles,
  UserPlus,
  Users,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Encabezado, Insignia, TituloSeccion } from '../components/Bloques'
import { usePreguntasSinResponder, useSolicitudesPendientes } from '../lib/pendientes'

type Seccion = { a: string; titulo: string; descripcion: string; Icono: LucideIcon; insignia?: number }

// Cada bloque del panel con su color, para encontrar las cosas de un vistazo.
const TONOS = {
  comunidad: 'bg-cielo-100 text-cielo-700',
  comunicar: 'bg-oro-400/20 text-oro-700',
  formacion: 'bg-emerald-100 text-emerald-800',
}

function Mosaico({ seccion, tono }: { seccion: Seccion; tono: string }) {
  const { a, titulo, descripcion, Icono, insignia } = seccion
  return (
    <li>
      <Link
        to={a}
        className="flex h-full min-h-20 items-center gap-4 rounded-2xl bg-white p-4 shadow-tarjeta ring-1 ring-stone-200/80 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-cielo-200"
      >
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tono}`}>
          <Icono className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-stone-900">{titulo}</span>
          <span className="block text-sm text-pretty text-stone-600">{descripcion}</span>
        </span>
        <Insignia cuenta={insignia} />
        <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
      </Link>
    </li>
  )
}

function Bloque({ titulo, tono, secciones }: { titulo: string; tono: string; secciones: Seccion[] }) {
  return (
    <section className="space-y-2">
      <TituloSeccion>{titulo}</TituloSeccion>
      <ul className="grid gap-3 sm:grid-cols-2">
        {secciones.map((seccion) => (
          <Mosaico key={seccion.a} seccion={seccion} tono={tono} />
        ))}
      </ul>
    </section>
  )
}

function PorAtender({ solicitudes, preguntas }: { solicitudes: number; preguntas: number }) {
  if (!solicitudes && !preguntas) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
        <Sparkles className="size-4 shrink-0" aria-hidden /> Todo al día: no hay solicitudes ni preguntas pendientes.
      </p>
    )
  }
  const tarjetas = [
    { a: '/admin/miembros', cuenta: solicitudes, una: 'solicitud de cuenta', varias: 'solicitudes de cuenta', Icono: UserPlus },
    { a: '/admin/preguntas', cuenta: preguntas, una: 'pregunta sin responder', varias: 'preguntas sin responder', Icono: CircleHelp },
  ].filter((t) => t.cuenta > 0)

  return (
    <section aria-label="Por atender" className="grid gap-3 sm:grid-cols-2">
      {tarjetas.map(({ a, cuenta, una, varias, Icono }) => (
        <Link
          key={a}
          to={a}
          className="flex items-center gap-3 rounded-2xl bg-oro-50 p-4 ring-1 ring-oro-400/50 transition hover:bg-oro-400/20"
        >
          <span className="text-3xl leading-none font-bold text-oro-700 tabular-nums">{cuenta}</span>
          <span className="flex-1 text-sm font-medium text-stone-800">{cuenta === 1 ? una : varias}</span>
          <Icono className="size-5 text-oro-600" aria-hidden />
        </Link>
      ))}
    </section>
  )
}

export function Panel() {
  const { data: solicitudes = 0 } = useSolicitudesPendientes()
  const { data: preguntas = 0 } = usePreguntasSinResponder()

  return (
    <div className="space-y-7">
      <Encabezado titulo="Panel" descripcion="Todo lo de la parroquia, en un solo lugar." volver={{ a: '/mas', texto: 'Más' }} />

      <PorAtender solicitudes={solicitudes} preguntas={preguntas} />

      <Bloque
        titulo="Comunidad"
        tono={TONOS.comunidad}
        secciones={[
          { a: '/admin/miembros', titulo: 'Miembros', descripcion: 'Aprueba solicitudes y administra cuentas.', Icono: Users, insignia: solicitudes },
          { a: '/admin/preguntas', titulo: 'Preguntas', descripcion: 'Responde lo que te preguntan en privado.', Icono: CircleHelp, insignia: preguntas },
          { a: '/admin/grupos', titulo: 'Grupos', descripcion: 'Crea grupos y asígnales su santo.', Icono: Church },
          { a: '/admin/santos', titulo: 'Santos', descripcion: 'La lista de santos para los grupos.', Icono: Crown },
        ]}
      />
      <Bloque
        titulo="Comunicar"
        tono={TONOS.comunicar}
        secciones={[
          { a: '/admin/avisos', titulo: 'Avisos', descripcion: 'Publica avisos para un grupo o para todos.', Icono: Megaphone },
          { a: '/admin/eventos', titulo: 'Calendario', descripcion: 'Actividades, misas, horas santas y más.', Icono: CalendarDays },
          { a: '/admin/virtudes', titulo: 'Virtud de la semana', descripcion: 'Programa la virtud de cada semana.', Icono: Sparkles },
        ]}
      />
      <Bloque
        titulo="Formación"
        tono={TONOS.formacion}
        secciones={[
          { a: '/admin/libros', titulo: 'Biblioteca', descripcion: 'Sube libros y compártelos con los grupos.', Icono: BookOpen },
          { a: '/admin/encuestas', titulo: 'Encuestas de temas', descripcion: 'Propuestas, votación y resultados.', Icono: Vote },
          { a: '/admin/temario', titulo: 'Temario de charlas', descripcion: 'El plan de charlas de cada grupo.', Icono: ClipboardList },
        ]}
      />
    </div>
  )
}
