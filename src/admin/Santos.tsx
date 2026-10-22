import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { Cargando, EncabezadoAdmin, Vacio } from '../components/Bloques'
import { AreaTexto, Campo, MensajeError, PieFormulario } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { borrarFila, datos, guardarFila } from '../lib/consultas'
import { supabase } from '../lib/supabase'
import type { Santo } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'

function FormSanto({ santo, onListo }: { santo: Santo | null; onListo: () => void }) {
  const [nombre, setNombre] = useState(santo?.nombre ?? '')
  const [fiesta, setFiesta] = useState(santo?.fiesta ?? '')
  const [descripcion, setDescripcion] = useState(santo?.descripcion ?? '')
  const { guardando, error, enviar } = useEnvio('Ya existe un santo con ese nombre.')

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          await guardarFila('santos', santo?.id ?? null, {
            nombre: nombre.trim(),
            fiesta: fiesta.trim() || null,
            descripcion: descripcion.trim() || null,
          })
          onListo()
        })
      }}
    >
      <Campo id="nombre" etiqueta="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <Campo
        id="fiesta"
        etiqueta="Fiesta"
        ayuda="(opcional)"
        placeholder="Por ejemplo: 23 de septiembre"
        value={fiesta}
        onChange={(e) => setFiesta(e.target.value)}
      />
      <AreaTexto
        id="descripcion"
        etiqueta="Descripción"
        ayuda="(opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        onEliminar={
          santo
            ? () => {
                if (!confirm(`¿Eliminar a ${santo.nombre} de la lista?`)) return
                void enviar(async () => {
                  await borrarFila('santos', santo.id)
                  onListo()
                })
              }
            : undefined
        }
      />
    </form>
  )
}

export function Santos() {
  const clienteConsultas = useQueryClient()
  const [editando, setEditando] = useState<Santo | 'nuevo' | null>(null)
  const { data: santos = [], isPending } = useQuery({
    queryKey: ['santos'],
    queryFn: () => datos<Santo[]>(supabase.from('santos').select('*').order('nombre')),
  })

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Santos" textoNuevo="Nuevo santo" onNuevo={() => setEditando('nuevo')} />

      {isPending ? (
        <Cargando />
      ) : santos.length === 0 ? (
        <Vacio>No hay santos en la lista.</Vacio>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          {santos.map((santo) => (
            <li key={santo.id}>
              <button
                onClick={() => setEditando(santo)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cielo-50"
              >
                <span className="flex-1">
                  <span className="block text-stone-900">{santo.nombre}</span>
                  {santo.fiesta && <span className="block text-sm text-stone-500">Fiesta: {santo.fiesta}</span>}
                </span>
                <Pencil className="size-4 text-stone-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <Hoja titulo={editando === 'nuevo' ? 'Nuevo santo' : 'Editar santo'} onCerrar={() => setEditando(null)}>
          <FormSanto
            santo={editando === 'nuevo' ? null : editando}
            onListo={() => {
              setEditando(null)
              void clienteConsultas.invalidateQueries({ queryKey: ['santos'] })
              void clienteConsultas.invalidateQueries({ queryKey: ['grupos'] })
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
