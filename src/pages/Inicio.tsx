import {
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Megaphone,
  MessageCircleReply,
  Shield,
  UserPlus,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/contexto'
import { AvisoInstalar } from '../components/AvisoInstalar'
import { Tarjeta, TituloSeccion } from '../components/Bloques'
import { FilaEvento, TarjetaAviso, TarjetaVirtud } from '../components/Contenido'
import { InvitacionNotificaciones } from '../components/Notificaciones'
import { useGrupos } from '../grupos/contexto'
import { useAvisos, useProximosEventos, useVirtudDeLaSemana } from '../lib/contenido'
import { hoyLargo, saludo } from '../lib/fechas'
import { useEncuestas } from '../lib/participacion'
import { usePreguntasSinResponder, useRespuestasNuevas, useSolicitudesPendientes } from '../lib/pendientes'
import { useTituloDocumento } from '../lib/useTituloDocumento'

// Algo que requiere atención: una respuesta nueva, una votación abierta, solicitudes por revisar…
function Recordatorio({ a, Icono, children }: { a: string; Icono: LucideIcon; children: ReactNode }) {
  return (
    <li>
      <Link
        to={a}
        className="flex min-h-14 items-center gap-3 rounded-2xl bg-oro-50 px-3 py-2.5 text-stone-800 ring-1 ring-oro-400/50 transition hover:bg-oro-400/20"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-oro-400/25 text-oro-700">
          <Icono className="size-5" aria-hidden />
        </span>
        <span className="flex-1 text-pretty">{children}</span>
        <ChevronRight className="size-5 shrink-0 text-oro-600" aria-hidden />
      </Link>
    </li>
  )
}

function Recordatorios({ grupoId }: { grupoId: number | null }) {
  const { perfil } = useAuth()
  const { data: respuestas = 0 } = useRespuestasNuevas()
  const { data: encuestas = [] } = useEncuestas(grupoId)
  const { data: solicitudes = 0 } = useSolicitudesPendientes()
  const { data: preguntas = 0 } = usePreguntasSinResponder()
  const abierta = encuestas.find((e) => e.fase !== 'cerrada')
  const plural = (n: number, una: string, varias: string) => (n === 1 ? una : `${n} ${varias}`)
  const hayAlgo = (perfil?.es_admin && (solicitudes > 0 || preguntas > 0)) || respuestas > 0 || !!abierta
  if (!hayAlgo) return null

  return (
    <ul aria-label="Pendientes" className="space-y-2">
      {/* Para quien coordina: si hay solicitudes y preguntas a la vez, van juntas en un solo renglón al panel. */}
      {perfil?.es_admin && solicitudes > 0 && preguntas > 0 ? (
        <Recordatorio a="/admin" Icono={Shield}>
          Por atender: {plural(solicitudes, 'una solicitud de cuenta', 'solicitudes de cuenta')} y{' '}
          {plural(preguntas, 'una pregunta', 'preguntas')}
        </Recordatorio>
      ) : perfil?.es_admin && solicitudes > 0 ? (
        <Recordatorio a="/admin/miembros" Icono={UserPlus}>
          {plural(solicitudes, 'Una solicitud de cuenta', 'solicitudes de cuenta')} por revisar
        </Recordatorio>
      ) : perfil?.es_admin && preguntas > 0 ? (
        <Recordatorio a="/admin/preguntas" Icono={CircleHelp}>
          {plural(preguntas, 'Una pregunta', 'preguntas')} por responder
        </Recordatorio>
      ) : null}
      {respuestas > 0 && (
        <Recordatorio a="/preguntas" Icono={MessageCircleReply}>
          {plural(respuestas, 'El coordinador respondió tu pregunta', 'respuestas nuevas del coordinador')}
        </Recordatorio>
      )}
      {abierta && (
        <Recordatorio a="/temas" Icono={Vote}>
          {abierta.fase === 'propuestas' ? (
            <>
              Propón temas para las charlas: <strong className="font-semibold">«{abierta.titulo}»</strong>
            </>
          ) : (
            <>
              ¡Vota por el tema de la próxima charla! <strong className="font-semibold">«{abierta.titulo}»</strong>
            </>
          )}
        </Recordatorio>
      )}
    </ul>
  )
}

function VerTodo({ a, texto }: { a: string; texto: string }) {
  return (
    <Link to={a} className="-mr-2 inline-flex min-h-10 items-center rounded-full px-2 text-sm font-medium text-cielo-700 hover:bg-cielo-50">
      Ver todo <span className="sr-only">{texto}</span>
      <ChevronRight className="size-4" aria-hidden />
    </Link>
  )
}

export function Inicio() {
  const { perfil } = useAuth()
  const { grupo, grupos, cargando } = useGrupos()
  const grupoId = grupo?.id ?? null
  const { data: virtud = null } = useVirtudDeLaSemana(grupoId)
  const { data: eventos = [] } = useProximosEventos(grupoId, 3)
  const { data: avisos = [] } = useAvisos(grupoId, 3)
  const primerNombre = perfil?.nombre.split(' ')[0]
  useTituloDocumento(null)

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold tracking-wider text-oro-700 uppercase">{hoyLargo()}</p>
        <h1 className="mt-1 font-serif text-4xl leading-tight font-semibold text-balance text-cielo-800">
          {saludo()}, {primerNombre}
        </h1>
      </header>

      {!cargando && grupos.length === 0 && (
        <p className="rounded-2xl bg-oro-50 p-5 text-stone-800 ring-1 ring-oro-400/50">
          {perfil?.es_admin ? (
            <>
              Todavía no hay grupos.{' '}
              <Link to="/admin/grupos" className="font-medium text-cielo-700 underline">
                Crea el primero en el panel
              </Link>
              .
            </>
          ) : (
            'Todavía no perteneces a ningún grupo. Habla con tu coordinador.'
          )}
        </p>
      )}

      <Recordatorios grupoId={grupoId} />

      <AvisoInstalar />
      <InvitacionNotificaciones />

      <TarjetaVirtud virtud={virtud} />

      <section aria-labelledby="titulo-eventos" className="space-y-2">
        <TituloSeccion Icono={CalendarDays} extra={eventos.length > 0 && <VerTodo a="/calendario" texto="los eventos" />}>
          <span id="titulo-eventos">Próximos eventos</span>
        </TituloSeccion>
        <Tarjeta className="py-1">
          {eventos.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {eventos.map((evento) => (
                <FilaEvento key={evento.id} evento={evento} />
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-stone-600">No hay eventos próximos.</p>
          )}
        </Tarjeta>
      </section>

      <section aria-labelledby="titulo-avisos" className="space-y-2">
        <TituloSeccion Icono={Megaphone} extra={avisos.length > 0 && <VerTodo a="/avisos" texto="los avisos" />}>
          <span id="titulo-avisos">Últimos avisos</span>
        </TituloSeccion>
        {avisos.length > 0 ? (
          <div className="space-y-3">
            {avisos.map((aviso) => (
              <TarjetaAviso key={aviso.id} aviso={aviso} />
            ))}
          </div>
        ) : (
          <Tarjeta>
            <p className="text-sm text-stone-600">Todavía no hay avisos.</p>
          </Tarjeta>
        )}
      </section>
    </div>
  )
}
