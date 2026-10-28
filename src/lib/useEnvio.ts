import { useState } from 'react'
import { hayConexion } from './conexion'
import { traducirErrorDatos, type MensajesDeError } from './errores'

// Estado de un formulario que guarda algo: «guardando…» y el mensaje de error.
export function useEnvio(mensajes?: MensajesDeError) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(accion: () => Promise<void>) {
    // Sin internet se avisa enseguida, en vez de esperar a que Supabase se dé por vencido.
    if (!hayConexion()) {
      setError('No hay internet. Inténtalo de nuevo cuando vuelvas a tener conexión.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await accion()
    } catch (e) {
      setError(traducirErrorDatos(e, mensajes))
    } finally {
      setGuardando(false)
    }
  }

  return { guardando, error, enviar }
}
