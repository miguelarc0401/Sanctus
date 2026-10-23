import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Cargando, EncabezadoAdmin, Vacio } from '../components/Bloques'
import { AreaTexto, Campo, MensajeError, PieFormulario, Selector } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { useGrupos } from '../grupos/contexto'
import { borrarFila, datos, guardarFila } from '../lib/consultas'
import { fechaLarga } from '../lib/fechas'
import { useCharlas, useEncuestas } from '../lib/participacion'
import { supabase } from '../lib/supabase'
import { COLUMNAS_TEMA, type Charla, type Tema } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'
import { GrupoDeTrabajo } from './comunes'

// Temas de las encuestas cerradas del grupo: primero los ganadores.
function useTemasVotados(grupoId: number | null) {
  const { data: encuestas = [] } = useEncuestas(grupoId)
  const cerradas = encuestas.filter((e) => e.fase === 'cerrada')
  const ids = cerradas.map((e) => e.id)
  const ganadores = new Set(cerradas.map((e) => e.tema_ganador_id))

  const { data: temas = [] } = useQuery({
    queryKey: ['temas', 'cerrados', grupoId, ids],
    enabled: ids.length > 0,
    queryFn: () => datos<Tema[]>(supabase.from('temas').select(COLUMNAS_TEMA).in('encuesta_id', ids)),
  })
  const titulo = (encuestaId: number) => cerradas.find((e) => e.id === encuestaId)?.titulo ?? ''
  return {
    ganadores: temas.filter((t) => ganadores.has(t.id)),
    otros: temas.filter((t) => !ganadores.has(t.id)),
    titulo,
  }
}

function FormCharla({
  grupoId,
  charla,
  siguienteOrden,
  onListo,
}: {
  grupoId: number
  charla: Charla | null
  siguienteOrden: number
  onListo: () => void
}) {
  const [titulo, setTitulo] = useState(charla?.titulo ?? '')
  const [objetivo, setObjetivo] = useState(charla?.objetivo ?? '')
  const [fecha, setFecha] = useState(charla?.fecha ?? '')
  const [temaVotado, setTemaVotado] = useState(charla?.tema_votado_id ? String(charla.tema_votado_id) : '')
  const { ganadores, otros, titulo: tituloEncuesta } = useTemasVotados(grupoId)
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          const valores = {
            titulo: titulo.trim(),
            objetivo: objetivo.trim() || null,
            fecha: fecha || null,
            tema_votado_id: temaVotado ? Number(temaVotado) : null,
          }
          await guardarFila(
            'charlas',
            charla?.id ?? null,
            charla ? valores : { ...valores, grupo_id: grupoId, orden: siguienteOrden },
          )
          onListo()
        })
      }}
    >
      <Campo
        id="titulo"
        etiqueta="Tema de la charla"
        placeholder="Por ejemplo: La Eucaristía"
        required
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <AreaTexto
        id="objetivo"
        etiqueta="Objetivo"
        ayuda="(opcional)"
        rows={3}
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
      />
      <Campo id="fecha" etiqueta="Fecha" ayuda="(opcional)" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      <Selector id="tema-votado" etiqueta="Tema votado para esta charla" value={temaVotado} onChange={(e) => setTemaVotado(e.target.value)}>
        <option value="">Por definir</option>
        {ganadores.length > 0 && (
          <optgroup label="Ganadores">
            {ganadores.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo} ({tituloEncuesta(t.encuesta_id)})
              </option>
            ))}
          </optgroup>
        )}
        {otros.length > 0 && (
          <optgroup label="Otros temas propuestos">
            {otros.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo} ({tituloEncuesta(t.encuesta_id)})
              </option>
            ))}
          </optgroup>
        )}
      </Selector>
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        onEliminar={
          charla
            ? () => {
                if (!confirm(`¿Quitar «${charla.titulo}» del temario?`)) return
                void enviar(async () => {
                  await borrarFila('charlas', charla.id)
                  onListo()
                })
              }
            : undefined
        }
      />
    </form>
  )
}

export function TemarioAdmin() {
  const clienteConsultas = useQueryClient()
  const { grupo } = useGrupos()
  const grupoId = grupo?.id ?? null
  const [editando, setEditando] = useState<Charla | 'nueva' | null>(null)
  const { data: charlas = [], isPending } = useCharlas(grupoId)
  const { guardando, error, enviar } = useEnvio()

  const recargar = () => void clienteConsultas.invalidateQueries({ queryKey: ['charlas'] })

  // Intercambia el lugar de dos charlas; se renumera todo para que el orden quede limpio.
  const mover = (desde: number, hacia: number) =>
    void enviar(async () => {
      const nuevas = [...charlas]
      ;[nuevas[desde], nuevas[hacia]] = [nuevas[hacia], nuevas[desde]]
      await Promise.all(
        nuevas.map((c, i) => (c.orden === i ? null : guardarFila('charlas', c.id, { orden: i }))).filter(Boolean),
      )
      recargar()
    })

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Temario" textoNuevo="Nueva charla" onNuevo={grupo ? () => setEditando('nueva') : undefined} />
      <GrupoDeTrabajo />

      {!grupo ? (
        <Vacio>Primero crea un grupo en el panel.</Vacio>
      ) : isPending ? (
        <Cargando />
      ) : charlas.length === 0 ? (
        <Vacio>El temario de este grupo está vacío. Agrega la primera charla.</Vacio>
      ) : (
        <ol className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          {charlas.map((charla, i) => (
            <li key={charla.id} className="flex items-center gap-2 py-2 pr-2 pl-4">
              <span className="w-6 shrink-0 font-serif text-xl font-semibold text-cielo-700">{i + 1}</span>
              <button onClick={() => setEditando(charla)} className="min-w-0 flex-1 py-1 text-left">
                <span className="block truncate text-stone-900">{charla.titulo}</span>
                <span className="block truncate text-sm text-stone-500">
                  {charla.fecha ? fechaLarga(charla.fecha) : 'Sin fecha'}
                  {charla.tema && ` · Votado: ${charla.tema.titulo}`}
                </span>
              </button>
              <div className="flex shrink-0 flex-col">
                <button
                  disabled={guardando || i === 0}
                  onClick={() => mover(i, i - 1)}
                  aria-label="Subir"
                  className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  disabled={guardando || i === charlas.length - 1}
                  onClick={() => mover(i, i + 1)}
                  aria-label="Bajar"
                  className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
              <Pencil className="size-4 shrink-0 text-stone-300" aria-hidden />
            </li>
          ))}
        </ol>
      )}
      {error && <MensajeError>{error}</MensajeError>}

      {editando && grupo && (
        <Hoja titulo={editando === 'nueva' ? 'Nueva charla' : 'Editar charla'} onCerrar={() => setEditando(null)}>
          <FormCharla
            grupoId={grupo.id}
            charla={editando === 'nueva' ? null : editando}
            siguienteOrden={charlas.length}
            onListo={() => {
              setEditando(null)
              recargar()
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
