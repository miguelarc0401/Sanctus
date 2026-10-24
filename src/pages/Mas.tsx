import {
  ChevronRight,
  CircleHelp,
  Download,
  KeyRound,
  LogOut,
  Megaphone,
  Share,
  Shield,
  Type,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Insignia, Lista, TituloSeccion } from '../components/Bloques'
import { AjusteNotificaciones } from '../components/Notificaciones'
import { guardarTamanoLetra, leerTamanoLetra, type TamanoLetra } from '../lib/apariencia'
import { esAppInstalada, esIOS, instalar, usePuedeInstalar } from '../lib/instalar'
import { usePreguntasSinResponder, useRespuestasNuevas, useSolicitudesPendientes } from '../lib/pendientes'
import { useTituloDocumento } from '../lib/useTituloDocumento'

function IconoOpcion({ Icono }: { Icono: LucideIcon }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cielo-50 text-cielo-700 ring-1 ring-cielo-100">
      <Icono className="size-5" aria-hidden />
    </span>
  )
}

function Opcion({
  a,
  texto,
  detalle,
  Icono,
  insignia,
}: {
  a: string
  texto: string
  detalle?: string
  Icono: LucideIcon
  insignia?: number
}) {
  return (
    <li>
      <Link to={a} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-cielo-50">
        <IconoOpcion Icono={Icono} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-stone-900">{texto}</span>
          {detalle && <span className="block text-sm text-stone-600">{detalle}</span>}
        </span>
        <Insignia cuenta={insignia} />
        <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
      </Link>
    </li>
  )
}

const TAMANOS: { valor: TamanoLetra; texto: string; muestra: string }[] = [
  { valor: 'normal', texto: 'Normal', muestra: 'text-base' },
  { valor: 'grande', texto: 'Grande', muestra: 'text-xl' },
  { valor: 'enorme', texto: 'Muy grande', muestra: 'text-2xl' },
]

// Letra más grande para quien la necesite; se guarda en este teléfono.
function AjusteLetra() {
  const [tamano, setTamano] = useState(leerTamanoLetra)
  return (
    <section aria-labelledby="titulo-letra" className="rounded-2xl bg-white p-5 shadow-tarjeta ring-1 ring-stone-200/80">
      <p id="titulo-letra" className="flex items-center gap-3 font-medium text-stone-900">
        <IconoOpcion Icono={Type} /> Tamaño de la letra
      </p>
      <div role="group" aria-labelledby="titulo-letra" className="mt-4 grid grid-cols-3 gap-2">
        {TAMANOS.map(({ valor, texto, muestra }) => (
          <button
            key={valor}
            onClick={() => {
              setTamano(valor)
              guardarTamanoLetra(valor)
            }}
            aria-pressed={tamano === valor}
            className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition ${
              tamano === valor ? 'bg-cielo-50 text-cielo-800 ring-2 ring-cielo-600' : 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-cielo-50'
            }`}
          >
            <span aria-hidden className={`font-serif leading-none font-semibold ${muestra}`}>
              Aa
            </span>
            <span className="text-xs font-medium">{texto}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

// Instalar la app desde aquí, aunque se haya cerrado el aviso del inicio.
function OpcionInstalar() {
  const puedeInstalar = usePuedeInstalar()
  if (esAppInstalada || (!puedeInstalar && !esIOS)) return null
  return (
    <li>
      {puedeInstalar ? (
        <button onClick={() => void instalar()} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cielo-50">
          <IconoOpcion Icono={Download} />
          <span className="flex-1 font-medium text-stone-900">Instalar la app en este teléfono</span>
        </button>
      ) : (
        <div className="flex min-h-16 items-center gap-3 px-4 py-3">
          <IconoOpcion Icono={Download} />
          <span className="flex-1">
            <span className="block font-medium text-stone-900">Instalar la app</span>
            <span className="block text-sm text-stone-600">
              En Safari toca <Share className="inline size-4 align-text-bottom" aria-label="Compartir" /> y luego «Agregar a inicio».
            </span>
          </span>
        </div>
      )}
    </li>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <TituloSeccion>{titulo}</TituloSeccion>
      {children}
    </section>
  )
}

export function Mas() {
  const { sesion, perfil, cerrarSesion } = useAuth()
  const { data: respuestas } = useRespuestasNuevas()
  const { data: solicitudes = 0 } = useSolicitudesPendientes()
  const { data: preguntas = 0 } = usePreguntasSinResponder()
  const iniciales = (perfil?.nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  useTituloDocumento('Más')

  return (
    <div className="space-y-7">
      <h1 className="sr-only">Más</h1>

      <section aria-label="Tu perfil" className="manto relative overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-cielo-900/20">
        <span aria-hidden className="pointer-events-none absolute -top-14 -right-10 size-40 rounded-full bg-oro-400/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-full bg-white/10 font-serif text-2xl font-semibold text-oro-400 ring-2 ring-oro-400/60"
          >
            {iniciales}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-3xl leading-tight font-semibold">{perfil?.nombre}</p>
            <p className="truncate text-sm text-cielo-100">{perfil?.acceso ?? sesion?.user.email}</p>
          </div>
        </div>
      </section>

      {perfil?.es_admin && (
        <Seccion titulo="Coordinación">
          <Lista>
            <Opcion
              a="/admin"
              texto="Panel de administración"
              detalle="Miembros, avisos, calendario y más"
              Icono={Shield}
              insignia={solicitudes + preguntas}
            />
          </Lista>
        </Seccion>
      )}

      <Seccion titulo="Tu grupo">
        <Lista>
          <Opcion a="/avisos" texto="Avisos" Icono={Megaphone} />
          <Opcion a="/preguntas" texto="Pregúntale al coordinador" detalle="En privado, sólo la ve el coordinador" Icono={CircleHelp} insignia={respuestas} />
        </Lista>
      </Seccion>

      <Seccion titulo="Ajustes">
        <div className="space-y-3">
          <AjusteNotificaciones />
          <AjusteLetra />
          <Lista>
            <Opcion a="/cambiar-contrasena" texto="Cambiar contraseña" Icono={KeyRound} />
            <OpcionInstalar />
          </Lista>
        </div>
      </Seccion>

      <button
        onClick={() => void cerrarSesion()}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 font-medium text-red-700 shadow-tarjeta ring-1 ring-stone-200/80 transition hover:bg-red-50"
      >
        <LogOut className="size-5" aria-hidden /> Cerrar sesión
      </button>

      <footer className="flex flex-col items-center gap-2 pt-2 pb-4 text-center">
        <img src="/logo.svg" alt="" className="size-10 rounded-xl opacity-90" />
        <p className="font-serif text-lg text-cielo-800 italic">Santa María, ruega por nosotros.</p>
      </footer>
    </div>
  )
}
