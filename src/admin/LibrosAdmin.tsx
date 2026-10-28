import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, FileText, Images, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Cargando, EncabezadoAdmin, Vacio } from '../components/Bloques'
import { AreaTexto, Campo, Casilla, MensajeError, PieFormulario } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { nombreDeGrupo, useGrupos } from '../grupos/contexto'
import { datos, guardarFila } from '../lib/consultas'
import { unirImagenes } from '../lib/imagenesPdf'
import { LIMITE_MB, urlPortada, type Libro } from '../lib/libros'
import { abrirPdf, portadaDe } from '../lib/pdf'
import { supabase } from '../lib/supabase'
import { useEnvio } from '../lib/useEnvio'

type LibroConGrupos = Libro & { libros_grupos: { grupo_id: number }[] }

const sinExtension = (nombre: string) => nombre.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()

// Lo que el administrador eligió subir: un PDF o varias imágenes que se unirán en uno.
function describirArchivos(archivos: File[]) {
  if (archivos.length === 0) return null
  const pdfs = archivos.filter((a) => a.type === 'application/pdf')
  const imagenes = archivos.filter((a) => a.type.startsWith('image/'))
  if (pdfs.length === 1 && archivos.length === 1) return { tipo: 'pdf' as const, archivos: pdfs }
  if (imagenes.length === archivos.length) {
    return { tipo: 'imagenes' as const, archivos: [...imagenes].sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })) }
  }
  return { tipo: 'error' as const, archivos }
}

function CasillasDeGrupos({ elegidos, onCambiar }: { elegidos: number[]; onCambiar: (ids: number[]) => void }) {
  const { grupos } = useGrupos()
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-1.5 text-sm font-medium text-stone-700">Compartir con</legend>
      {grupos.map((grupo) => (
        <Casilla
          key={grupo.id}
          id={`grupo-${grupo.id}`}
          etiqueta={nombreDeGrupo(grupo)}
          checked={elegidos.includes(grupo.id)}
          onChange={(e) => onCambiar(e.target.checked ? [...elegidos, grupo.id] : elegidos.filter((id) => id !== grupo.id))}
        />
      ))}
    </fieldset>
  )
}

