import { ChevronRight, Lock, MessageCircle, Search, SquarePen } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Cargando, Encabezado, Vacio } from '../components/Bloques'
import { Boton, MensajeError } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { useGrupos } from '../grupos/contexto'
import { diasDesdeHoy, diaCorto, diaSemana, hora } from '../lib/fechas'
import { useConversaciones, useDestinatarios, type Destinatario } from '../lib/mensajes'

// Círculo con las iniciales; dorado para los coordinadores.
export function Iniciales({ nombre, coordinador, grande = false }: { nombre: string; coordinador: boolean; grande?: boolean }) {
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-serif font-semibold ${grande ? 'size-12 text-xl' : 'size-11 text-lg'} ${
        coordinador ? 'manto text-oro-400 ring-2 ring-oro-400/60' : 'bg-cielo-100 text-cielo-800 ring-1 ring-cielo-200'
      }`}
    >
      {iniciales}
    </span>
  )
}

// La hora si fue hoy, el día de la semana si fue esta semana, y si no la fecha.
function cuando(iso: string) {
  const dias = -diasDesdeHoy(iso)
  if (dias <= 0) return hora(iso)
  if (dias === 1) return 'Ayer'
  if (dias >= 7) return diaCorto(iso)
  const dia = diaSemana(iso).replace('.', '')
  return dia.charAt(0).toUpperCase() + dia.slice(1)
}

function ElegirDestinatario({ onElegido }: { onElegido: (id: string) => void }) {
  const { perfil } = useAuth()
  const { grupos } = useGrupos()
  const { data: personas = [], isPending, error } = useDestinatarios(true)
  const [buscar, setBuscar] = useState('')
  const esAdmin = perfil?.es_admin === true
  const sinAcentos = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const visibles = personas.filter((p) => sinAcentos(p.nombre).includes(sinAcentos(buscar.trim())))

  const detalle = (persona: Destinatario) => {
    if (persona.es_admin) return 'Coordinador'
    const nombres = persona.miembros.map((m) => grupos.find((g) => g.id === m.grupo_id)?.nombre).filter(Boolean)
    return nombres.length ? nombres.join(' · ') : 'Sin grupo'
  }

  if (isPending) return <Cargando filas={3} />
  if (error) return <MensajeError>No se pudo cargar la lista. Revisa tu internet.</MensajeError>
  if (personas.length === 0) {
    return <p className="text-stone-700">Por ahora no hay {esAdmin ? 'cuentas activas' : 'coordinadores'} a quién escribirle.</p>
  }

  return (
    <div className="space-y-4">
      {esAdmin ? (
        <label className="relative block">
          <span className="sr-only">Buscar por nombre</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-stone-400" aria-hidden />
          <input
            type="search"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre"
            className="block min-h-12 w-full rounded-xl border border-stone-300 bg-white py-3 pr-4 pl-12 text-base text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-cielo-600 focus:ring-4 focus:ring-cielo-500/15"
          />
        </label>
      ) : (
        <p className="text-stone-700">¿A qué coordinador le quieres escribir? Sólo él o ella verá tus mensajes.</p>
      )}
      {visibles.length === 0 ? (
        <p className="px-1 text-stone-600">Nadie se llama así.</p>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          {visibles.map((persona) => (
            <li key={persona.id}>
              <button
                onClick={() => onElegido(persona.id)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cielo-50"
              >
                <Iniciales nombre={persona.nombre} coordinador={persona.es_admin} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-stone-900">{persona.nombre}</span>
                  <span className="block truncate text-sm text-stone-600">{detalle(persona)}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Mensajes() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const { data: conversaciones = [], isPending } = useConversaciones()
  const [eligiendo, setEligiendo] = useState(false)
  const esAdmin = perfil?.es_admin === true
  const textoNuevo = esAdmin ? 'Escribir un mensaje' : 'Escribirle a un coordinador'

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Mensajes"
        descripcion={
          esAdmin
            ? 'Conversaciones privadas con cada persona. Nadie más las ve, ni los otros coordinadores.'
            : 'Escríbele en privado a un coordinador, sobre la fe o sobre el grupo.'
        }
        volver={{ a: '/mas', texto: 'Más' }}
        accion={
          conversaciones.length > 0 && (
            <button
              onClick={() => setEligiendo(true)}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-cielo-800 px-4 text-sm font-medium text-white shadow-sm shadow-cielo-900/20 transition hover:bg-cielo-700 active:scale-[0.98]"
            >
              <SquarePen className="size-4" aria-hidden /> Nuevo
            </button>
          )
        }
      />

      {isPending ? (
        <Cargando />
      ) : conversaciones.length === 0 ? (
        <div className="space-y-4">
          <Vacio Icono={MessageCircle}>Todavía no tienes mensajes.</Vacio>
          <Boton className="w-full" onClick={() => setEligiendo(true)}>
            <SquarePen className="size-5" aria-hidden /> {textoNuevo}
          </Boton>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-tarjeta ring-1 ring-stone-200/80">
          {conversaciones.map((c) => (
            <li key={c.persona}>
              <Link to={`/mensajes/${c.persona}`} className="flex min-h-18 items-center gap-3 px-4 py-3 transition hover:bg-cielo-50">
                <Iniciales nombre={c.nombre} coordinador={c.es_coordinador} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={`min-w-0 flex-1 truncate ${c.sin_leer ? 'font-semibold text-stone-950' : 'font-medium text-stone-900'}`}>
                      {c.nombre}
                    </span>
                    <span className={`shrink-0 text-xs ${c.sin_leer ? 'font-semibold text-oro-700' : 'text-stone-500'}`}>{cuando(c.ultimo_en)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`min-w-0 flex-1 truncate text-sm ${c.sin_leer ? 'font-medium text-stone-800' : 'text-stone-600'}`}>
                      {c.ultimo_mio && <span className="text-stone-500">Tú: </span>}
                      {c.ultimo}
                    </span>
                    {c.sin_leer > 0 && (
                      <span className="min-w-6 shrink-0 rounded-full bg-oro-500 px-2 py-0.5 text-center text-xs font-semibold text-white">
                        {c.sin_leer}
                        <span className="sr-only"> sin leer</span>
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center justify-center gap-1.5 px-1 text-center text-sm text-stone-500">
        <Lock className="size-4 shrink-0" aria-hidden /> Cada conversación la ven sólo las dos personas.
      </p>

      {eligiendo && (
        <Hoja titulo={esAdmin ? 'Nuevo mensaje' : 'Escribir a un coordinador'} onCerrar={() => setEligiendo(false)}>
          <ElegirDestinatario onElegido={(id) => navegar(`/mensajes/${id}`)} />
        </Hoja>
      )}
    </div>
  )
}
