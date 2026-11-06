import { useQueryClient } from '@tanstack/react-query'
import { Check, Lock, Phone, Plus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/contexto'
import { Cargando, Encabezado, Tarjeta } from '../components/Bloques'
import { Boton, Campo, MensajeError, MensajeExito } from '../components/Formulario'
import { GUSTOS, MAXIMO_GUSTOS, TIPOS_GUSTO, useMiPerfil, type DatosPerfil, type TipoGusto } from '../lib/perfil'
import { supabase } from '../lib/supabase'
import { useEnvio } from '../lib/useEnvio'

// Un grupo de gustos: ideas para tocar y un campo para agregar otros.
function ElegirGustos({ tipo, elegidos, onCambiar }: { tipo: TipoGusto; elegidos: string[]; onCambiar: (lista: string[]) => void }) {
  const { titulo, pregunta, Icono, ideas } = GUSTOS[tipo]
  const [otro, setOtro] = useState('')
  const propios = elegidos.filter((e) => !ideas.includes(e))
  const lleno = elegidos.length >= MAXIMO_GUSTOS

  function alternar(gusto: string) {
    onCambiar(elegidos.includes(gusto) ? elegidos.filter((g) => g !== gusto) : [...elegidos, gusto])
  }

  function agregar() {
    const nuevo = otro.trim().replace(/\s+/g, ' ').slice(0, 40)
    if (!nuevo) return
    const igual = [...ideas, ...elegidos].find((g) => g.toLowerCase() === nuevo.toLowerCase())
    if (igual) {
      if (!elegidos.includes(igual) && !lleno) onCambiar([...elegidos, igual])
    } else if (!lleno) {
      onCambiar([...elegidos, nuevo])
    }
    setOtro('')
  }

  return (
    // min-w-0: un fieldset no se encoge solo, y los botones se saldrían de la tarjeta en el teléfono.
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-3 flex items-center gap-3 font-medium text-stone-900">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-oro-400/20 text-oro-700">
          <Icono className="size-5" aria-hidden />
        </span>
        {pregunta}
      </legend>
      <div className="flex flex-wrap gap-2">
        {[...ideas, ...propios].map((gusto) => {
          const activo = elegidos.includes(gusto)
          return (
            <button
              key={gusto}
              type="button"
              aria-pressed={activo}
              disabled={!activo && lleno}
              onClick={() => alternar(gusto)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition disabled:opacity-40 ${
                activo ? 'bg-cielo-800 text-white shadow-sm' : 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-cielo-50'
              }`}
            >
              {activo && <Check className="size-4" aria-hidden />}
              {gusto}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <label htmlFor={`otro-${tipo}`} className="sr-only">
          Agregar otro ({titulo.toLowerCase()})
        </label>
        <input
          id={`otro-${tipo}`}
          value={otro}
          maxLength={40}
          disabled={lleno}
          placeholder="Otro…"
          onChange={(e) => setOtro(e.target.value)}
          onKeyDown={(e) => {
            // Enter agrega el gusto en lugar de guardar todo el perfil.
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
          className="block min-h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2 text-base text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-cielo-600 focus:ring-4 focus:ring-cielo-500/15 disabled:opacity-60"
        />
        <Boton type="button" variante="secundario" className="min-h-11 px-4 py-2" disabled={!otro.trim() || lleno} onClick={agregar}>
          <Plus className="size-4" aria-hidden /> Agregar
        </Boton>
      </div>
      {lleno && <p className="text-sm text-stone-600">Ya elegiste {MAXIMO_GUSTOS}: quita alguno para agregar otro.</p>}
    </fieldset>
  )
}

function FormPerfil({ inicial }: { inicial: DatosPerfil }) {
  const { perfil } = useAuth()
  const clienteConsultas = useQueryClient()
  const [telefono, setTelefono] = useState(inicial.telefono ?? '')
  const [gustos, setGustos] = useState<Record<TipoGusto, string[]>>({
    deportes: inicial.deportes,
    musica: inicial.musica,
    actividades: inicial.actividades,
  })
  const [guardado, setGuardado] = useState(false)
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-5"
      onChange={() => setGuardado(false)}
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          const { error } = await supabase
            .from('perfiles')
            .update({ telefono: telefono.trim() || null, ...gustos })
            .eq('id', perfil!.id)
          if (error) throw error
          setGuardado(true)
          void clienteConsultas.invalidateQueries({ queryKey: ['perfil'] })
          void clienteConsultas.invalidateQueries({ queryKey: ['miembros'] })
        })
      }}
    >
      <Tarjeta>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cielo-50 text-cielo-700 ring-1 ring-cielo-100">
            <Phone className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <Campo
              id="telefono"
              etiqueta="Tu teléfono"
              ayuda="(opcional)"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              placeholder="Por ejemplo: 55 1234 5678"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
            <p className="mt-1.5 text-sm text-stone-600">Para que tu coordinador te pueda llamar o escribir por WhatsApp.</p>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta className="space-y-7">
        {TIPOS_GUSTO.map((tipo) => (
          <ElegirGustos
            key={tipo}
            tipo={tipo}
            elegidos={gustos[tipo]}
            onCambiar={(lista) => {
              setGustos((g) => ({ ...g, [tipo]: lista }))
              setGuardado(false)
            }}
          />
        ))}
      </Tarjeta>

      {error && <MensajeError>{error}</MensajeError>}
      {guardado && <MensajeExito>¡Listo! Se guardó tu perfil.</MensajeExito>}
      <Boton type="submit" disabled={guardando} className="w-full">
        {guardando ? 'Guardando…' : 'Guardar mi perfil'}
      </Boton>
    </form>
  )
}

export function Perfil() {
  const { perfil } = useAuth()
  const { data, isPending } = useMiPerfil()

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Mi perfil"
        descripcion="Cuéntales a tus coordinadores un poco de ti: así es más fácil organizar actividades que te gusten."
        volver={{ a: '/mas', texto: 'Más' }}
      />
      <p className="flex items-center gap-1.5 px-1 text-sm text-stone-600">
        <Lock className="size-4 shrink-0" aria-hidden />
        Sólo lo ven tú y los coordinadores{perfil?.es_admin ? '' : ', no los demás miembros'}.
      </p>
      {isPending || !data ? <Cargando /> : <FormPerfil inicial={data} />}
    </div>
  )
}
