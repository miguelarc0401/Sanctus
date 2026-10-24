import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Boton, Campo, MensajeError } from '../components/Formulario'
import { PantallaAcceso } from '../components/Pantallas'
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
    <PantallaAcceso
      titulo={esTemporal ? 'Crea tu contraseña' : 'Cambiar contraseña'}
      subtitulo={esTemporal ? 'Es tu primera vez aquí. Cambia la contraseña temporal por una que sólo tú conozcas.' : undefined}
      arriba={
        !esTemporal && (
          <Link to="/mas" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-cielo-100 hover:bg-white/10">
            <ArrowLeft className="size-4" aria-hidden /> Volver
          </Link>
        )
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
      >
        <Campo
          id="nueva"
          etiqueta="Nueva contraseña"
          ayuda="(mínimo 8 caracteres)"
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
    </PantallaAcceso>
  )
}
