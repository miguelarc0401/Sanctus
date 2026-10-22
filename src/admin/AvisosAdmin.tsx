import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Pin } from 'lucide-react'
import { useState } from 'react'
import { Cargando, EncabezadoAdmin, Vacio } from '../components/Bloques'
import { AreaTexto, Campo, Casilla, MensajeError, PieFormulario } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { borrarFila, datos, guardarFila } from '../lib/consultas'
import { diaCorto } from '../lib/fechas'
import { supabase } from '../lib/supabase'
import type { Aviso } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'
import { Destino, SelectorDeDestino } from './comunes'

function FormAviso({ aviso, onListo }: { aviso: Aviso | null; onListo: () => void }) {
  const [titulo, setTitulo] = useState(aviso?.titulo ?? '')
  const [texto, setTexto] = useState(aviso?.texto ?? '')
  const [destino, setDestino] = useState(aviso?.grupo_id ? String(aviso.grupo_id) : '')
  const [fijado, setFijado] = useState(aviso?.fijado ?? false)
  const { guardando, error, enviar } = useEnvio()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          await guardarFila('avisos', aviso?.id ?? null, {
            titulo: titulo.trim(),
            texto: texto.trim(),
            grupo_id: destino ? Number(destino) : null,
            fijado,
          })
          onListo()
        })
      }}
    >
      <Campo id="titulo" etiqueta="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <AreaTexto id="texto" etiqueta="Aviso" required rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <SelectorDeDestino valor={destino} onCambiar={setDestino} />
      <Casilla
        id="fijado"
        etiqueta="Fijar arriba (se muestra antes que los demás)"
        checked={fijado}
        onChange={(e) => setFijado(e.target.checked)}
      />
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        textoGuardar={aviso ? 'Guardar' : 'Publicar'}
        onEliminar={
          aviso
            ? () => {
                if (!confirm('¿Eliminar este aviso?')) return
                void enviar(async () => {
                  await borrarFila('avisos', aviso.id)
                  onListo()
                })
              }
            : undefined
        }
      />
    </form>
  )
}

export function AvisosAdmin() {
  const clienteConsultas = useQueryClient()
  const [editando, setEditando] = useState<Aviso | 'nuevo' | null>(null)
  const { data: avisos = [], isPending } = useQuery({
    queryKey: ['avisos', 'admin'],
    queryFn: () => datos<Aviso[]>(supabase.from('avisos').select('*').order('publicado_en', { ascending: false })),
  })

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Avisos" textoNuevo="Nuevo aviso" onNuevo={() => setEditando('nuevo')} />

      {isPending ? (
        <Cargando />
      ) : avisos.length === 0 ? (
        <Vacio>Todavía no hay avisos.</Vacio>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          {avisos.map((aviso) => (
            <li key={aviso.id}>
              <button
                onClick={() => setEditando(aviso)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cielo-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-stone-900">
                    {aviso.fijado && <Pin className="size-4 shrink-0 text-oro-500" aria-label="Fijado" />}
                    <span className="truncate">{aviso.titulo}</span>
                  </span>
                  <span className="block">
                    <Destino grupoId={aviso.grupo_id} />
                    <span className="text-sm text-stone-400"> · {diaCorto(aviso.publicado_en)}</span>
                  </span>
                </span>
                <Pencil className="size-4 shrink-0 text-stone-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <Hoja titulo={editando === 'nuevo' ? 'Nuevo aviso' : 'Editar aviso'} onCerrar={() => setEditando(null)}>
          <FormAviso
            aviso={editando === 'nuevo' ? null : editando}
            onListo={() => {
              setEditando(null)
              void clienteConsultas.invalidateQueries({ queryKey: ['avisos'] })
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
