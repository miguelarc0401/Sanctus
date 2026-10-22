import { CalendarDays, ChevronRight, Megaphone } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/contexto'
import { AvisoInstalar } from '../components/AvisoInstalar'
import { Tarjeta, Titulo } from '../components/Bloques'
import { FilaEvento, TarjetaAviso, TarjetaVirtud } from '../components/Contenido'
import { useGrupos } from '../grupos/contexto'
import { useAvisos, useProximosEventos, useVirtudDeLaSemana } from '../lib/contenido'

function VerTodo({ a }: { a: string }) {
  return (
    <Link to={a} className="flex items-center text-sm font-medium text-cielo-700">
      Ver todo <ChevronRight className="size-4" aria-hidden />
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

  return (
    <div className="space-y-6">
      <Titulo>Hola, {primerNombre}</Titulo>

      {!cargando && grupos.length === 0 && (
        <Tarjeta className="bg-oro-400/10 ring-oro-400/40">
          {perfil?.es_admin ? (
            <p>
              Todavía no hay grupos.{' '}
              <Link to="/admin/grupos" className="font-medium text-cielo-700 underline">
                Crea el primero en el panel
              </Link>
              .
            </p>
          ) : (
            <p>Todavía no perteneces a ningún grupo. Habla con tu coordinador.</p>
          )}
        </Tarjeta>
      )}

      <AvisoInstalar />

      <TarjetaVirtud virtud={virtud} />

      <Tarjeta>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium text-cielo-800">
            <CalendarDays className="size-5" aria-hidden /> Próximos eventos
          </h2>
          {eventos.length > 0 && <VerTodo a="/calendario" />}
        </div>
        {eventos.length > 0 ? (
          <ul className="divide-y divide-stone-100">
            {eventos.map((evento) => (
              <FilaEvento key={evento.id} evento={evento} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-stone-500">No hay eventos próximos.</p>
        )}
      </Tarjeta>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="flex items-center gap-2 font-medium text-cielo-800">
            <Megaphone className="size-5" aria-hidden /> Últimos avisos
          </h2>
          {avisos.length > 0 && <VerTodo a="/avisos" />}
        </div>
        {avisos.length > 0 ? (
          avisos.map((aviso) => <TarjetaAviso key={aviso.id} aviso={aviso} />)
        ) : (
          <Tarjeta>
            <p className="text-sm text-stone-500">Todavía no hay avisos.</p>
          </Tarjeta>
        )}
      </section>
    </div>
  )
}
