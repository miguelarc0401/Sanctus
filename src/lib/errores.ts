const porCodigo: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
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
