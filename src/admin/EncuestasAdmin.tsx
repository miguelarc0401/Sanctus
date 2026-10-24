import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Cargando, EncabezadoAdmin, EtiquetaFase, Vacio } from '../components/Bloques'
import { Campo, MensajeError, PieFormulario } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { useGrupos } from '../grupos/contexto'
import { datos } from '../lib/consultas'
import { diaCorto } from '../lib/fechas'
import { notificar } from '../lib/notificaciones'
import { useEncuestas } from '../lib/participacion'
import { supabase } from '../lib/supabase'
import { useEnvio } from '../lib/useEnvio'
import { GrupoDeTrabajo } from './comunes'

function FormNuevaEncuesta({ grupoId, onCreada }: { grupoId: number; onCreada: (id: number) => void }) {
  const [titulo, setTitulo] = useState('')
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          const { id } = await datos<{ id: number }>(
            supabase.from('encuestas').insert({ grupo_id: grupoId, titulo: titulo.trim() }).select('id').single(),
          )
          onCreada(id)
        })
      }}
    >
      <p className="text-sm text-stone-600">
        La encuesta empieza recibiendo propuestas de temas. Cuando quieras, abres la votación y, al final, la cierras
        para ver qué tema ganó.
      </p>
      <Campo
        id="titulo"
        etiqueta="Título"
        placeholder="Por ejemplo: Temas para noviembre"
        required
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario guardando={guardando} textoGuardar="Crear encuesta" />
    </form>
  )
}

export function EncuestasAdmin() {
  const clienteConsultas = useQueryClient()
  const navegar = useNavigate()
  const { grupo } = useGrupos()
  const [creando, setCreando] = useState(false)
  const { data: encuestas = [], isPending } = useEncuestas(grupo?.id ?? null)

  return (
    <div className="space-y-5">
      <EncabezadoAdmin
        titulo="Encuestas"
        textoNuevo="Nueva encuesta"
        onNuevo={grupo ? () => setCreando(true) : undefined}
      />
      <GrupoDeTrabajo />

      {!grupo ? (
        <Vacio>Primero crea un grupo en el panel.</Vacio>
      ) : isPending ? (
        <Cargando />
      ) : encuestas.length === 0 ? (
        <Vacio>Este grupo todavía no tiene encuestas.</Vacio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-tarjeta ring-1 ring-stone-200/80">
          {encuestas.map((encuesta) => (
            <li key={encuesta.id}>
              <Link to={`/admin/encuestas/${encuesta.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 transition hover:bg-cielo-50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-stone-900">{encuesta.titulo}</span>
                  <span className="text-sm text-stone-500">{diaCorto(encuesta.creada_en)}</span>
                </span>
                <EtiquetaFase fase={encuesta.fase} />
                <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creando && grupo && (
        <Hoja titulo="Nueva encuesta" onCerrar={() => setCreando(false)}>
          <FormNuevaEncuesta
            grupoId={grupo.id}
            onCreada={(id) => {
              void notificar('encuesta', id)
              void clienteConsultas.invalidateQueries({ queryKey: ['encuestas'] })
              navegar(`/admin/encuestas/${id}`)
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
