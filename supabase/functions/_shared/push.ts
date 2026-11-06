// Envía notificaciones al teléfono (Web Push). Lo usan «notificar» (avisos, eventos, mensajes…) y «registro»
// (solicitudes nuevas, para los coordinadores). La clave privada VAPID se lee de la bóveda de Supabase; la
// pública es la misma que usa la app.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLICA = 'BHvuU6NEW5QYhEypwEDH4lEjGscSDLbE7_t9Oiwwy3hw6pUF3PwQKUDsl6Y1Liac_1uWFOyFk6-pr_k_YUhT_EQ'
const SITIO = 'https://sanctus.miguelarc-0401.workers.dev'

export type Mensaje = { titulo: string; texto: string; url: string; etiqueta: string; renotificar?: boolean }

export async function enviarPush(supabase: SupabaseClient, cuentas: string[], mensaje: Mensaje) {
  if (cuentas.length === 0) return { enviadas: 0, total: 0 }

  const { data: suscripciones } = await supabase
    .from('suscripciones_push')
    .select('id, endpoint, p256dh, auth')
    .in('usuario_id', cuentas)
  if (!suscripciones?.length) return { enviadas: 0, total: 0 }

  const { data: privada } = await supabase.rpc('clave_vapid_privada')
  webpush.setVapidDetails(SITIO, VAPID_PUBLICA, privada)

  const resultados = await Promise.allSettled(
    suscripciones.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(mensaje), {
        TTL: 60 * 60 * 24,
        // Prioridad alta: Android la entrega enseguida aunque el teléfono esté con la pantalla apagada o
        // ahorrando batería. Con la normal puede esperar hasta que alguien desbloquee el teléfono.
        urgency: 'high',
      }),
    ),
  )

  // Los teléfonos que ya no aceptan notificaciones (app borrada, permiso quitado) se dan de baja.
  const codigos = resultados.map((r) => (r.status === 'rejected' ? ((r.reason as { statusCode?: number }).statusCode ?? 0) : 201))
  const vencidas = suscripciones.filter((_, i) => codigos[i] === 404 || codigos[i] === 410)
  if (vencidas.length > 0) await supabase.from('suscripciones_push').delete().in('id', vencidas.map((s) => s.id))

  const enviadas = resultados.filter((r) => r.status === 'fulfilled').length
  // Para revisar en los registros de Supabase si algo no llega (sin datos de nadie).
  console.log(JSON.stringify({ tipo: mensaje.etiqueta.split('-')[0], enviadas, total: suscripciones.length, codigos }))
  return { enviadas, total: suscripciones.length }
}
