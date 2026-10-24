import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Cargando, EncabezadoAdmin, Vacio } from '../components/Bloques'
import { AreaTexto, Campo, MensajeError, PieFormulario, Selector } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { borrarFila, datos, guardarFila } from '../lib/consultas'
import { supabase } from '../lib/supabase'
import type { Grupo, Santo } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'

type GrupoConConteo = Grupo & { miembros: { count: number }[] }

function FormGrupo({
  grupo,
  santos,
  usados,
  onListo,
}: {
  grupo: Grupo | null
  santos: Santo[]
  usados: Set<number>
  onListo: () => void
}) {
  const [santoId, setSantoId] = useState(grupo?.santo_id ?? '')
  const [nombre, setNombre] = useState(grupo?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(grupo?.descripcion ?? '')
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          await guardarFila('grupos', grupo?.id ?? null, {
            santo_id: Number(santoId),
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || null,
          })
          onListo()
        })
      }}
    >
      <Selector id="santo" etiqueta="Santo" required value={santoId} onChange={(e) => setSantoId(e.target.value)}>
        <option value="" disabled>
          Elige un santo…
        </option>
        {santos.map((santo) => (
          <option key={santo.id} value={santo.id}>
            {santo.nombre}
            {usados.has(santo.id) && santo.id !== grupo?.santo_id ? ' (ya tiene grupo)' : ''}
          </option>
        ))}
      </Selector>
      <p className="-mt-2 text-sm text-stone-500">
        ¿No está en la lista?{' '}
        <Link to="/admin/santos" className="text-cielo-700 underline">
          Agrégalo en Santos
        </Link>
        .
      </p>
      <Campo
        id="nombre"
        etiqueta="Nombre del grupo"
        placeholder="Por ejemplo: Primera Comunión 2026"
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <AreaTexto
        id="descripcion"
        etiqueta="Descripción"
        ayuda="(opcional)"
        rows={3}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        onEliminar={
          grupo
            ? () => {
                const aviso =
                  '¿Eliminar este grupo? También se borran sus avisos, eventos y virtudes propios. Las cuentas de los miembros no se borran.'
                if (!confirm(aviso)) return
                void enviar(async () => {
                  await borrarFila('grupos', grupo.id)
                  onListo()
                })
              }
            : undefined
        }
      />
    </form>
  )
}

export function Grupos() {
  const clienteConsultas = useQueryClient()
  const [editando, setEditando] = useState<Grupo | 'nuevo' | null>(null)

  const { data: grupos = [], isPending } = useQuery({
    queryKey: ['grupos', 'admin'],
    queryFn: () =>
      datos<GrupoConConteo[]>(
        supabase
          .from('grupos')
          .select('id, nombre, descripcion, santo_id, santo:santos(nombre), miembros(count)')
          .order('nombre'),
      ),
  })
  const { data: santos = [] } = useQuery({
    queryKey: ['santos'],
    queryFn: () => datos<Santo[]>(supabase.from('santos').select('*').order('nombre')),
  })
  const usados = new Set(grupos.map((g) => g.santo_id))

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Grupos" textoNuevo="Nuevo grupo" onNuevo={() => setEditando('nuevo')} />

      {isPending ? (
        <Cargando />
      ) : grupos.length === 0 ? (
        <Vacio>Todavía no hay grupos. Crea el primero con «Nuevo grupo».</Vacio>
      ) : (
        <ul className="space-y-3">
          {grupos.map((grupo) => (
            <li key={grupo.id}>
              <button
                onClick={() => setEditando(grupo)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-tarjeta ring-1 ring-stone-200/80 transition hover:bg-cielo-50"
              >
                <span className="flex-1">
                  <span className="block font-serif text-2xl font-semibold text-cielo-800">{grupo.santo.nombre}</span>
                  <span className="block text-stone-700">{grupo.nombre}</span>
                  <span className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                    <Users className="size-4" aria-hidden /> {grupo.miembros[0]?.count ?? 0} miembros
                  </span>
                </span>
                <Pencil className="size-4 text-stone-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <Hoja titulo={editando === 'nuevo' ? 'Nuevo grupo' : 'Editar grupo'} onCerrar={() => setEditando(null)}>
          <FormGrupo
            grupo={editando === 'nuevo' ? null : editando}
            santos={santos}
            usados={usados}
            onListo={() => {
              setEditando(null)
              void clienteConsultas.invalidateQueries({ queryKey: ['grupos'] })
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
