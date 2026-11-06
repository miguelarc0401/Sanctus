import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '../auth/contexto'
import { datos } from './consultas'
import { notificar } from './notificaciones'
import { supabase } from './supabase'

export type Mensaje = {
  id: number
  de: string
  para: string
  texto: string
  creado_en: string
  leido_en: string | null
  // Mientras sube: se muestra enseguida, un poco más tenue.
  enviando?: boolean
}

export type Conversacion = {
  persona: string
  nombre: string
  es_coordinador: boolean
  ultimo: string
  ultimo_mio: boolean
  ultimo_en: string
  sin_leer: number
  puede_escribir: boolean
}

export type Contacto = { persona: string; nombre: string; es_coordinador: boolean; puede_escribir: boolean }

// A quién se le puede escribir desde «Nuevo mensaje».
export type Destinatario = { id: string; nombre: string; es_admin: boolean; miembros: { grupo_id: number }[] }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const esIdValido = (id: string) => UUID.test(id)

// Lo más reciente de cada conversación; las viejas se ven al subir (hasta este límite).
const MAXIMO = 300

export function useConversaciones() {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['mensajes', 'conversaciones', perfil?.id],
    enabled: !!perfil,
    queryFn: () => datos<Conversacion[]>(supabase.rpc('mis_conversaciones')),
  })
}

export function useMensajes(persona: string) {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['mensajes', 'con', perfil?.id, persona],
    enabled: !!perfil && esIdValido(persona),
    // Por si la conexión en vivo se cae: mientras la conversación está abierta, se revisa cada tanto.
    refetchInterval: 30_000,
    queryFn: async () => {
      // De mí a esa persona o de esa persona a mí (nadie se escribe a sí mismo).
      const filas = await datos<Mensaje[]>(
        supabase
          .from('mensajes')
          .select('*')
          .in('de', [perfil!.id, persona])
          .in('para', [perfil!.id, persona])
          .order('creado_en', { ascending: false })
          .order('id', { ascending: false })
          .limit(MAXIMO),
      )
      return filas.reverse()
    },
  })
}

export function useContacto(persona: string) {
  return useQuery({
    queryKey: ['mensajes', 'contacto', persona],
    enabled: esIdValido(persona),
    queryFn: async () => (await datos<Contacto[]>(supabase.rpc('contacto', { usuario: persona })))[0] ?? null,
  })
}

// Un miembro sólo puede escribirle a los coordinadores; un coordinador, a cualquier cuenta activa.
export function useDestinatarios(activo: boolean) {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['mensajes', 'destinatarios', perfil?.id, perfil?.es_admin],
    enabled: activo && !!perfil,
    queryFn: async (): Promise<Destinatario[]> => {
      if (!perfil!.es_admin) {
        const filas = await datos<{ persona: string; nombre: string }[]>(supabase.rpc('coordinadores'))
        return filas.map((f) => ({ id: f.persona, nombre: f.nombre, es_admin: true, miembros: [] }))
      }
      return datos<Destinatario[]>(
        supabase
          .from('perfiles')
          .select('id, nombre, es_admin, miembros(grupo_id)')
          .eq('estado', 'aprobado')
          .neq('id', perfil!.id)
          .order('nombre'),
      )
    },
  })
}

export async function enviarMensaje(para: string, texto: string) {
  const { id } = await datos<{ id: number }>(supabase.from('mensajes').insert({ para, texto }).select('id').single())
  // Si la notificación no sale, el mensaje ya quedó guardado igual.
  void notificar('mensaje', id)
}

export async function marcarLeidos(persona: string) {
  const { error } = await supabase.rpc('marcar_leidos', { persona })
  if (error) throw error
}

// Mensajes que llegan mientras la app está abierta (y cuando la otra persona lee los míos).
export function useMensajesEnVivo() {
  const { perfil } = useAuth()
  const clienteConsultas = useQueryClient()
  const yo = perfil?.estado === 'aprobado' ? perfil.id : null

  useEffect(() => {
    if (!yo) return
    const recargar = () => void clienteConsultas.invalidateQueries({ queryKey: ['mensajes'] })
    const canal = supabase
      .channel(`mensajes-${yo}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `para=eq.${yo}` }, recargar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes', filter: `de=eq.${yo}` }, recargar)
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [yo, clienteConsultas])
}
