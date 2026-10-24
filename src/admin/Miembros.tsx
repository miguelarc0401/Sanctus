import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, KeyRound, Pencil, RefreshCw, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/contexto'
import { Cargando, EncabezadoAdmin, Vacio } from '../components/Bloques'
import { Boton, Campo, Casilla, MensajeError, PieFormulario, Selector } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { nombreDeGrupo, useGrupos } from '../grupos/contexto'
import { datos, guardarFila, llamarMiembros } from '../lib/consultas'
import { diaCorto } from '../lib/fechas'
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
      <p className="text-sm text-stone-500">
        Normalmente cada quien crea su cuenta desde la app y tú la apruebas. Usa esto sólo si alguien no puede
        registrarse por su cuenta.
      </p>
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

function FormAprobar({ miembro, grupos, onListo }: { miembro: Miembro; grupos: Grupo[]; onListo: () => void }) {
  const [elegidos, setElegidos] = useState<number[]>(miembro.grupo_solicitado ? [miembro.grupo_solicitado] : [])
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          const { error } = await supabase.rpc('aprobar_miembro', { usuario: miembro.id, grupos: elegidos })
          if (error) throw error
          onListo()
        })
      }}
    >
      <div>
        <p className="font-medium text-stone-900">{miembro.nombre}</p>
        <p className="font-mono text-sm text-stone-500">{miembro.acceso}</p>
        {miembro.nota_registro && <p className="mt-2 text-stone-700 italic">«{miembro.nota_registro}»</p>}
      </div>
      <CasillasDeGrupos grupos={grupos} elegidos={elegidos} onCambiar={setElegidos} />
      {elegidos.length === 0 && (
        <p className="text-sm text-oro-600">Sin grupo sólo verá lo que publiques para toda la parroquia.</p>
      )}
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario guardando={guardando} textoGuardar="Aprobar" />
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
  const [acceso, setAcceso] = useState(miembro.acceso ?? '')
  const [activa, setActiva] = useState(miembro.estado === 'aprobado')
  const [admin, setAdmin] = useState(miembro.es_admin)
  const [elegidos, setElegidos] = useState(actuales)
  const { guardando, error, enviar } = useEnvio()
  // Una cuenta desactivada no puede ser administradora.
  const adminNuevo = activa && admin

  async function guardar() {
    if (nombre.trim() !== miembro.nombre) await guardarFila('perfiles', miembro.id, { nombre: nombre.trim() })
    const accesoNuevo = acceso.trim().toLowerCase()
    if (accesoNuevo !== miembro.acceso) await llamarMiembros({ accion: 'cambiar_acceso', id: miembro.id, acceso: accesoNuevo })
    if (activa !== (miembro.estado === 'aprobado')) {
      const { error } = await supabase.rpc('cambiar_estado', {
        usuario: miembro.id,
        nuevo: activa ? 'aprobado' : 'suspendido',
      })
      if (error) throw error
    }
    // Al desactivar la cuenta, la base de datos ya le quita lo de administrador.
    if (activa && adminNuevo !== miembro.es_admin) {
      const { error } = await supabase.rpc('cambiar_admin', { usuario: miembro.id, hacer: adminNuevo })
      if (error) throw error
    }
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
        if (
          adminNuevo &&
          !miembro.es_admin &&
          !confirm(`¿Hacer administrador a ${miembro.nombre}? Podrá ver y cambiar todo en la app, igual que tú.`)
        ) {
          return
        }
        void enviar(guardar)
      }}
    >
      <Campo id="nombre" etiqueta="Nombre completo" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <Campo
        id="acceso"
        etiqueta="Usuario o correo"
        ayuda="(con esto entra a la app)"
        required
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={acceso}
        onChange={(e) => setAcceso(e.target.value)}
      />
      <CasillasDeGrupos grupos={grupos} elegidos={elegidos} onCambiar={setElegidos} />

      {!esUnoMismo && (
        <>
          <Casilla
            id="activa"
            etiqueta="Cuenta activa (si la desactivas, no podrá ver nada hasta que la reactives)"
            checked={activa}
            onChange={(e) => setActiva(e.target.checked)}
          />
          <Casilla
            id="admin"
            etiqueta="Administrador (puede usar todo el panel, igual que tú)"
            checked={adminNuevo}
            disabled={!activa}
            onChange={(e) => setAdmin(e.target.checked)}
          />
          <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
            <p className="font-medium text-stone-800">¿Olvidó su contraseña?</p>
            <p className="mt-1 text-sm text-stone-500">
              Se le asigna una contraseña temporal nueva y tendrá que cambiarla al entrar.
            </p>
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
        </>
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

function Solicitudes({
  solicitudes,
  grupos,
  onAprobar,
  onRechazada,
}: {
  solicitudes: Miembro[]
  grupos: Grupo[]
  onAprobar: (m: Miembro) => void
  onRechazada: () => void
}) {
  const { guardando, error, enviar } = useEnvio()

  return (
    <section className="space-y-3">
      <h2 className="px-1 text-sm font-semibold tracking-wide text-oro-600 uppercase">
        Solicitudes nuevas ({solicitudes.length})
      </h2>
      {error && <MensajeError>{error}</MensajeError>}
      {solicitudes.map((solicitud) => {
        const pidio = grupos.find((g) => g.id === solicitud.grupo_solicitado)
        return (
          <article key={solicitud.id} className="rounded-2xl bg-white p-4 shadow-sm ring-2 ring-oro-400/50">
            <p className="font-medium text-stone-900">{solicitud.nombre}</p>
            <p className="font-mono text-sm text-stone-500">{solicitud.acceso}</p>
            <p className="mt-1 text-sm text-stone-600">
              {pidio ? `Pidió entrar a: ${nombreDeGrupo(pidio)}` : 'No eligió grupo'} · {diaCorto(solicitud.creado_en)}
            </p>
            {solicitud.nota_registro && <p className="mt-2 text-stone-700 italic">«{solicitud.nota_registro}»</p>}
            <div className="mt-3 flex gap-2">
              <Boton className="flex-1 py-2.5" disabled={guardando} onClick={() => onAprobar(solicitud)}>
                <UserCheck className="size-4" aria-hidden /> Aprobar
              </Boton>
              <Boton
                variante="peligro"
                className="flex-1 py-2.5"
                disabled={guardando}
                onClick={() => {
                  if (!confirm(`¿Rechazar la solicitud de ${solicitud.nombre}? Se borrará su cuenta.`)) return
                  void enviar(async () => {
                    await llamarMiembros({ accion: 'eliminar', id: solicitud.id })
                    onRechazada()
                  })
                }}
              >
                <UserX className="size-4" aria-hidden /> Rechazar
              </Boton>
            </div>
          </article>
        )
      })}
    </section>
  )
}

type Ventana =
  | { tipo: 'nuevo' }
  | { tipo: 'aprobar'; miembro: Miembro }
  | { tipo: 'editar'; miembro: Miembro }
  | { tipo: 'entrega'; entrega: Entrega }

const titulos = { nuevo: 'Crear cuenta', aprobar: 'Aprobar solicitud', editar: 'Editar miembro', entrega: 'Cuenta lista' }

export function Miembros() {
  const clienteConsultas = useQueryClient()
  const { perfil } = useAuth()
  const { grupos } = useGrupos()
  const [filtro, setFiltro] = useState('todos')
  const [ventana, setVentana] = useState<Ventana | null>(null)

  const { data: todos = [], isPending } = useQuery({
    queryKey: ['miembros'],
    queryFn: () =>
      datos<Miembro[]>(
        supabase
          .from('perfiles')
          .select(
            'id, nombre, acceso, es_admin, es_principal, debe_cambiar_contrasena, estado, grupo_solicitado, nota_registro, creado_en, miembros(grupo_id)',
          )
          .order('nombre'),
      ),
  })

  const solicitudes = todos.filter((m) => m.estado === 'pendiente')
  const miembros = todos.filter((m) => m.estado !== 'pendiente')
  const visibles = miembros.filter((m) => {
    if (filtro === 'todos') return true
    if (filtro === 'sin-grupo') return m.miembros.length === 0
    return m.miembros.some((g) => g.grupo_id === Number(filtro))
  })

  const recargar = () => {
    void clienteConsultas.invalidateQueries({ queryKey: ['miembros'] })
    void clienteConsultas.invalidateQueries({ queryKey: ['grupos'] })
  }

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Miembros" textoNuevo="Crear cuenta" onNuevo={() => setVentana({ tipo: 'nuevo' })} />

      {solicitudes.length > 0 && (
        <Solicitudes
          solicitudes={solicitudes}
          grupos={grupos}
          onAprobar={(miembro) => setVentana({ tipo: 'aprobar', miembro })}
          onRechazada={recargar}
        />
      )}

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
                    <span className={miembro.estado === 'suspendido' ? 'text-stone-400 line-through' : 'text-stone-900'}>
                      {miembro.nombre}
                    </span>
                    {miembro.es_admin && (
                      <span className="rounded-full bg-cielo-100 px-2 py-0.5 text-xs font-medium text-cielo-800">
                        {miembro.es_principal ? 'Admin principal' : 'Admin'}
                      </span>
                    )}
                    {miembro.estado === 'suspendido' && (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
                        Desactivada
                      </span>
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
          {ventana.tipo === 'aprobar' && (
            <FormAprobar
              miembro={ventana.miembro}
              grupos={grupos}
              onListo={() => {
                recargar()
                setVentana(null)
              }}
            />
          )}
          {ventana.tipo === 'editar' && ventana.miembro.es_principal && ventana.miembro.id !== perfil?.id ? (
            <div className="space-y-4">
              <p className="text-stone-700">
                {ventana.miembro.nombre} es el administrador principal de la app. Nadie más puede cambiar su cuenta,
                quitarle el permiso de administrador ni desactivarla.
              </p>
              <div className="flex justify-end">
                <Boton onClick={() => setVentana(null)}>Entendido</Boton>
              </div>
            </div>
          ) : ventana.tipo === 'editar' && (
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
