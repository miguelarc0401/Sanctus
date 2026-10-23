import { useQuery } from '@tanstack/react-query'
import { Bookmark, Highlighter, Quote, StickyNote, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/contexto'
import { datos } from './consultas'
import { clave, supabase, url } from './supabase'

export type Libro = {
  id: number
  titulo: string
  autor: string | null
  descripcion: string | null
  archivo: string
  portada: string | null
  num_paginas: number
  creado_en: string
}

export type TipoAnotacion = 'subrayado' | 'frase' | 'nota' | 'marcador'

// Rectángulo en proporción de la página (0 a 1).
export type Rect = { x: number; y: number; w: number; h: number }

export type Anotacion = {
  id: number
  libro_id: number
  pagina: number
  tipo: TipoAnotacion
  texto: string | null
  posicion: Rect[] | null
  nota: string | null
  creada_en: string
}

export type NotaConLibro = Anotacion & { libro: { titulo: string } }

export const ICONOS_ANOTACION: Record<TipoAnotacion, LucideIcon> = {
  frase: Quote,
  nota: StickyNote,
  subrayado: Highlighter,
  marcador: Bookmark,
}

export const LIMITE_MB = 50

export function urlPortada(ruta: string | null) {
  return ruta ? supabase.storage.from('portadas').getPublicUrl(ruta).data.publicUrl : null
}

// Libros compartidos con un grupo.
export function useLibros(grupoId: number | null) {
  return useQuery({
    queryKey: ['libros', grupoId],
    enabled: grupoId !== null,
    queryFn: () =>
      datos<Libro[]>(
        supabase
          .from('libros')
          .select('id, titulo, autor, descripcion, archivo, portada, num_paginas, creado_en, libros_grupos!inner(grupo_id)')
          .eq('libros_grupos.grupo_id', grupoId!)
          .order('titulo'),
      ),
  })
}

export function useLibro(id: number) {
  return useQuery({
    queryKey: ['libros', 'uno', id],
    queryFn: () => datos<Libro | null>(supabase.from('libros').select('*').eq('id', id).maybeSingle()),
  })
}

// Página en la que se quedó la persona en cada libro.
export function useProgreso() {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['progreso', perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const filas = await datos<{ libro_id: number; pagina: number }[]>(
        supabase.from('progreso').select('libro_id, pagina').eq('usuario_id', perfil!.id),
      )
      return new Map(filas.map((f) => [f.libro_id, f.pagina]))
    },
  })
}

export function useAnotaciones(libroId: number) {
  return useQuery({
    queryKey: ['anotaciones', libroId],
    queryFn: () =>
      datos<Anotacion[]>(
        supabase.from('anotaciones').select('*').eq('libro_id', libroId).order('pagina').order('creada_en'),
      ),
  })
}

// Frases guardadas y notas de todos los libros (las anotaciones sólo las ve su autor).
export function useMisNotas() {
  return useQuery({
    queryKey: ['anotaciones', 'todas'],
    queryFn: () =>
      datos<NotaConLibro[]>(
        supabase
          .from('anotaciones')
          .select('*, libro:libros(titulo)')
          .or('tipo.eq.frase,tipo.eq.nota,nota.not.is.null')
          .order('creada_en', { ascending: false }),
      ),
  })
}

// Descarga el PDF sin dejarlo en la caché del navegador (en un teléfono compartido no queda una copia).
export async function descargarLibro(archivo: string) {
  const { data } = await supabase.auth.getSession()
  const respuesta = await fetch(`${url}/storage/v1/object/authenticated/libros/${encodeURIComponent(archivo)}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${data.session?.access_token}`, apikey: clave ?? '' },
  })
  if (!respuesta.ok) throw new Error('No se pudo abrir el libro.')
  return new Uint8Array(await respuesta.arrayBuffer())
}

