import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Cargando, Tarjeta, Titulo, Vacio } from '../components/Bloques'
import { AreaTexto, Boton, MensajeError } from '../components/Formulario'
import { useGrupos } from '../grupos/contexto'
import { diaCorto } from '../lib/fechas'
import { useMisPreguntas } from '../lib/participacion'
import { supabase } from '../lib/supabase'
import { useEnvio } from '../lib/useEnvio'

export function Preguntas() {
  const clienteConsultas = useQueryClient()
  const { grupo } = useGrupos()
  const { data: preguntas = [], isPending } = useMisPreguntas()
  const [texto, setTexto] = useState('')
  const [enviada, setEnviada] = useState(false)
  const { guardando, error, enviar } = useEnvio()

  // Al abrir esta pantalla, las respuestas nuevas quedan como leídas.
  const hayNuevas = preguntas.some((p) => p.respuesta && !p.respuesta_vista)
  useEffect(() => {
    if (!hayNuevas) return
    void supabase.rpc('marcar_respuestas_vistas').then(() => {
      void clienteConsultas.invalidateQueries({ queryKey: ['preguntas'] })
    })
  }, [hayNuevas, clienteConsultas])

  return (
    <div className="space-y-5">
      <Link to="/mas" className="inline-flex items-center gap-1 text-sm text-cielo-700">
        <ArrowLeft className="size-4" aria-hidden /> Más
      </Link>
      <Titulo>Pregúntale al coordinador</Titulo>

      <Tarjeta>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void enviar(async () => {
              const { error } = await supabase.from('preguntas').insert({ texto: texto.trim(), grupo_id: grupo?.id ?? null })
              if (error) throw error
              setTexto('')
              setEnviada(true)
              void clienteConsultas.invalidateQueries({ queryKey: ['preguntas'] })
            })
          }}
        >
          <AreaTexto
            id="pregunta"
            etiqueta="Tu pregunta"
            required
            rows={4}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setEnviada(false)
            }}
          />
          <p className="flex items-center gap-1.5 text-sm text-stone-500">
            <Lock className="size-4 shrink-0" aria-hidden /> Sólo el coordinador la verá. Va con tu nombre.
          </p>
          {error && <MensajeError>{error}</MensajeError>}
          {enviada && <p className="text-sm font-medium text-emerald-700">¡Listo! Tu pregunta fue enviada.</p>}
          <Boton type="submit" disabled={guardando || !texto.trim()} className="w-full">
            {guardando ? 'Enviando…' : 'Enviar pregunta'}
          </Boton>
        </form>
      </Tarjeta>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">Mis preguntas</h2>
        {isPending ? (
          <Cargando />
        ) : preguntas.length === 0 ? (
          <Vacio>Todavía no has hecho preguntas.</Vacio>
        ) : (
          preguntas.map((pregunta) => (
            <article key={pregunta.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
              <p className="text-xs text-stone-500">{diaCorto(pregunta.creada_en)}</p>
              <p className="mt-1 whitespace-pre-line text-stone-900">{pregunta.texto}</p>
              {pregunta.respuesta ? (
                <div className="mt-3 rounded-xl bg-cielo-50 p-4 ring-1 ring-cielo-100">
                  <p className="text-sm font-medium text-cielo-800">Respuesta del coordinador</p>
                  <p className="mt-1 whitespace-pre-line text-stone-800">{pregunta.respuesta}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-oro-600">Esperando respuesta…</p>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  )
}
