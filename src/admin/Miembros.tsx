import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, KeyRound, Pencil, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/contexto'
import { Cargando, EncabezadoAdmin, Vacio } from '../components/Bloques'
import { Boton, Campo, Casilla, MensajeError, PieFormulario, Selector } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { nombreDeGrupo, useGrupos } from '../grupos/contexto'
import { datos, guardarFila, llamarMiembros } from '../lib/consultas'
import { supabase } from '../lib/supabase'
import type { Grupo, Miembro } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'
import { generarContrasena, sugerirUsuario } from '../lib/usuarios'

type Entrega = { nombre: string; acceso: string; contrasena: string }

// Datos que el coordinador le pasa a la persona (en papel o por WhatsApp).
function DatosDeEntrega({ entrega, onListo }: { entrega: Entrega; onListo: () => void }) {
  const [copiado, setCopiado] = useState(false)
  const mensaje = [
    `Hola ${entrega.nombre.split(' ')[0]}, ya tienes cuenta en la app Santa María.`,
    `Entra en: ${window.location.origin}`,
    `Usuario: ${entrega.acceso}`,
    `Contraseña temporal: ${entrega.contrasena}`,
    'Al entrar te pedirá crear tu propia contraseña.',
  ].join('\n')

  return (
    <div className="space-y-4">
      <p className="text-stone-700">Entrégale estos datos a {entrega.nombre}:</p>
      <dl className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <div>
          <dt className="text-sm text-stone-500">Usuario</dt>
          <dd className="font-mono text-lg text-stone-900">{entrega.acceso}</dd>
        </div>
        <div>
          <dt className="text-sm text-stone-500">Contraseña temporal</dt>
          <dd className="font-mono text-lg text-stone-900">{entrega.contrasena}</dd>
        </div>
      </dl>
      <p className="text-sm text-stone-500">La primera vez que entre, la app le pedirá crear su propia contraseña.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Boton
          variante="secundario"
          onClick={() => {
            void navigator.clipboard.writeText(mensaje).then(() => setCopiado(true))
          }}
        >
          {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copiado ? 'Mensaje copiado' : 'Copiar mensaje'}
        </Boton>
        <Boton onClick={onListo}>Listo</Boton>
      </div>
    </div>
  )
}

function CasillasDeGrupos({
  grupos,
  elegidos,
  onCambiar,
}: {
  grupos: Grupo[]
  elegidos: number[]
  onCambiar: (ids: number[]) => void
}) {
  if (grupos.length === 0) return <p className="text-sm text-stone-500">Todavía no hay grupos creados.</p>
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-1.5 text-sm font-medium text-stone-700">Grupos</legend>
      {grupos.map((grupo) => (
        <Casilla
          key={grupo.id}
          id={`grupo-${grupo.id}`}
          etiqueta={nombreDeGrupo(grupo)}
          checked={elegidos.includes(grupo.id)}
          onChange={(e) =>
            onCambiar(e.target.checked ? [...elegidos, grupo.id] : elegidos.filter((id) => id !== grupo.id))
          }
        />
      ))}
    </fieldset>
  )
}

function CampoContrasena({ valor, onCambiar }: { valor: string; onCambiar: (v: string) => void }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Campo
          id="contrasena"
          etiqueta="Contraseña temporal"
          required
          minLength={8}
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
        />
      </div>
      <button
        type="button"
        onClick={() => onCambiar(generarContrasena())}
        aria-label="Generar otra contraseña"
        className="rounded-xl p-3.5 text-cielo-700 ring-1 ring-stone-300 hover:bg-cielo-50"
      >
        <RefreshCw className="size-5" />
      </button>
    </div>
  )
}

