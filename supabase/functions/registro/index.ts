// Registro público: cualquiera puede pedir su cuenta. Queda «pendiente» hasta que el
// administrador la apruebe, y mientras tanto no ve nada de la parroquia.
import { createClient } from 'npm:@supabase/supabase-js@2'

// Igual que en src/lib/usuarios.ts y en la migración de la Fase 1.
const DOMINIO_USUARIOS = 'usuarios.santamaria.invalid'
const FORMATO_USUARIO = /^[a-z0-9][a-z0-9._-]{2,29}$/
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Freno contra registros masivos: si hay demasiadas solicitudes sin revisar, se pausa el registro.
const MAXIMO_PENDIENTES = 200

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Grupos para elegir al registrarse: sólo nombre y santo.
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('grupos').select('id, nombre, santo:santos(nombre)').order('nombre')
    if (error) return responder({ error: 'No se pudieron cargar los grupos.' }, 500)
    return responder({ grupos: data })
  }

  if (req.method !== 'POST') return responder({ error: 'Método no permitido.' }, 405)

  const cuerpo = await req.json().catch(() => null)
  if (!cuerpo) return responder({ error: 'Solicitud inválida.' }, 400)

  // Campo trampa: las personas no lo ven; los robots lo llenan.
  if (cuerpo.sitio) return responder({ ok: true })

  const nombre = String(cuerpo.nombre ?? '').trim()
  const acceso = String(cuerpo.acceso ?? '').trim().toLowerCase()
  const contrasena = String(cuerpo.contrasena ?? '')
  const nota = String(cuerpo.nota ?? '').trim().slice(0, 300)
  const grupoId = Number(cuerpo.grupo_id) || null

  if (nombre.length < 3 || nombre.length > 80) return responder({ error: 'Escribe tu nombre completo.' }, 400)
  const esCorreo = acceso.includes('@')
  if (esCorreo ? !FORMATO_CORREO.test(acceso) : !FORMATO_USUARIO.test(acceso)) {
    return responder(
      {
        error: esCorreo
          ? 'Ese correo no parece válido.'
          : 'El usuario debe tener de 3 a 30 letras o números, sin espacios ni acentos (se permiten . _ -).',
      },
      400,
    )
  }
  if (contrasena.length < 8) return responder({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400)

  const { count } = await supabase
    .from('perfiles')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente')
  if ((count ?? 0) >= MAXIMO_PENDIENTES) {
    return responder({ error: 'Hay demasiadas solicitudes en espera. Avísale a tu coordinador.' }, 429)
  }

  if (grupoId) {
    const { data: grupo } = await supabase.from('grupos').select('id').eq('id', grupoId).maybeSingle()
    if (!grupo) return responder({ error: 'Ese grupo ya no existe. Elige otro.' }, 400)
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: esCorreo ? acceso : `${acceso}@${DOMINIO_USUARIOS}`,
    password: contrasena,
    email_confirm: true,
    user_metadata: { nombre },
  })
  if (error) {
    const yaExiste = error.code === 'email_exists' || error.message.includes('already been registered')
    return responder(
      { error: yaExiste ? 'Ese usuario o correo ya está registrado. Elige otro o inicia sesión.' : error.message },
      400,
    )
  }

  await supabase
    .from('perfiles')
    .update({ grupo_solicitado: grupoId, nota_registro: nota || null })
    .eq('id', data.user.id)

  return responder({ ok: true })
})
