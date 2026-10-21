import { Navigate, Outlet, useLocation } from 'react-router'
import { PantallaCarga, PerfilNoEncontrado } from '../components/Pantallas'
import { useAuth } from './contexto'

// Sólo deja pasar a usuarios con sesión; si tienen contraseña temporal, los manda a cambiarla.
export function RutaPrivada() {
  const { cargando, sesion, perfil } = useAuth()
  const { pathname } = useLocation()

  if (cargando) return <PantallaCarga />
  if (!sesion) return <Navigate to="/entrar" replace />
  if (!perfil) return <PerfilNoEncontrado />
  if (perfil.debe_cambiar_contrasena && pathname !== '/cambiar-contrasena') {
    return <Navigate to="/cambiar-contrasena" replace />
  }
  return <Outlet />
}

export function RutaAdmin() {
  const { perfil } = useAuth()
  if (!perfil?.es_admin) return <Navigate to="/" replace />
  return <Outlet />
}
