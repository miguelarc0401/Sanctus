const porCodigo: Record<string, string> = {
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  email_not_confirmed: 'Tu correo aún no está confirmado. Avísale a tu coordinador.',
  same_password: 'La nueva contraseña debe ser distinta de la anterior.',
  weak_password: 'Esa contraseña es muy débil. Prueba con una más larga.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a probar.',
}

export function traducirError(error: { code?: string; message: string }) {
  if (error.code && porCodigo[error.code]) return porCodigo[error.code]
  if (error.message.toLowerCase().includes('fetch')) return 'No hay conexión. Revisa tu internet.'
  return 'Algo salió mal. Inténtalo de nuevo en un momento.'
}

export type MensajesDeError = { duplicado?: string; sinPermiso?: string }

// Errores al guardar o borrar en la base de datos.
export function traducirErrorDatos(error: unknown, mensajes: MensajesDeError = {}) {
  const { code, message } = (error ?? {}) as { code?: string; message?: string }
  if (code === '23505') return mensajes.duplicado ?? 'Ya existe un registro con esos datos.'
  if (code === '23503') return 'No se puede borrar porque todavía se está usando en otra parte.'
  if (code === '42501') return mensajes.sinPermiso ?? 'No tienes permiso para hacer esto.'
  if (message?.toLowerCase().includes('fetch')) return 'No hay conexión. Revisa tu internet.'
  return message || 'Algo salió mal. Inténtalo de nuevo en un momento.'
}