function FormNuevoLibro({ onListo }: { onListo: () => void }) {
  const { grupo } = useGrupos()
  const [seleccion, setSeleccion] = useState<File[]>([])
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [grupos, setGrupos] = useState<number[]>(grupo ? [grupo.id] : [])
  const [paso, setPaso] = useState<string | null>(null)
  const { guardando, error, enviar } = useEnvio()
  const elegido = describirArchivos(seleccion)

  async function subir() {
    if (!elegido || elegido.tipo === 'error') throw new Error('Elige un PDF o varias imágenes.')
    setPaso(elegido.tipo === 'imagenes' ? 'Uniendo las imágenes en un PDF…' : 'Leyendo el PDF…')
    const bytes =
      elegido.tipo === 'imagenes'
        ? await unirImagenes(elegido.archivos)
        : new Uint8Array(await elegido.archivos[0].arrayBuffer())
    if (bytes.byteLength > LIMITE_MB * 1024 * 1024) {
      throw new Error(`El archivo pesa más de ${LIMITE_MB} MB. Intenta reducirlo antes de subirlo.`)
    }

    setPaso('Preparando la portada…')
    // PDF.js se queda con los datos que recibe, por eso se le pasa una copia.
    const { pdf, cerrar } = await abrirPdf(bytes.slice())
    const portada = await portadaDe(pdf)
    const paginas = pdf.numPages
    await cerrar()

    const nombre = crypto.randomUUID()
    const archivo = `${nombre}.pdf`
    const rutaPortada = `${nombre}.webp`
    setPaso('Subiendo el libro…')
    // cacheControl 0: que ningún navegador guarde el libro en su caché.
    const subida = await supabase.storage
      .from('libros')
      .upload(archivo, bytes, { contentType: 'application/pdf', cacheControl: '0' })
    if (subida.error) throw subida.error
    try {
      await supabase.storage.from('portadas').upload(rutaPortada, portada, { contentType: 'image/webp' })
      setPaso('Guardando…')
      const { id } = await datos<{ id: number }>(
        supabase
          .from('libros')
          .insert({
            titulo: titulo.trim(),
            autor: autor.trim() || null,
            descripcion: descripcion.trim() || null,
            archivo,
            portada: rutaPortada,
            num_paginas: paginas,
          })
          .select('id')
          .single(),
      )
      if (grupos.length > 0) {
        const { error } = await supabase.from('libros_grupos').insert(grupos.map((grupo_id) => ({ libro_id: id, grupo_id })))
        if (error) throw error
      }
    } catch (e) {
      // Si algo falló después de subir, no se deja el archivo huérfano.
      await supabase.storage.from('libros').remove([archivo])
      await supabase.storage.from('portadas').remove([rutaPortada])
      throw e
    }
    onListo()
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(async () => {
          try {
            await subir()
          } finally {
            setPaso(null)
          }
        })
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="archivo" className="block text-sm font-medium text-stone-700">
          Archivo
        </label>
        <input
          id="archivo"
          type="file"
          accept="application/pdf,image/*"
          multiple
          required
          onChange={(e) => {
            const archivos = [...(e.target.files ?? [])]
            setSeleccion(archivos)
            // Con un PDF, su nombre sirve de título; con fotos sueltas, no.
            if (!titulo && archivos.length === 1 && archivos[0].type === 'application/pdf') {
              setTitulo(sinExtension(archivos[0].name))
            }
          }}
          className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-xl file:border-0 file:bg-cielo-100 file:px-4 file:py-2.5 file:font-medium file:text-cielo-800"
        />
        <p className="text-sm text-stone-500">
          Un PDF, o varias fotos o imágenes de las páginas (se unen en un PDF). ¿Tienes un Word? Ábrelo y usa
          «Archivo → Guardar como → PDF». Máximo {LIMITE_MB} MB.
        </p>
      </div>

      {elegido?.tipo === 'pdf' && (
        <p className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-stone-200">
          <FileText className="size-4 shrink-0 text-cielo-700" aria-hidden />
          {elegido.archivos[0].name} · {(elegido.archivos[0].size / 1024 / 1024).toFixed(1)} MB
        </p>
      )}
      {elegido?.tipo === 'imagenes' && (
        <div className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-stone-200">
          <p className="flex items-center gap-2 font-medium text-stone-800">
            <Images className="size-4 text-cielo-700" aria-hidden /> {elegido.archivos.length} imágenes, en este orden:
          </p>
          <ol className="mt-1 max-h-32 list-decimal overflow-y-auto pl-6 text-stone-600">
            {elegido.archivos.map((a) => (
              <li key={a.name}>{a.name}</li>
            ))}
          </ol>
        </div>
      )}
      {elegido?.tipo === 'error' && <MensajeError>Elige un solo PDF, o sólo imágenes.</MensajeError>}

      <Campo id="titulo" etiqueta="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <Campo id="autor" etiqueta="Autor" ayuda="(opcional)" value={autor} onChange={(e) => setAutor(e.target.value)} />
      <AreaTexto
        id="descripcion"
        etiqueta="Descripción"
        ayuda="(opcional)"
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      <CasillasDeGrupos elegidos={grupos} onCambiar={setGrupos} />
      {paso && <p className="animate-pulse text-sm font-medium text-cielo-700">{paso}</p>}
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario guardando={guardando} textoGuardar="Subir libro" />
    </form>
  )
}

