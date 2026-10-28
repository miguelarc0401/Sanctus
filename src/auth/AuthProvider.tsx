import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { olvidarCambiosPendientes } from '../lib/cambiosPendientes'
import { hayConexion, persistidor } from '../lib/conexion'
import { olvidarLibros } from '../lib/libros'
import { desactivarNotificaciones } from '../lib/notificaciones'
import { claveSesion, supabase } from '../lib/supabase'
import { AuthContext, type Perfil } from './contexto'

const CLAVE_PERFIL = 'perfil-guardado'

function leer<T>(clave: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? 'null') as T | null
  } catch {
    return null
  }
}

// Sin internet Supabase no puede renovar la sesión y responde que no hay ninguna, pero la deja
// guardada en el teléfono hasta poder renovarla (sólo la borra al cerrar sesión o si ya no sirve).
// Mientras siga ahí, la persona sigue dentro y ve lo último que se descargó.
const sesionGuardada = () => leer<Session>(claveSesion)

const perfilGuardado = (usuarioId: string | undefined) => {
  const perfil = leer<Perfil>(CLAVE_PERFIL)
  return perfil && perfil.id === usuarioId ? perfil : null
}

function guardarPerfil(perfil: Perfil | null) {
  try {
    if (perfil) localStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil))
    else localStorage.removeItem(CLAVE_PERFIL)
  } catch {
    // Sin almacenamiento, sin internet no se podrá entrar.
  }
}

// Que la siguiente persona que entre en este teléfono no vea datos de la anterior.
function olvidarLoGuardado() {
  guardarPerfil(null)
  persistidor.removeClient()
  olvidarLibros()
  olvidarCambiosPendientes()
}

function sesionAlAbrir() {
  const sesion = sesionGuardada()
  // Sin sesión no debe quedar nada de quien entró antes (por ejemplo, si su sesión se acabó con la app cerrada).
  if (!sesion) olvidarLoGuardado()
  return sesion
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const clienteConsultas = useQueryClient()
  // Se empieza con lo guardado en el teléfono, así la app abre al instante y también sin internet;
  // luego Supabase lo confirma o lo cambia.
  const [sesion, setSesion] = useState(sesionAlAbrir)
  const [sesionLista, setSesionLista] = useState(() => sesion !== null)
  const [perfil, setPerfil] = useState(() => perfilGuardado(sesion?.user.id))
  // Usuario al que corresponde el perfil cargado; si no coincide con la sesión, aún está cargando.
  const [perfilDe, setPerfilDe] = useState(() => perfil?.id ?? null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session ?? sesionGuardada())
      setSesionLista(true)
    })
    // Dentro de este callback no se debe llamar a Supabase: sólo se guarda la sesión.
    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion ?? sesionGuardada())
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const usuarioId = sesion?.user.id

  const recargarPerfil = useCallback(async () => {
    if (!usuarioId) return
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre, foto, acceso, es_admin, debe_cambiar_contrasena, estado')
      .eq('id', usuarioId)
      .maybeSingle()
    if (error) {
      console.error('No se pudo cargar el perfil', error)
      // Sin internet se queda el que estaba guardado.
      const guardado = perfilGuardado(usuarioId)
      if (guardado) {
        setPerfil(guardado)
        setPerfilDe(usuarioId)
        return
      }
    }
    setPerfil(data)
    setPerfilDe(usuarioId)
    guardarPerfil(data)
  }, [usuarioId])

  useEffect(() => {
    void recargarPerfil()
  }, [recargarPerfil])

  const cerrarSesion = useCallback(async () => {
    // Este teléfono deja de recibir notificaciones de esta cuenta (sin esperar más de 3 segundos).
    await Promise.race([desactivarNotificaciones().catch(() => {}), new Promise((ok) => setTimeout(ok, 3000))])
    // Sin internet Supabase no puede cerrar la sesión (y tarda en darse por vencido): se borra la de este teléfono.
    const { error } = hayConexion() ? await supabase.auth.signOut() : { error: true }
    if (error) {
      try {
        localStorage.removeItem(claveSesion)
      } catch {
        // No había nada que borrar.
      }
    }
    setSesion(null)
    setPerfil(null)
    setPerfilDe(null)
  }, [])

  // Al acabarse la sesión (al cerrarla o sola, por ejemplo si se eliminó la cuenta) se borra lo de esa persona.
  const habiaSesion = useRef(usuarioId !== undefined)
  useEffect(() => {
    if (usuarioId) habiaSesion.current = true
    else if (habiaSesion.current) {
      habiaSesion.current = false
      clienteConsultas.clear()
      olvidarLoGuardado()
    }
  }, [usuarioId, clienteConsultas])

  const cargando = !sesionLista || (usuarioId !== undefined && perfilDe !== usuarioId)

  const valor = useMemo(
    () => ({ cargando, sesion, perfil, recargarPerfil, cerrarSesion }),
    [cargando, sesion, perfil, recargarPerfil, cerrarSesion],
  )

  return <AuthContext value={valor}>{children}</AuthContext>
}
