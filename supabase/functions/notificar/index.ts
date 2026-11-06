// Envía notificaciones al teléfono (Web Push) cuando el administrador publica algo o alguien manda un mensaje.
// El envío en sí está en ../_shared/push.ts.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { enviarPush, type Mensaje } from '../_shared/push.ts'

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
  if (tipo === 'encuesta') {
    const { data } = await supabase.from('encuestas').select('grupo_id, titulo, fase').eq('id', id).maybeSingle()
    if (!data || data.fase === 'cerrada') return null
    const texto = data.fase === 'propuestas' ? `Propón temas para las charlas: ${data.titulo}` : `¡Ya puedes votar! ${data.titulo}`
    return [await cuentasDe(data.grupo_id), { titulo: 'Temas de las charlas', texto, url: '/temas', etiqueta: `encuesta-${id}` }]
  }
  return null
}

// A quién le llega un mensaje del chat: a la otra persona, con el nombre de quien escribe y el principio del texto.
// Los mensajes de una misma persona se juntan en una sola notificación, que vuelve a sonar con cada uno.
async function prepararMensaje(id: number, yo: string, nombre: string): Promise<[string[], Mensaje] | null> {
  const { data } = await supabase.from('mensajes').select('de, para, texto').eq('id', id).maybeSingle()
  if (!data || data.de !== yo) return null
  const texto = data.texto.length > 140 ? `${data.texto.slice(0, 139)}…` : data.texto
  return [[data.para], { titulo: nombre, texto, url: `/mensajes/${yo}`, etiqueta: `mensaje-${yo}`, renotificar: true }]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: sesion } = await supabase.auth.getUser(token)
  if (!sesion.user) return responder({ error: 'Tu sesión expiró. Vuelve a entrar.' }, 401)
  const { data: perfil } = await supabase.from('perfiles').select('es_admin, nombre, estado').eq('id', sesion.user.id).maybeSingle()
  const { tipo, id, zona } = (await req.json()) as { tipo: string; id?: number; zona?: string }

  // Un mensaje lo avisa quien lo escribió (miembro o coordinador); lo demás, sólo un administrador.
  let preparado: [string[], Mensaje] | null
  if (tipo === 'mensaje') {
    if (perfil?.estado !== 'aprobado') return responder({ error: 'Tu cuenta no está activa.' }, 403)
    preparado = await prepararMensaje(Number(id), sesion.user.id, perfil.nombre)
  } else {
    if (!perfil?.es_admin) return responder({ error: 'Sólo el administrador puede enviar notificaciones.' }, 403)
    preparado = await preparar(tipo, Number(id), zona || 'America/Mexico_City', sesion.user.id)
  }
  if (!preparado) return responder({ enviadas: 0, total: 0 })
  const [cuentas, mensaje] = preparado

  // A quien publica no le llega su propio aviso (salvo la notificación de prueba).
  const destinatarios = tipo === 'prueba' ? cuentas : cuentas.filter((c) => c !== sesion.user!.id)
  return responder(await enviarPush(supabase, destinatarios, mensaje))
})
