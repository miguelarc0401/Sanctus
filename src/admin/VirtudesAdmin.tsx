import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { Cargando, EncabezadoAdmin, Vacio } from '../components/Bloques'
import { AreaTexto, Campo, MensajeError, PieFormulario } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { borrarFila, datos, guardarFila } from '../lib/consultas'
import { deFechaISO, lunesDe, semanaDel } from '../lib/fechas'
import { supabase } from '../lib/supabase'
import type { Virtud } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'
import { Destino, SelectorDeDestino } from './comunes'

function FormVirtud({ virtud, onListo }: { virtud: Virtud | null; onListo: () => void }) {
  const [dia, setDia] = useState(virtud?.semana ?? lunesDe())
  const [nombre, setNombre] = useState(virtud?.virtud ?? '')
  const [explicacion, setExplicacion] = useState(virtud?.explicacion ?? '')
  const [ejemplos, setEjemplos] = useState(virtud?.ejemplos.join('\n') ?? '')
  const [destino, setDestino] = useState(virtud?.grupo_id ? String(virtud.grupo_id) : '')
  const { guardando, error, enviar } = useEnvio({ duplicado: 'Ya hay una virtud para esa semana en ese grupo.' })
  const semana = dia ? lunesDe(deFechaISO(dia)) : ''

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          await guardarFila('virtudes', virtud?.id ?? null, {
            semana,
            virtud: nombre.trim(),
            explicacion: explicacion.trim() || null,
            ejemplos: ejemplos
              .split('\n')
              .map((linea) => linea.trim())
              .filter(Boolean),
            grupo_id: destino ? Number(destino) : null,
          })
          onListo()
        })
      }}
    >
      <div className="space-y-1.5">
        <Campo id="semana" etiqueta="Semana" type="date" required value={dia} onChange={(e) => setDia(e.target.value)} />
        {semana && <p className="text-sm text-stone-500">{semanaDel(semana)}</p>}
      </div>
      <Campo
        id="virtud"
        etiqueta="Virtud"
        placeholder="Por ejemplo: Paciencia"
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <AreaTexto
        id="explicacion"
        etiqueta="Explicación"
        ayuda="(opcional)"
        rows={3}
        value={explicacion}
        onChange={(e) => setExplicacion(e.target.value)}
      />
      <AreaTexto
        id="ejemplos"
        etiqueta="Ejemplos concretos"
        ayuda="(uno por renglón)"
        rows={5}
        placeholder={'Esperar mi turno sin quejarme\nEscuchar a mis papás sin interrumpir'}
        value={ejemplos}
        onChange={(e) => setEjemplos(e.target.value)}
      />
      <SelectorDeDestino valor={destino} onCambiar={setDestino} />
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        onEliminar={
          virtud
            ? () => {
                if (!confirm('¿Eliminar esta virtud?')) return
                void enviar(async () => {
                  await borrarFila('virtudes', virtud.id)
                  onListo()
                })
              }
            : undefined
        }
      />
    </form>
  )
}

export function VirtudesAdmin() {
  const clienteConsultas = useQueryClient()
  const [editando, setEditando] = useState<Virtud | 'nueva' | null>(null)
  const { data: virtudes = [], isPending } = useQuery({
    queryKey: ['virtudes', 'admin'],
    queryFn: () => datos<Virtud[]>(supabase.from('virtudes').select('*').order('semana', { ascending: false })),
  })
  const estaSemana = lunesDe()

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Virtud de la semana" textoNuevo="Nueva" onNuevo={() => setEditando('nueva')} />

      {isPending ? (
        <Cargando />
      ) : virtudes.length === 0 ? (
        <Vacio>Todavía no hay virtudes. Programa la de esta semana con «Nueva».</Vacio>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          {virtudes.map((virtud) => (
            <li key={virtud.id}>
              <button
                onClick={() => setEditando(virtud)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cielo-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-xl font-semibold text-cielo-800">{virtud.virtud}</span>
                    {virtud.semana === estaSemana && (
                      <span className="rounded-full bg-oro-400/25 px-2 py-0.5 text-xs font-medium text-oro-600">
                        Esta semana
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-stone-600">{semanaDel(virtud.semana)}</span>
                  <Destino grupoId={virtud.grupo_id} />
                </span>
                <Pencil className="size-4 shrink-0 text-stone-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <Hoja titulo={editando === 'nueva' ? 'Nueva virtud' : 'Editar virtud'} onCerrar={() => setEditando(null)}>
          <FormVirtud
            virtud={editando === 'nueva' ? null : editando}
            onListo={() => {
              setEditando(null)
              void clienteConsultas.invalidateQueries({ queryKey: ['virtudes'] })
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
