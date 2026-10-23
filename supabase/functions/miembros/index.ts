// Alta, cambio de usuario o contraseña y baja de miembros. Sólo la puede usar el administrador.
// Necesita la clave secreta de Supabase, por eso vive aquí y no en el navegador.
import { createClient } from 'npm:@supabase/supabase-js@2'

// Igual que en src/lib/usuarios.ts y en la migración de la Fase 1.
const DOMINIO_USUARIOS = 'usuarios.santamaria.invalid'
const FORMATO_USUARIO = /^[a-z0-9][a-z0-9._-]{2,29}$/

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

type Peticion =
  | { accion: 'crear'; nombre: string; acceso: string; contrasena: string; grupos: number[] }
  | { accion: 'restablecer'; id: string; contrasena: string }
  | { accion: 'cambiar_acceso'; id: string; acceso: string }
  | { accion: 'eliminar'; id: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: sesion } = await supabase.auth.getUser(token)
  if (!sesion.user) return responder({ error: 'Tu sesión expiró. Vuelve a entrar.' }, 401)

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('es_admin')
    .eq('id', sesion.user.id)
    .maybeSingle()
  if (!perfil?.es_admin) return responder({ error: 'Sólo el administrador puede hacer esto.' }, 403)

  const peticion = (await req.json()) as Peticion

  if (peticion.accion === 'crear') {
    const nombre = peticion.nombre?.trim()
    const acceso = peticion.acceso?.trim().toLowerCase()
    if (!nombre) return responder({ error: 'Falta el nombre.' }, 400)
    if (!acceso) return responder({ error: 'Falta el correo o usuario.' }, 400)
    if (!acceso.includes('@') && !FORMATO_USUARIO.test(acceso)) {
      return responder(
        { error: 'El usuario debe tener de 3 a 30 letras o números, sin espacios ni acentos (se permiten . _ -).' },
        400,
      )
    }
    if ((peticion.contrasena ?? '').length < 8) {
      return responder({ error: 'La contraseña temporal debe tener al menos 8 caracteres.' }, 400)
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: acceso.includes('@') ? acceso : `${acceso}@${DOMINIO_USUARIOS}`,
      password: peticion.contrasena,
      email_confirm: true,
      user_metadata: { nombre, debe_cambiar_contrasena: true },
    })
    if (error) {
      const yaExiste = error.code === 'email_exists' || error.message.includes('already been registered')
      return responder({ error: yaExiste ? 'Ya existe una cuenta con ese correo o usuario.' : error.message }, 400)
    }

    // Las cuentas que crea el administrador ya nacen aprobadas.
    await supabase.from('perfiles').update({ estado: 'aprobado' }).eq('id', data.user.id)

    const grupos = peticion.grupos ?? []
    if (grupos.length > 0) {
      const { error: errorGrupos } = await supabase
        .from('miembros')
        .insert(grupos.map((grupo_id) => ({ grupo_id, usuario_id: data.user.id })))
      if (errorGrupos) return responder({ error: `Cuenta creada, pero no se pudo asignar a los grupos: ${errorGrupos.message}` }, 500)
    }
    return responder({ id: data.user.id })
  }

  if (peticion.accion === 'restablecer') {
    if ((peticion.contrasena ?? '').length < 8) {
      return responder({ error: 'La contraseña temporal debe tener al menos 8 caracteres.' }, 400)
    }
    const { error } = await supabase.auth.admin.updateUserById(peticion.id, { password: peticion.contrasena })
    if (error) return responder({ error: error.message }, 400)
    await supabase.from('perfiles').update({ debe_cambiar_contrasena: true }).eq('id', peticion.id)
    return responder({ ok: true })
  }

  if (peticion.accion === 'cambiar_acceso') {
    const acceso = peticion.acceso?.trim().toLowerCase()
    if (!acceso) return responder({ error: 'Falta el correo o usuario.' }, 400)
    if (!acceso.includes('@') && !FORMATO_USUARIO.test(acceso)) {
      return responder(
        { error: 'El usuario debe tener de 3 a 30 letras o números, sin espacios ni acentos (se permiten . _ -).' },
        400,
      )
    }
    const { error } = await supabase.auth.admin.updateUserById(peticion.id, {
      email: acceso.includes('@') ? acceso : `${acceso}@${DOMINIO_USUARIOS}`,
      email_confirm: true,
    })
    if (error) {
      const yaExiste = error.code === 'email_exists' || error.message.includes('already been registered')
      return responder({ error: yaExiste ? 'Ya existe una cuenta con ese correo o usuario.' : error.message }, 400)
    }
    await supabase.from('perfiles').update({ acceso }).eq('id', peticion.id)
    return responder({ ok: true })
  }

  if (peticion.accion === 'eliminar') {
    if (peticion.id === sesion.user.id) return responder({ error: 'No puedes eliminar tu propia cuenta.' }, 400)
    const { error } = await supabase.auth.admin.deleteUser(peticion.id)
    if (error) return responder({ error: error.message }, 400)
    return responder({ ok: true })
  }

  return responder({ error: 'Acción desconocida.' }, 400)
})
