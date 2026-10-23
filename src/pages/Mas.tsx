import { ChevronRight, CircleHelp, KeyRound, LogOut, Megaphone, Shield, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Insignia } from '../components/Bloques'
import { usePreguntasSinResponder, useRespuestasNuevas, useSolicitudesPendientes } from '../lib/pendientes'

function Opcion({ a, texto, Icono, insignia }: { a: string; texto: string; Icono: LucideIcon; insignia?: number }) {
  return (
    <li>
      <Link to={a} className="flex items-center gap-3 px-4 py-3.5 hover:bg-cielo-50">
        <Icono className="size-5 text-cielo-700" aria-hidden />
        <span className="flex-1">{texto}</span>
        <Insignia cuenta={insignia} />
        <ChevronRight className="size-5 text-stone-400" aria-hidden />
      </Link>
    </li>
  )
}

export function Mas() {
  const { sesion, perfil, cerrarSesion } = useAuth()
  const { data: respuestas } = useRespuestasNuevas()
  const { data: solicitudes = 0 } = useSolicitudesPendientes()
  const { data: preguntas = 0 } = usePreguntasSinResponder()

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl font-semibold text-cielo-800">Más</h1>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <p className="text-lg font-medium">{perfil?.nombre}</p>
        <p className="text-sm text-stone-500">{perfil?.acceso ?? sesion?.user.email}</p>
      </section>

      <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
        {perfil?.es_admin && (
          <Opcion a="/admin" texto="Panel de administración" Icono={Shield} insignia={solicitudes + preguntas} />
        )}
        <Opcion a="/avisos" texto="Avisos" Icono={Megaphone} />
        <Opcion a="/preguntas" texto="Pregúntale al coordinador" Icono={CircleHelp} insignia={respuestas} />
        <Opcion a="/cambiar-contrasena" texto="Cambiar contraseña" Icono={KeyRound} />
      </ul>

      <button
        onClick={() => void cerrarSesion()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 font-medium text-red-700 shadow-sm ring-1 ring-stone-200 hover:bg-red-50"
      >
        <LogOut className="size-5" aria-hidden /> Cerrar sesión
      </button>
    </div>
  )
}
