import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Boton, Campo, MensajeError } from '../components/Formulario'
import { traducirError } from '../lib/errores'
import { supabase } from '../lib/supabase'

export function CambiarContrasena() {
  const { perfil, recargarPerfil } = useAuth()
  const navegar = useNavigate()
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const esTemporal = perfil?.debe_cambiar_contrasena ?? false

  async function guardar() {
    if (nueva.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (nueva !== repetida) return setError('Las contraseñas no coinciden.')
    setEnviando(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: nueva })
    if (error) {
      setEnviando(false)
      return setError(traducirError(error))
    }
    if (esTemporal) {
      await supabase.rpc('marcar_contrasena_cambiada')
      await recargarPerfil()
    }
    navegar(esTemporal ? '/' : '/mas', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      {!esTemporal && (
        <Link to="/mas" className="mb-6 inline-flex items-center gap-1 text-sm text-cielo-700">
          <ArrowLeft className="size-4" aria-hidden /> Volver
        </Link>
      )}
      <h1 className="font-serif text-4xl font-semibold text-cielo-800">
        {esTemporal ? 'Crea tu contraseña' : 'Cambiar contraseña'}
      </h1>
      {esTemporal && (
        <p className="mt-2 text-stone-600">
          Es tu primera vez aquí. Cambia la contraseña temporal por una que sólo tú conozcas.
        </p>
      )}

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
      >
        <Campo
          id="nueva"
          etiqueta="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
        <Campo
          id="repetida"
          etiqueta="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
        {error && <MensajeError>{error}</MensajeError>}
        <Boton type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </Boton>
      </form>
    </div>
  )
}
