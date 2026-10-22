import { useState } from 'react'
import { traducirErrorDatos } from './errores'

// Estado de un formulario que guarda algo: «guardando…» y el mensaje de error.
export function useEnvio(siDuplicado?: string) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(accion: () => Promise<void>) {
    setGuardando(true)
    setError(null)
    try {
      await accion()
    } catch (e) {
      setError(traducirErrorDatos(e, siDuplicado))
    } finally {
      setGuardando(false)
    }
  }

  return { guardando, error, enviar }
}
