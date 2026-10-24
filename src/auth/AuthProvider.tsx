import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { olvidarLibroAbierto } from '../lib/libros'
import { desactivarNotificaciones } from '../lib/notificaciones'
import { supabase } from '../lib/supabase'
import { AuthContext, type Perfil } from './contexto'

export function AuthProvider({ children }: { children: ReactNode }) {
  const clienteConsultas = useQueryClient()
  const [sesion, setSesion] = useState<Session | null>(null)
  const [sesionLista, setSesionLista] = useState(false)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  // Usuario al que corresponde el perfil cargado; si no coincide con la sesión, aún está cargando.
  const [perfilDe, setPerfilDe] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setSesionLista(true)
    })
    // Dentro de este callback no se debe llamar a Supabase: sólo se guarda la sesión.
    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion)
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
    if (error) console.error('No se pudo cargar el perfil', error)
    setPerfil(data)
    setPerfilDe(usuarioId)
  }, [usuarioId])

  useEffect(() => {
    void recargarPerfil()
  }, [recargarPerfil])

  const cerrarSesion = useCallback(async () => {
    // Este teléfono deja de recibir notificaciones de esta cuenta (sin esperar más de 3 segundos).
    await Promise.race([desactivarNotificaciones().catch(() => {}), new Promise((ok) => setTimeout(ok, 3000))])
    await supabase.auth.signOut()
    setPerfil(null)
    setPerfilDe(null)
    // Que la siguiente persona que entre en este teléfono no vea datos de la anterior.
    clienteConsultas.clear()
    olvidarLibroAbierto()
  }, [clienteConsultas])

  const cargando = !sesionLista || (usuarioId !== undefined && perfilDe !== usuarioId)

  const valor = useMemo(
    () => ({ cargando, sesion, perfil, recargarPerfil, cerrarSesion }),
    [cargando, sesion, perfil, recargarPerfil, cerrarSesion],
  )

  return <AuthContext value={valor}>{children}</AuthContext>
}
