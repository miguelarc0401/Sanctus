import { useQueryClient } from '@tanstack/react-query'
import { Clock, Lock, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Cargando, Encabezado, Tarjeta, TituloSeccion, Vacio } from '../components/Bloques'
import { AreaTexto, Boton, MensajeError, MensajeExito } from '../components/Formulario'
import { TextoConEnlaces } from '../components/TextoConEnlaces'
import { useGrupos } from '../grupos/contexto'
import { haceCuanto } from '../lib/fechas'
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
      <Encabezado
        titulo="Pregúntale al coordinador"
        descripcion="Lo que te inquiete, sobre la fe o sobre el grupo. Te responde en privado."
        volver={{ a: '/mas', texto: 'Más' }}
      />

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
          <p className="flex items-center gap-1.5 text-sm text-stone-600">
            <Lock className="size-4 shrink-0" aria-hidden /> Sólo el coordinador la verá. Va con tu nombre.
          </p>
          {error && <MensajeError>{error}</MensajeError>}
          {enviada && <MensajeExito>¡Listo! Tu pregunta fue enviada.</MensajeExito>}
          <Boton type="submit" disabled={guardando || !texto.trim()} className="w-full">
            {guardando ? 'Enviando…' : 'Enviar pregunta'}
          </Boton>
        </form>
      </Tarjeta>

      <section className="space-y-3">
        <TituloSeccion>Mis preguntas</TituloSeccion>
        {isPending ? (
          <Cargando />
        ) : preguntas.length === 0 ? (
          <Vacio Icono={MessageCircle}>Todavía no has hecho preguntas.</Vacio>
        ) : (
          <ul className="space-y-6">
            {preguntas.map((pregunta) => (
              // Como una conversación: tu pregunta a la derecha y la respuesta a la izquierda.
              <li key={pregunta.id} className="space-y-2">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-cielo-800 px-4 py-3 text-white shadow-sm">
                  <p className="sr-only">Tu pregunta:</p>
                  <p className="whitespace-pre-line wrap-break-word">{pregunta.texto}</p>
                  <p className="mt-1 text-right text-xs text-cielo-200">{haceCuanto(pregunta.creada_en)}</p>
                </div>
                {pregunta.respuesta ? (
                  <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-tarjeta ring-1 ring-stone-200/80">
                    <p className="text-xs font-semibold tracking-wide text-oro-700 uppercase">Respuesta del coordinador</p>
                    <TextoConEnlaces className="mt-1 text-stone-800">{pregunta.respuesta}</TextoConEnlaces>
                    {pregunta.respondida_en && <p className="mt-1 text-xs text-stone-500">{haceCuanto(pregunta.respondida_en)}</p>}
                  </div>
                ) : (
                  <p className="mr-auto inline-flex items-center gap-1.5 rounded-full bg-oro-50 px-3 py-1.5 text-sm text-oro-700 ring-1 ring-oro-400/40">
                    <Clock className="size-4" aria-hidden /> Esperando respuesta…
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
