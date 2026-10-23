import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, MessagesSquare, Vote } from 'lucide-react'
import { useState } from 'react'
import { Cargando, EtiquetaFase, Segmentos, Tarjeta, Titulo, Vacio } from '../components/Bloques'
import { BarrasDeResultados } from '../components/Encuestas'
import { AreaTexto, Boton, Campo, MensajeError } from '../components/Formulario'
import { useGrupos } from '../grupos/contexto'
import { fechaLarga, hoyISO } from '../lib/fechas'
import { useCharlas, useEncuestas, useMiVoto, useResultados, useTemas } from '../lib/participacion'
import { supabase } from '../lib/supabase'
import type { Encuesta, Tema } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'

function ListaDeTemas({ temas }: { temas: Tema[] }) {
  if (temas.length === 0) return <p className="text-sm text-stone-500">Todavía nadie ha propuesto temas.</p>
  return (
    <ul className="space-y-2">
      {temas.map((tema) => (
        <li key={tema.id} className="rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
          <p className="text-stone-900">{tema.titulo}</p>
          {tema.descripcion && <p className="mt-0.5 text-sm text-stone-600">{tema.descripcion}</p>}
        </li>
      ))}
    </ul>
  )
}

function Proponer({ encuesta, temas }: { encuesta: Encuesta; temas: Tema[] }) {
  const clienteConsultas = useQueryClient()
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [listo, setListo] = useState(false)
  const { guardando, error, enviar } = useEnvio({
    sinPermiso: 'Ya propusiste 3 temas en esta encuesta, o las propuestas ya se cerraron.',
  })

  return (
    <div className="space-y-4">
      <p className="text-stone-700">¿Qué tema te gustaría ver en las charlas? Puedes proponer hasta 3.</p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void enviar(async () => {
            const { error } = await supabase
              .from('temas')
              .insert({ encuesta_id: encuesta.id, titulo: titulo.trim(), descripcion: descripcion.trim() || null })
            if (error) throw error
            setTitulo('')
            setDescripcion('')
            setListo(true)
            void clienteConsultas.invalidateQueries({ queryKey: ['temas', encuesta.id] })
          })
        }}
      >
        <Campo
          id={`tema-${encuesta.id}`}
          etiqueta="Tema"
          required
          maxLength={120}
          value={titulo}
          onChange={(e) => {
            setTitulo(e.target.value)
            setListo(false)
          }}
        />
        <AreaTexto
          id={`detalle-${encuesta.id}`}
          etiqueta="¿Por qué te interesa?"
          ayuda="(opcional)"
          rows={2}
          maxLength={300}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        {error && <MensajeError>{error}</MensajeError>}
        {listo && <p className="text-sm font-medium text-emerald-700">¡Gracias! Tu tema quedó propuesto.</p>}
        <Boton type="submit" disabled={guardando || !titulo.trim()} className="w-full">
          {guardando ? 'Enviando…' : 'Proponer tema'}
        </Boton>
      </form>
      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">Temas propuestos ({temas.length})</p>
        <ListaDeTemas temas={temas} />
      </div>
    </div>
  )
}

function Votar({ encuesta, temas }: { encuesta: Encuesta; temas: Tema[] }) {
  const clienteConsultas = useQueryClient()
  const { data: miVoto, isPending } = useMiVoto(encuesta.id, true)
  const [elegido, setElegido] = useState<number | null>(null)
  const { guardando, error, enviar } = useEnvio({ duplicado: 'Ya votaste en esta encuesta.' })

  if (isPending) return <Cargando />

  if (miVoto) {
    const tema = temas.find((t) => t.id === miVoto)
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            Votaste por <strong>«{tema?.titulo}»</strong>. Verás los resultados cuando el coordinador cierre la votación.
          </span>
        </p>
        <ListaDeTemas temas={temas} />
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const tema = temas.find((t) => t.id === elegido)
        if (!tema || !confirm(`¿Votar por «${tema.titulo}»? Tu voto no se puede cambiar.`)) return
        void enviar(async () => {
          const { error } = await supabase.from('votos').insert({ encuesta_id: encuesta.id, tema_id: tema.id })
          if (error) throw error
          void clienteConsultas.invalidateQueries({ queryKey: ['votos', encuesta.id] })
        })
      }}
    >
      <p className="text-stone-700">Elige el tema que más te gustaría ver. Sólo puedes votar una vez.</p>
      <fieldset className="space-y-2">
        <legend className="sr-only">Temas</legend>
        {temas.map((tema) => (
          <label
            key={tema.id}
            className={`flex cursor-pointer gap-3 rounded-xl px-4 py-3 ring-1 transition ${
              elegido === tema.id ? 'bg-cielo-50 ring-2 ring-cielo-600' : 'bg-white ring-stone-200 hover:bg-stone-50'
            }`}
          >
            <input
              type="radio"
              name={`voto-${encuesta.id}`}
              className="mt-1 size-4 accent-cielo-800"
              checked={elegido === tema.id}
              onChange={() => setElegido(tema.id)}
            />
            <span>
              <span className="block text-stone-900">{tema.titulo}</span>
              {tema.descripcion && <span className="block text-sm text-stone-600">{tema.descripcion}</span>}
            </span>
          </label>
        ))}
      </fieldset>
      {error && <MensajeError>{error}</MensajeError>}
      <Boton type="submit" disabled={guardando || elegido === null} className="w-full">
        {guardando ? 'Votando…' : 'Votar'}
      </Boton>
    </form>
  )
}