function FormEditarLibro({ libro, onListo }: { libro: LibroConGrupos; onListo: () => void }) {
  const actuales = libro.libros_grupos.map((g) => g.grupo_id)
  const [titulo, setTitulo] = useState(libro.titulo)
  const [autor, setAutor] = useState(libro.autor ?? '')
  const [descripcion, setDescripcion] = useState(libro.descripcion ?? '')
  const [grupos, setGrupos] = useState(actuales)
  const { guardando, error, enviar } = useEnvio()

  async function guardar() {
    await guardarFila('libros', libro.id, {
      titulo: titulo.trim(),
      autor: autor.trim() || null,
      descripcion: descripcion.trim() || null,
    })
    const agregar = grupos.filter((id) => !actuales.includes(id))
    const quitar = actuales.filter((id) => !grupos.includes(id))
    if (agregar.length > 0) {
      const { error } = await supabase.from('libros_grupos').insert(agregar.map((grupo_id) => ({ libro_id: libro.id, grupo_id })))
      if (error) throw error
    }
    if (quitar.length > 0) {
      const { error } = await supabase.from('libros_grupos').delete().eq('libro_id', libro.id).in('grupo_id', quitar)
      if (error) throw error
    }
    onListo()
  }

  async function eliminar() {
    const { error } = await supabase.from('libros').delete().eq('id', libro.id)
    if (error) throw error
    await supabase.storage.from('libros').remove([libro.archivo])
    if (libro.portada) await supabase.storage.from('portadas').remove([libro.portada])
    onListo()
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar(guardar)
      }}
    >
      <p className="text-sm text-stone-500">{libro.num_paginas} páginas</p>
      <Campo id="titulo" etiqueta="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <Campo id="autor" etiqueta="Autor" ayuda="(opcional)" value={autor} onChange={(e) => setAutor(e.target.value)} />
      <AreaTexto
        id="descripcion"
        etiqueta="Descripción"
        ayuda="(opcional)"
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      <CasillasDeGrupos elegidos={grupos} onCambiar={setGrupos} />
      {grupos.length === 0 && <p className="text-sm text-oro-700">Sin grupos, nadie más que tú podrá leerlo.</p>}
      {error && <MensajeError>{error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        onEliminar={() => {
          if (!confirm(`¿Eliminar «${libro.titulo}»? También se borran las notas y subrayados que cada quien hizo en él.`)) return
          void enviar(eliminar)
        }}
      />
    </form>
  )
}

export function LibrosAdmin() {
  const clienteConsultas = useQueryClient()
  const { grupos } = useGrupos()
  const [editando, setEditando] = useState<LibroConGrupos | 'nuevo' | null>(null)
  const { data: libros = [], isPending } = useQuery({
    queryKey: ['libros', 'admin'],
    queryFn: () => datos<LibroConGrupos[]>(supabase.from('libros').select('*, libros_grupos(grupo_id)').order('titulo')),
  })

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Biblioteca" textoNuevo="Subir libro" onNuevo={() => setEditando('nuevo')} />

      {isPending ? (
        <Cargando />
      ) : libros.length === 0 ? (
        <Vacio>Todavía no has subido libros.</Vacio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-tarjeta ring-1 ring-stone-200/80">
          {libros.map((libro) => {
            const portada = urlPortada(libro.portada)
            const nombres = libro.libros_grupos
              .map((g) => grupos.find((x) => x.id === g.grupo_id)?.santo.nombre)
              .filter(Boolean)
            return (
              <li key={libro.id}>
                <button onClick={() => setEditando(libro)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cielo-50">
                  {portada ? (
                    <img src={portada} alt="" crossOrigin="anonymous" className="h-16 w-12 shrink-0 rounded object-cover ring-1 ring-stone-200" />
                  ) : (
                    <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded bg-cielo-100 text-cielo-700">
                      <BookOpen className="size-5" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-stone-900">{libro.titulo}</span>
                    {libro.autor && <span className="block truncate text-sm text-stone-500">{libro.autor}</span>}
                    <span className="block truncate text-sm text-stone-500">
                      {nombres.length > 0 ? nombres.join(' · ') : 'Sin compartir'}
                    </span>
                  </span>
                  <Pencil className="size-4 shrink-0 text-stone-400" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {editando && (
        <Hoja titulo={editando === 'nuevo' ? 'Subir libro' : 'Editar libro'} onCerrar={() => setEditando(null)}>
          {editando === 'nuevo' ? (
            <FormNuevoLibro
              onListo={() => {
                setEditando(null)
                void clienteConsultas.invalidateQueries({ queryKey: ['libros'] })
              }}
            />
          ) : (
            <FormEditarLibro
              libro={editando}
              onListo={() => {
                setEditando(null)
                void clienteConsultas.invalidateQueries({ queryKey: ['libros'] })
              }}
            />
          )}
        </Hoja>
      )}
    </div>
  )
}
