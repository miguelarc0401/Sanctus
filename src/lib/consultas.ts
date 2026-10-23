import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabase'

type Respuesta<T> = { data: T | null; error: PostgrestError | null }

// Devuelve los datos de una consulta de Supabase o lanza su error.
export async function datos<T>(consulta: PromiseLike<Respuesta<unknown>>) {
  const { data, error } = await consulta
  if (error) throw error
  return data as T
}

// Contenido de la parroquia (sin grupo) más el del grupo elegido.
export function filtroGrupo(grupoId: number | null) {
  return grupoId === null ? 'grupo_id.is.null' : `grupo_id.is.null,grupo_id.eq.${grupoId}`
}

export async function guardarFila(tabla: string, id: number | string | null, valores: Record<string, unknown>) {
  const { error } = id === null
    ? await supabase.from(tabla).insert(valores)
    : await supabase.from(tabla).update(valores).eq('id', id)
  if (error) throw error
}

export async function borrarFila(tabla: string, id: number) {
  const { error } = await supabase.from(tabla).delete().eq('id', id)
  if (error) throw error
}

// Llama a la función de Supabase que da de alta, cambia contraseñas y elimina miembros.
export function llamarMiembros<T>(cuerpo: Record<string, unknown>) {
  return llamarFuncion<T>('miembros', cuerpo)
}

// Llama a una función de Supabase y convierte su mensaje de error en un Error legible.
export async function llamarFuncion<T>(nombre: string, cuerpo?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(nombre, cuerpo ? { body: cuerpo } : { method: 'GET' })
  if (error) {
    let mensaje = 'No se pudo completar la acción. Inténtalo de nuevo.'
    try {
      mensaje = (await error.context.json()).error ?? mensaje
    } catch {
      // La respuesta no traía un mensaje legible.
    }
    throw new Error(mensaje)
  }
  return data as T
}