function Resultados({ encuesta, temas }: { encuesta: Encuesta; temas: Tema[] }) {
  const { data: votos, isPending } = useResultados(encuesta.id, true)
  if (isPending || !votos) return <Cargando />
  if (temas.length === 0) return <p className="text-sm text-stone-500">No hubo temas en esta encuesta.</p>
  return <BarrasDeResultados temas={temas} votos={votos} ganadorId={encuesta.tema_ganador_id} />
}

function TarjetaEncuesta({ encuesta }: { encuesta: Encuesta }) {
  const { data: temas = [], isPending } = useTemas(encuesta.id)

  return (
    <Tarjeta className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-cielo-800">{encuesta.titulo}</h2>
        <EtiquetaFase fase={encuesta.fase} />
      </div>
      {isPending ? (
        <Cargando />
      ) : encuesta.fase === 'propuestas' ? (
        <Proponer encuesta={encuesta} temas={temas} />
      ) : encuesta.fase === 'votacion' ? (
        <Votar encuesta={encuesta} temas={temas} />
      ) : (
        <Resultados encuesta={encuesta} temas={temas} />
      )}
    </Tarjeta>
  )
}

function Votaciones({ grupoId }: { grupoId: number }) {
  const { data: encuestas = [], isPending } = useEncuestas(grupoId)
  if (isPending) return <Cargando />
  if (encuestas.length === 0) return <Vacio>Todavía no hay votaciones en tu grupo.</Vacio>
  return (
    <div className="space-y-4">
      {encuestas.map((encuesta) => (
        <TarjetaEncuesta key={encuesta.id} encuesta={encuesta} />
      ))}
    </div>
  )
}

function Temario({ grupoId }: { grupoId: number }) {
  const { data: charlas = [], isPending } = useCharlas(grupoId)
  const hoy = hoyISO()
  const proxima = charlas.find((c) => c.fecha && c.fecha >= hoy)

  if (isPending) return <Cargando />
  if (charlas.length === 0) return <Vacio>Todavía no hay charlas en el temario.</Vacio>

  return (
    <ol className="space-y-4">
      {charlas.map((charla, i) => (
        <li key={charla.id}>
          <Tarjeta className={charla === proxima ? 'ring-2 ring-oro-400' : ''}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-cielo-700">Charla {i + 1}</span>
              {charla.fecha && <span className="text-stone-500">· {fechaLarga(charla.fecha)}</span>}
              {charla === proxima && (
                <span className="rounded-full bg-oro-400/25 px-2 py-0.5 text-xs font-medium text-oro-600">Próxima</span>
              )}
            </div>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-cielo-800">{charla.titulo}</h2>
            {charla.objetivo && <p className="mt-1 whitespace-pre-line text-stone-700">{charla.objetivo}</p>}
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <ClipboardList className="mt-0.5 size-4 shrink-0 text-cielo-600" aria-hidden />
                <span>Tema de la charla</span>
              </li>
              <li className="flex items-start gap-2">
                <Vote className="mt-0.5 size-4 shrink-0 text-oro-500" aria-hidden />
                <span>
                  <span className="text-stone-500">Tema que votaron: </span>
                  {charla.tema?.titulo ?? <span className="text-stone-400">por definir</span>}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MessagesSquare className="mt-0.5 size-4 shrink-0 text-cielo-600" aria-hidden />
                <span>Preguntas y comentarios</span>
              </li>
            </ul>
          </Tarjeta>
        </li>
      ))}
    </ol>
  )
}

export function Temas() {
  const { grupo } = useGrupos()
  const [vista, setVista] = useState<'votaciones' | 'temario'>('votaciones')

  return (
    <div className="space-y-5">
      <Titulo>Temas</Titulo>
      <Segmentos
        opciones={[
          { valor: 'votaciones', texto: 'Votaciones' },
          { valor: 'temario', texto: 'Temario' },
        ]}
        valor={vista}
        onCambiar={setVista}
      />
      {!grupo ? (
        <Vacio>Cuando pertenezcas a un grupo, aquí podrás proponer temas, votar y ver el temario.</Vacio>
      ) : vista === 'votaciones' ? (
        <Votaciones grupoId={grupo.id} />
      ) : (
        <Temario grupoId={grupo.id} />
      )}
    </div>
  )
}
