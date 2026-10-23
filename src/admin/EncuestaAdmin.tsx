import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Plus, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Cargando, EtiquetaFase, Tarjeta, Titulo, Vacio } from '../components/Bloques'
import { BarrasDeResultados } from '../components/Encuestas'
import { AreaTexto, Boton, Campo, MensajeError, PieFormulario } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { borrarFila, datos, guardarFila } from '../lib/consultas'
import { notificar } from '../lib/notificaciones'
import { useResultados, useTemas } from '../lib/participacion'
import { supabase } from '../lib/supabase'
import type { Encuesta, Tema } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'

function FormTema({ encuestaId, tema, onListo }: { encuestaId: number; tema: Tema | null; onListo: () => void }) {
  const [titulo, setTitulo] = useState(tema?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(tema?.descripcion ?? '')
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          const valores = { titulo: titulo.trim(), descripcion: descripcion.trim() || null }
          await guardarFila('temas', tema?.id ?? null, tema ? valores : { ...valores, encuesta_id: encuestaId })
          onListo()
        })
      }}
    >
      <Campo id="titulo" etiqueta="Tema" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
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
          tema
            ? () => {
                if (!confirm(`¿Quitar el tema «${tema.titulo}»? También se borran sus votos.`)) return
                void enviar(async () => {
                  await borrarFila('temas', tema.id)
                  onListo()
                })
              }
            : undefined
        }
      />
    </form>
  )
}

function FormEncuesta({ encuesta, onListo, onBorrada }: { encuesta: Encuesta; onListo: () => void; onBorrada: () => void }) {
  const [titulo, setTitulo] = useState(encuesta.titulo)
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          await guardarFila('encuestas', encuesta.id, { titulo: titulo.trim() })
          onListo()
        })
      }}
    >
      <Campo id="titulo" etiqueta="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        onEliminar={() => {
          if (!confirm('¿Eliminar esta encuesta con todos sus temas y votos?')) return
          void enviar(async () => {
            await borrarFila('encuestas', encuesta.id)
            onBorrada()
          })
        }}
      />
    </form>
  )
}

// Botones para pasar de una fase a la siguiente.
function ControlDeFase({ encuesta, cuantosTemas, onCambio }: { encuesta: Encuesta; cuantosTemas: number; onCambio: () => void }) {
  const { guardando, error, enviar } = useEnvio()

  if (encuesta.fase === 'cerrada') return null

  const abrirVotacion = () => {
    if (cuantosTemas < 2) return alert('Hacen falta al menos 2 temas para votar.')
    if (!confirm('¿Abrir la votación? Ya no se podrán proponer más temas.')) return
    void enviar(async () => {
      await guardarFila('encuestas', encuesta.id, { fase: 'votacion' })
      void notificar('encuesta', encuesta.id)
      onCambio()
    })
  }

  const cerrar = () => {
    if (!confirm('¿Cerrar la votación? Todos verán los resultados y ya no se podrá votar.')) return
    void enviar(async () => {
      const { error } = await supabase.rpc('cerrar_encuesta', { encuesta: encuesta.id })
      if (error) throw error
      onCambio()
    })
  }

  return (
    <Tarjeta className="space-y-3">
      <p className="text-stone-700">
        {encuesta.fase === 'propuestas'
          ? 'Los miembros están proponiendo temas. Cuando haya suficientes, abre la votación.'
          : 'Los miembros están votando. Cuando termine el plazo, cierra la votación para ver qué tema ganó.'}
      </p>
      {error && <MensajeError>{error}</MensajeError>}
      <Boton className="w-full" disabled={guardando} onClick={encuesta.fase === 'propuestas' ? abrirVotacion : cerrar}>
        {encuesta.fase === 'propuestas' ? 'Abrir votación' : 'Cerrar votación y ver resultados'}
      </Boton>
    </Tarjeta>
  )
}

type Ventana = { tipo: 'encuesta' } | { tipo: 'tema'; tema: Tema | null }

