import { useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Boton, Campo, MensajeError } from '../components/Formulario'
import { traducirError } from '../lib/errores'
import { supabase } from '../lib/supabase'

export function Entrar() {
  const { sesion, cargando } = useAuth()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!cargando && sesion) return <Navigate to="/" replace />

  async function entrar() {
    setEnviando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena })
    setEnviando(false)
    if (error) setError(traducirError(error))
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <img src="/logo.svg" alt="" className="size-20 rounded-3xl shadow-lg" />
      <h1 className="mt-5 font-serif text-5xl font-semibold text-cielo-800">Santa María</h1>
      <p className="mt-2 text-stone-600">Inicia sesión para entrar a tu grupo</p>

      <form
        className="mt-8 w-full max-w-sm space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void entrar()
        }}
      >
        <Campo
          id="correo"
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <Campo
          id="contrasena"
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        {error && <MensajeError>{error}</MensajeError>}
        <Boton type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Boton>
      </form>

      <p className="mt-8 max-w-sm text-center text-sm text-stone-500">
        ¿No tienes cuenta u olvidaste tu contraseña? Habla con tu coordinador.
      </p>
    </div>
  )
}
