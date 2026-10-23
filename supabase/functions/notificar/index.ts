// Envía notificaciones al teléfono (Web Push) cuando el administrador publica algo.
// La clave privada VAPID se lee de la bóveda de Supabase; la pública es la misma que usa la app.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLICA = 'BHvuU6NEW5QYhEypwEDH4lEjGscSDLbE7_t9Oiwwy3hw6pUF3PwQKUDsl6Y1Liac_1uWFOyFk6-pr_k_YUhT_EQ'
const SITIO = 'https://sanctus.miguelarc-0401.workers.dev'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function claveSecreta() {
  const nuevas = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (nuevas) return JSON.parse(nuevas).default as string
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, claveSecreta(), {
  auth: { persistSession: false, autoRefreshToken: false },
})

type Mensaje = { titulo: string; texto: string; url: string; etiqueta: string }

// Cuentas aprobadas de un grupo, o de toda la parroquia si no hay grupo.
async function cuentasDe(grupoId: number | null) {
  if (grupoId === null) {
    const { data } = await supabase.from('perfiles').select('id').eq('estado', 'aprobado')
    return (data ?? []).map((p) => p.id as string)
  }
  const { data } = await supabase
    .from('miembros')
    .select('usuario_id, perfil:perfiles!inner(estado)')
    .eq('grupo_id', grupoId)
    .eq('perfil.estado', 'aprobado')
  return (data ?? []).map((m) => m.usuario_id as string)
}

async function preparar(tipo: string, id: number, zona: string, yo: string): Promise<[string[], Mensaje] | null> {
  if (tipo === 'prueba') {
    return [[yo], { titulo: 'Santa María', texto: '¡Las notificaciones funcionan!', url: '/', etiqueta: 'prueba' }]
  }
  if (tipo === 'aviso') {
    const { data } = await supabase.from('avisos').select('grupo_id, titulo').eq('id', id).maybeSingle()
    if (!data) return null
    return [await cuentasDe(data.grupo_id), { titulo: 'Nuevo aviso', texto: data.titulo, url: '/avisos', etiqueta: `aviso-${id}` }]
  }
  if (tipo === 'evento') {
    const { data } = await supabase.from('eventos').select('grupo_id, titulo, inicio, todo_el_dia').eq('id', id).maybeSingle()
    if (!data) return null
    const cuando = new Intl.DateTimeFormat('es-MX', {
      timeZone: zona,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(data.todo_el_dia ? {} : { hour: 'numeric', minute: '2-digit' }),
    }).format(new Date(data.inicio))
    return [
      await cuentasDe(data.grupo_id),
      { titulo: `Nuevo en el calendario: ${data.titulo}`, texto: cuando, url: '/calendario', etiqueta: `evento-${id}` },
    ]
  }
  if (tipo === 'respuesta') {
    const { data } = await supabase.from('preguntas').select('autor_id').eq('id', id).maybeSingle()
    if (!data) return null
    return [
      [data.autor_id],
      { titulo: 'Te respondieron', texto: 'El coordinador respondió tu pregunta.', url: '/preguntas', etiqueta: `respuesta-${id}` },
    ]
  }
  if (tipo === 'encuesta') {
    const { data } = await supabase.from('encuestas').select('grupo_id, titulo, fase').eq('id', id).maybeSingle()
    if (!data || data.fase === 'cerrada') return null
    const texto = data.fase === 'propuestas' ? `Propón temas para las charlas: ${data.titulo}` : `¡Ya puedes votar! ${data.titulo}`
    return [await cuentasDe(data.grupo_id), { titulo: 'Temas de las charlas', texto, url: '/temas', etiqueta: `encuesta-${id}` }]
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: sesion } = await supabase.auth.getUser(token)
  if (!sesion.user) return responder({ error: 'Tu sesión expiró. Vuelve a entrar.' }, 401)
  const { data: perfil } = await supabase.from('perfiles').select('es_admin').eq('id', sesion.user.id).maybeSingle()
  if (!perfil?.es_admin) return responder({ error: 'Sólo el administrador puede enviar notificaciones.' }, 403)

  const { tipo, id, zona } = (await req.json()) as { tipo: string; id?: number; zona?: string }
  const preparado = await preparar(tipo, Number(id), zona || 'America/Mexico_City', sesion.user.id)
  if (!preparado) return responder({ enviadas: 0, total: 0 })
  const [cuentas, mensaje] = preparado

  // A quien publica no le llega su propio aviso (salvo la notificación de prueba).
  const destinatarios = tipo === 'prueba' ? cuentas : cuentas.filter((c) => c !== sesion.user!.id)
  if (destinatarios.length === 0) return responder({ enviadas: 0, total: 0 })

  const { data: suscripciones } = await supabase
    .from('suscripciones_push')
    .select('id, endpoint, p256dh, auth')
    .in('usuario_id', destinatarios)
  if (!suscripciones?.length) return responder({ enviadas: 0, total: 0 })

  const { data: privada } = await supabase.rpc('clave_vapid_privada')
  webpush.setVapidDetails(SITIO, VAPID_PUBLICA, privada)

  const resultados = await Promise.allSettled(
    suscripciones.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(mensaje), {
        TTL: 60 * 60 * 24,
      }),
    ),
  )

  // Los teléfonos que ya no aceptan notificaciones (app borrada, permiso quitado) se dan de baja.
  const vencidas = suscripciones.filter((_, i) => {
    const r = resultados[i]
    const codigo = r.status === 'rejected' ? (r.reason as { statusCode?: number }).statusCode : undefined
    return codigo === 404 || codigo === 410
  })
  if (vencidas.length > 0) await supabase.from('suscripciones_push').delete().in('id', vencidas.map((s) => s.id))

  const enviadas = resultados.filter((r) => r.status === 'fulfilled').length
  return responder({ enviadas, total: suscripciones.length })
})