function FormNuevoMiembro({
  grupos,
  grupoInicial,
  onCreado,
}: {
  grupos: Grupo[]
  grupoInicial: number | null
  onCreado: (entrega: Entrega) => void
}) {
  const [nombre, setNombre] = useState('')
  const [acceso, setAcceso] = useState('')
  const [accesoEditado, setAccesoEditado] = useState(false)
  const [contrasena, setContrasena] = useState(generarContrasena)
  const [elegidos, setElegidos] = useState<number[]>(grupoInicial ? [grupoInicial] : [])
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          const accesoFinal = acceso.trim().toLowerCase()
          await llamarMiembros({ accion: 'crear', nombre, acceso: accesoFinal, contrasena, grupos: elegidos })
          onCreado({ nombre: nombre.trim(), acceso: accesoFinal, contrasena })
        })
      }}
    >
      <Campo
        id="nombre"
        etiqueta="Nombre completo"
        required
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value)
          if (!accesoEditado) setAcceso(sugerirUsuario(e.target.value))
        }}
      />
      <Campo
        id="acceso"
        etiqueta="Usuario o correo"
        ayuda="(con esto entrará a la app)"
        required
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={acceso}
        onChange={(e) => {
          setAcceso(e.target.value)
          setAccesoEditado(true)
        }}
      />
      <CampoContrasena valor={contrasena} onCambiar={setContrasena} />
      <CasillasDeGrupos grupos={grupos} elegidos={elegidos} onCambiar={setElegidos} />
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario guardando={guardando} textoGuardar="Crear cuenta" />
    </form>
  )
}

function FormMiembro({
  miembro,
  grupos,
  esUnoMismo,
  onListo,
  onContrasenaNueva,
}: {
  miembro: Miembro
  grupos: Grupo[]
  esUnoMismo: boolean
  onListo: () => void
  onContrasenaNueva: (entrega: Entrega) => void
}) {
  const actuales = miembro.miembros.map((m) => m.grupo_id)
  const [nombre, setNombre] = useState(miembro.nombre)
  const [elegidos, setElegidos] = useState(actuales)
  const { guardando, error, enviar } = useEnvio()

  async function guardar() {
    if (nombre.trim() !== miembro.nombre) await guardarFila('perfiles', miembro.id, { nombre: nombre.trim() })
    const agregar = elegidos.filter((id) => !actuales.includes(id))
    const quitar = actuales.filter((id) => !elegidos.includes(id))
    if (agregar.length > 0) {
      const { error } = await supabase
        .from('miembros')
        .insert(agregar.map((grupo_id) => ({ grupo_id, usuario_id: miembro.id })))
      if (error) throw error
    }
    if (quitar.length > 0) {
      const { error } = await supabase.from('miembros').delete().eq('usuario_id', miembro.id).in('grupo_id', quitar)
      if (error) throw error
    }
    onListo()
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(guardar)
      }}
    >
      <p className="text-sm text-stone-500">
        Entra con: <span className="font-mono text-stone-800">{miembro.acceso}</span>
      </p>
      <Campo id="nombre" etiqueta="Nombre completo" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <CasillasDeGrupos grupos={grupos} elegidos={elegidos} onCambiar={setElegidos} />

      {!esUnoMismo && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <p className="font-medium text-stone-800">¿Olvidó su contraseña?</p>
          <p className="mt-1 text-sm text-stone-500">Se le asigna una contraseña temporal nueva y tendrá que cambiarla al entrar.</p>
          <Boton
            type="button"
            variante="secundario"
            className="mt-3"
            disabled={guardando}
            onClick={() => {
              const contrasena = generarContrasena()
              void enviar(async () => {
                await llamarMiembros({ accion: 'restablecer', id: miembro.id, contrasena })
                onContrasenaNueva({ nombre: miembro.nombre, acceso: miembro.acceso ?? '', contrasena })
              })
            }}
          >
            <KeyRound className="size-4" aria-hidden /> Darle una contraseña nueva
          </Boton>
        </div>
      )}

      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        onEliminar={
          esUnoMismo
            ? undefined
            : () => {
                if (!confirm(`¿Eliminar la cuenta de ${miembro.nombre}? No se puede deshacer.`)) return
                void enviar(async () => {
                  await llamarMiembros({ accion: 'eliminar', id: miembro.id })
                  onListo()
                })
              }
        }
      />
    </form>
  )
}