export function EncuestaAdmin() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  const clienteConsultas = useQueryClient()
  const [ventana, setVentana] = useState<Ventana | null>(null)
  const { guardando, error, enviar } = useEnvio()

  const { data: encuesta, isPending } = useQuery({
    queryKey: ['encuestas', 'una', id],
    queryFn: () => datos<Encuesta | null>(supabase.from('encuestas').select('*').eq('id', id).maybeSingle()),
  })
  const { data: temas = [] } = useTemas(id)
  const { data: votos = new Map<number, number>() } = useResultados(id, true)
  const { data: autores = new Map<number, string>() } = useQuery({
    queryKey: ['temas', id, 'autores'],
    queryFn: async () => {
      const filas = await datos<{ tema_id: number; autor: string | null }[]>(
        supabase.rpc('autores_de_temas', { encuesta: id }),
      )
      return new Map(filas.map((f) => [f.tema_id, f.autor ?? 'Cuenta eliminada']))
    },
  })

  const recargar = () => {
    void clienteConsultas.invalidateQueries({ queryKey: ['encuestas'] })
    void clienteConsultas.invalidateQueries({ queryKey: ['temas', id] })
    void clienteConsultas.invalidateQueries({ queryKey: ['resultados', id] })
  }

  if (isPending) return <Cargando />
  if (!encuesta) return <Vacio>Esta encuesta ya no existe.</Vacio>

  const totalVotos = [...votos.values()].reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-5">
      <Link to="/admin/encuestas" className="inline-flex items-center gap-1 text-sm text-cielo-700">
        <ArrowLeft className="size-4" aria-hidden /> Encuestas
      </Link>
      <div className="flex items-start justify-between gap-3">
        <Titulo>{encuesta.titulo}</Titulo>
        <button
          onClick={() => setVentana({ tipo: 'encuesta' })}
          aria-label="Editar encuesta"
          className="mt-2 rounded-full p-2 text-stone-500 hover:bg-stone-200"
        >
          <Pencil className="size-5" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <EtiquetaFase fase={encuesta.fase} />
        <span className="text-sm text-stone-500">
          {temas.length} temas · {totalVotos} {totalVotos === 1 ? 'voto' : 'votos'}
        </span>
      </div>

      <ControlDeFase encuesta={encuesta} cuantosTemas={temas.length} onCambio={recargar} />

      {encuesta.fase !== 'propuestas' && temas.length > 0 && (
        <Tarjeta>
          <h2 className="mb-3 font-medium text-cielo-800">Resultados {encuesta.fase === 'votacion' && '(sólo tú los ves)'}</h2>
          <BarrasDeResultados temas={temas} votos={votos} ganadorId={encuesta.tema_ganador_id} />
        </Tarjeta>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">Temas propuestos</h2>
          {encuesta.fase !== 'cerrada' && (
            <button
              onClick={() => setVentana({ tipo: 'tema', tema: null })}
              className="inline-flex items-center gap-1 text-sm font-medium text-cielo-700"
            >
              <Plus className="size-4" aria-hidden /> Agregar
            </button>
          )}
        </div>
        {error && <MensajeError>{error}</MensajeError>}
        {temas.length === 0 ? (
          <Vacio>Todavía nadie ha propuesto temas.</Vacio>
        ) : (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
            {temas.map((tema) => {
              const gano = tema.id === encuesta.tema_ganador_id
              return (
                <li key={tema.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className={`flex items-center gap-1.5 ${gano ? 'font-semibold text-cielo-800' : 'text-stone-900'}`}>
                      {gano && <Trophy className="size-4 shrink-0 text-oro-500" aria-label="Ganador" />}
                      {tema.titulo}
                    </p>
                    {tema.descripcion && <p className="text-sm text-stone-600">{tema.descripcion}</p>}
                    <p className="text-sm text-stone-500">
                      Propuso: {autores.get(tema.id) ?? '…'} · {votos.get(tema.id) ?? 0} votos
                    </p>
                    {encuesta.fase === 'cerrada' && !gano && (
                      <button
                        disabled={guardando}
                        onClick={() =>
                          void enviar(async () => {
                            await guardarFila('encuestas', encuesta.id, { tema_ganador_id: tema.id })
                            recargar()
                          })
                        }
                        className="mt-1 text-sm font-medium text-cielo-700"
                      >
                        Elegir como ganador
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setVentana({ tipo: 'tema', tema })}
                    aria-label={`Editar «${tema.titulo}»`}
                    className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                  >
                    <Pencil className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {ventana?.tipo === 'encuesta' && (
        <Hoja titulo="Editar encuesta" onCerrar={() => setVentana(null)}>
          <FormEncuesta
            encuesta={encuesta}
            onListo={() => {
              setVentana(null)
              recargar()
            }}
            onBorrada={() => {
              void clienteConsultas.invalidateQueries({ queryKey: ['encuestas'] })
              navegar('/admin/encuestas', { replace: true })
            }}
          />
        </Hoja>
      )}
      {ventana?.tipo === 'tema' && (
        <Hoja titulo={ventana.tema ? 'Editar tema' : 'Agregar tema'} onCerrar={() => setVentana(null)}>
          <FormTema
            encuestaId={encuesta.id}
            tema={ventana.tema}
            onListo={() => {
              setVentana(null)
              recargar()
              void clienteConsultas.invalidateQueries({ queryKey: ['temas', id, 'autores'] })
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
