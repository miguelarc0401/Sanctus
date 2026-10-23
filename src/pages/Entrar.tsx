import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Boton, Campo, MensajeError } from '../components/Formulario'
import { traducirError } from '../lib/errores'
import { supabase } from '../lib/supabase'
import { correoDeAcceso } from '../lib/usuarios'

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
    const { error } = await supabase.auth.signInWithPassword({ email: correoDeAcceso(correo), password: contrasena })
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
          etiqueta="Correo o usuario"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
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

      <div className="mt-8 w-full max-w-sm space-y-3 text-center">
        <Link
          to="/registro"
          className="block rounded-xl bg-white px-5 py-3 font-medium text-cielo-800 ring-1 ring-stone-300 hover:bg-cielo-50"
        >
          ¿Eres nuevo? Crea tu cuenta
        </Link>
        <p className="text-sm text-stone-500">¿Olvidaste tu contraseña? Habla con tu coordinador.</p>
      </div>
    </div>
  )
}