type Ventana = { tipo: 'nuevo' } | { tipo: 'editar'; miembro: Miembro } | { tipo: 'entrega'; entrega: Entrega }

export function Miembros() {
  const clienteConsultas = useQueryClient()
  const { perfil } = useAuth()
  const { grupos } = useGrupos()
  const [filtro, setFiltro] = useState('todos')
  const [ventana, setVentana] = useState<Ventana | null>(null)

  const { data: miembros = [], isPending } = useQuery({
    queryKey: ['miembros'],
    queryFn: () =>
      datos<Miembro[]>(
        supabase
          .from('perfiles')
          .select('id, nombre, acceso, es_admin, debe_cambiar_contrasena, miembros(grupo_id)')
          .order('nombre'),
      ),
  })

  const visibles = miembros.filter((m) => {
    if (filtro === 'todos') return true
    if (filtro === 'sin-grupo') return m.miembros.length === 0
    return m.miembros.some((g) => g.grupo_id === Number(filtro))
  })

  const recargar = () => {
    void clienteConsultas.invalidateQueries({ queryKey: ['miembros'] })
    void clienteConsultas.invalidateQueries({ queryKey: ['grupos'] })
  }

  const titulos = { nuevo: 'Nuevo miembro', editar: 'Editar miembro', entrega: 'Cuenta lista' }

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Miembros" textoNuevo="Nuevo miembro" onNuevo={() => setVentana({ tipo: 'nuevo' })} />

      <Selector id="filtro" etiqueta="Mostrar" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
        <option value="todos">Todos ({miembros.length})</option>
        {grupos.map((grupo) => (
          <option key={grupo.id} value={grupo.id}>
            {nombreDeGrupo(grupo)}
          </option>
        ))}
        <option value="sin-grupo">Sin grupo</option>
      </Selector>

      {isPending ? (
        <Cargando />
      ) : visibles.length === 0 ? (
        <Vacio>No hay miembros aquí.</Vacio>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          {visibles.map((miembro) => (
            <li key={miembro.id}>
              <button
                onClick={() => setVentana({ tipo: 'editar', miembro })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cielo-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-stone-900">{miembro.nombre}</span>
                    {miembro.es_admin && (
                      <span className="rounded-full bg-cielo-100 px-2 py-0.5 text-xs font-medium text-cielo-800">Admin</span>
                    )}
                    {miembro.debe_cambiar_contrasena && (
                      <span className="rounded-full bg-oro-400/25 px-2 py-0.5 text-xs font-medium text-oro-600">
                        Aún no entra
                      </span>
                    )}
                  </span>
                  <span className="block truncate font-mono text-sm text-stone-500">{miembro.acceso}</span>
                  {miembro.miembros.length > 0 && (
                    <span className="mt-1 block truncate text-sm text-stone-600">
                      {miembro.miembros
                        .map((m) => grupos.find((g) => g.id === m.grupo_id)?.santo.nombre)
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </span>
                <Pencil className="size-4 shrink-0 text-stone-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {ventana && (
        <Hoja titulo={titulos[ventana.tipo]} onCerrar={() => setVentana(null)}>
          {ventana.tipo === 'nuevo' && (
            <FormNuevoMiembro
              grupos={grupos}
              grupoInicial={Number(filtro) || null}
              onCreado={(entrega) => {
                recargar()
                setVentana({ tipo: 'entrega', entrega })
              }}
            />
          )}
          {ventana.tipo === 'editar' && (
            <FormMiembro
              miembro={ventana.miembro}
              grupos={grupos}
              esUnoMismo={ventana.miembro.id === perfil?.id}
              onListo={() => {
                recargar()
                setVentana(null)
              }}
              onContrasenaNueva={(entrega) => {
                recargar()
                setVentana({ tipo: 'entrega', entrega })
              }}
            />
          )}
          {ventana.tipo === 'entrega' && <DatosDeEntrega entrega={ventana.entrega} onListo={() => setVentana(null)} />}
        </Hoja>
      )}
    </div>
  )
}
