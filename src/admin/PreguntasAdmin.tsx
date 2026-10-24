import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Cargando, EncabezadoAdmin, Segmentos, Vacio } from '../components/Bloques'
import { AreaTexto, Boton, MensajeError, PieFormulario } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { borrarFila, datos } from '../lib/consultas'
import { diaCorto } from '../lib/fechas'
import { notificar } from '../lib/notificaciones'
import { supabase } from '../lib/supabase'
import type { Pregunta } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'
import { Destino } from './comunes'

type PreguntaConAutor = Pregunta & { autor: { nombre: string } | null }

function FormRespuesta({ pregunta, onListo }: { pregunta: PreguntaConAutor; onListo: () => void }) {
  const [respuesta, setRespuesta] = useState(pregunta.respuesta ?? '')
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          const { error } = await supabase
            .from('preguntas')
            .update({ respuesta: respuesta.trim(), respondida_en: new Date().toISOString(), respuesta_vista: false })
            .eq('id', pregunta.id)
          if (error) throw error
          // Sólo la primera respuesta avisa al teléfono; corregirla después no vuelve a notificar.
          if (!pregunta.respuesta) void notificar('respuesta', pregunta.id)
          onListo()
        })
      }}
    >
      <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <p className="text-sm text-stone-500">
          {pregunta.autor?.nombre ?? 'Cuenta eliminada'} · {diaCorto(pregunta.creada_en)}
        </p>
        <p className="mt-1 whitespace-pre-line text-stone-900">{pregunta.texto}</p>
      </div>
      <AreaTexto
        id="respuesta"
        etiqueta="Tu respuesta"
        required
        rows={6}
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
      />
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        textoGuardar={pregunta.respuesta ? 'Guardar' : 'Responder'}
        onEliminar={() => {
          if (!confirm('¿Eliminar esta pregunta? La persona ya no la verá.')) return
          void enviar(async () => {
            await borrarFila('preguntas', pregunta.id)
            onListo()
          })
        }}
      />
    </form>
  )
}

export function PreguntasAdmin() {
  const clienteConsultas = useQueryClient()
  const [vista, setVista] = useState<'pendientes' | 'respondidas'>('pendientes')
  const [abierta, setAbierta] = useState<PreguntaConAutor | null>(null)
  const { data: preguntas = [], isPending } = useQuery({
    queryKey: ['preguntas', 'admin'],
    queryFn: () =>
      datos<PreguntaConAutor[]>(
        supabase.from('preguntas').select('*, autor:perfiles(nombre)').order('creada_en', { ascending: false }),
      ),
  })
  const pendientes = preguntas.filter((p) => !p.respuesta)
  const visibles = vista === 'pendientes' ? pendientes : preguntas.filter((p) => p.respuesta)

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Preguntas" />
      <Segmentos
        opciones={[
          { valor: 'pendientes', texto: `Sin responder (${pendientes.length})` },
          { valor: 'respondidas', texto: 'Respondidas' },
        ]}
        valor={vista}
        onCambiar={setVista}
      />

      {isPending ? (
        <Cargando />
      ) : visibles.length === 0 ? (
        <Vacio>{vista === 'pendientes' ? 'No hay preguntas por responder.' : 'Todavía no has respondido preguntas.'}</Vacio>
      ) : (
        visibles.map((pregunta) => (
          <article key={pregunta.id} className="rounded-2xl bg-white p-5 shadow-tarjeta ring-1 ring-stone-200/80">
            <p className="font-medium text-stone-900">{pregunta.autor?.nombre ?? 'Cuenta eliminada'}</p>
            <p className="text-sm">
              {pregunta.grupo_id !== null && (
                <>
                  <Destino grupoId={pregunta.grupo_id} />
                  <span className="text-stone-500"> · </span>
                </>
              )}
              <span className="text-stone-500">{diaCorto(pregunta.creada_en)}</span>
            </p>
            <p className="mt-2 whitespace-pre-line text-stone-800">{pregunta.texto}</p>
            {pregunta.respuesta && (
              <div className="mt-3 rounded-xl bg-cielo-50 p-3 text-stone-700 ring-1 ring-cielo-100">
                <p className="whitespace-pre-line">{pregunta.respuesta}</p>
              </div>
            )}
            <Boton
              variante={pregunta.respuesta ? 'secundario' : 'primario'}
              className="mt-3 py-2.5"
              onClick={() => setAbierta(pregunta)}
            >
              {pregunta.respuesta ? 'Editar respuesta' : 'Responder'}
            </Boton>
          </article>
        ))
      )}

      {abierta && (
        <Hoja titulo="Responder" onCerrar={() => setAbierta(null)}>
          <FormRespuesta
            pregunta={abierta}
            onListo={() => {
              setAbierta(null)
              void clienteConsultas.invalidateQueries({ queryKey: ['preguntas'] })
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
