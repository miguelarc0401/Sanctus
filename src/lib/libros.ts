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

export type ColorAnotacion = 'amarillo' | 'verde' | 'rosa' | 'azul'

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
  // Sólo los subrayados; sin color se dibujan en amarillo.
  color: ColorAnotacion | null
  creada_en: string
}

export type NotaConLibro = Anotacion & { libro: { titulo: string } }

export const ICONOS_ANOTACION: Record<TipoAnotacion, LucideIcon> = {
  frase: Quote,
  nota: StickyNote,
  subrayado: Highlighter,
  marcador: Bookmark,
}

export const NOMBRES_ANOTACION: Record<TipoAnotacion, string> = {
  subrayado: 'Subrayado',
  frase: 'Frase guardada',
  nota: 'Nota de la página',
  marcador: 'Página marcada',
}

// muestra: el botón para elegirlo; marca: el subrayado sobre la página.
export const COLORES: Record<ColorAnotacion, { nombre: string; muestra: string; marca: string }> = {
  amarillo: { nombre: 'Amarillo', muestra: '#facc15', marca: 'rgb(250 204 21 / 0.5)' },
  verde: { nombre: 'Verde', muestra: '#4ade80', marca: 'rgb(74 222 128 / 0.45)' },
  rosa: { nombre: 'Rosa', muestra: '#f472b6', marca: 'rgb(244 114 182 / 0.4)' },
  azul: { nombre: 'Azul', muestra: '#60a5fa', marca: 'rgb(96 165 250 / 0.45)' },
}

// Color con que se distingue una anotación en las listas (las frases van en oro y las notas
// de página, como un papelito adhesivo).
export function colorDe(anotacion: Pick<Anotacion, 'tipo' | 'color'>) {
  if (anotacion.tipo === 'frase') return '#c49a2c'
  if (anotacion.tipo === 'subrayado') return COLORES[anotacion.color ?? 'amarillo'].muestra
  return '#f59e0b'
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

export type Progreso = { pagina: number; leido_en: string }

// Página en la que se quedó la persona en cada libro y cuándo lo leyó.
export function useProgreso() {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['progreso', perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const filas = await datos<{ libro_id: number; pagina: number; actualizado_en: string }[]>(
        supabase.from('progreso').select('libro_id, pagina, actualizado_en').eq('usuario_id', perfil!.id),
      )
      return new Map<number, Progreso>(filas.map((f) => [f.libro_id, { pagina: f.pagina, leido_en: f.actualizado_en }]))
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

// El último libro abierto se queda en memoria (nunca en disco) para no volver a descargarlo
// si la persona sale a la biblioteca y regresa.
let ultimoLibro: { archivo: string; datos: Uint8Array } | null = null

export function olvidarLibroAbierto() {
  ultimoLibro = null
}

// Descarga el PDF sin dejarlo en la caché del navegador (en un teléfono compartido no queda una copia).
// alAvanzar recibe la fracción descargada (de 0 a 1) cuando se conoce el tamaño.
export async function descargarLibro(archivo: string, alAvanzar?: (fraccion: number) => void) {
  // PDF.js se queda con los datos que recibe, así que siempre se entrega una copia.
  if (ultimoLibro?.archivo === archivo) return ultimoLibro.datos.slice()
  const { data } = await supabase.auth.getSession()
  const respuesta = await fetch(`${url}/storage/v1/object/authenticated/libros/${encodeURIComponent(archivo)}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${data.session?.access_token}`, apikey: clave ?? '' },
  })
  if (!respuesta.ok || !respuesta.body) throw new Error('No se pudo abrir el libro.')
  const total = Number(respuesta.headers.get('Content-Length')) || 0
  const pedazos: Uint8Array[] = []
  let recibido = 0
  const lector = respuesta.body.getReader()
  for (;;) {
    const { done, value } = await lector.read()
    if (done) break
    pedazos.push(value)
    recibido += value.length
    if (total) alAvanzar?.(Math.min(recibido / total, 1))
  }
  const datosLibro = new Uint8Array(recibido)
  let posicion = 0
  for (const pedazo of pedazos) {
    datosLibro.set(pedazo, posicion)
    posicion += pedazo.length
  }
  ultimoLibro = { archivo, datos: datosLibro }
  return datosLibro.slice()
}

