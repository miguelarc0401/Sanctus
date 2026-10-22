import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type Perfil = {
  id: string
  nombre: string
  foto: string | null
  // Correo o usuario con el que entra.
  acceso: string | null
  es_admin: boolean
  debe_cambiar_contrasena: boolean
}

type EstadoAuth = {
  cargando: boolean
  sesion: Session | null
  perfil: Perfil | null
  recargarPerfil: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<EstadoAuth | null>(null)

export function useAuth() {
  const estado = useContext(AuthContext)
  if (!estado) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return estado
}
