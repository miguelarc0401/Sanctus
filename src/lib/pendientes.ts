import type { PostgrestError } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/contexto'
import { supabase } from './supabase'

// Cuántas filas cumplen una condición, sin traerlas.
async function contar(consulta: PromiseLike<{ count: number | null; error: PostgrestError | null }>) {
  const { count, error } = await consulta
  if (error) throw error
  return count ?? 0
}

// Solicitudes de cuenta por revisar (sólo el administrador).
export function useSolicitudesPendientes() {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['miembros', 'pendientes'],
    enabled: perfil?.es_admin === true,
    queryFn: () =>
      contar(supabase.from('perfiles').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente')),
  })
}

// Preguntas que el administrador aún no responde.
export function usePreguntasSinResponder() {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['preguntas', 'sin-responder'],
    enabled: perfil?.es_admin === true,
    queryFn: () =>
      contar(supabase.from('preguntas').select('id', { count: 'exact', head: true }).is('respuesta', null)),
  })
}

// Respuestas a mis preguntas que todavía no he leído.
export function useRespuestasNuevas() {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['preguntas', 'nuevas', perfil?.id],
    enabled: !!perfil,
    queryFn: () =>
      contar(
        supabase
          .from('preguntas')
          .select('id', { count: 'exact', head: true })
          .eq('autor_id', perfil!.id)
          .not('respuesta', 'is', null)
          .eq('respuesta_vista', false),
      ),
  })
}
