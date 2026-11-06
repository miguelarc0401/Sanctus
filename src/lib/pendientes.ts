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

// Mensajes que me escribieron y todavía no leo.
export function useMensajesSinLeer() {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['mensajes', 'sin-leer', perfil?.id],
    enabled: !!perfil,
    queryFn: () =>
      contar(
        supabase
          .from('mensajes')
          .select('id', { count: 'exact', head: true })
          .eq('para', perfil!.id)
          .is('leido_en', null),
      ),
  })
}
