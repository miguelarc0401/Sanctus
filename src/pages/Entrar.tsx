import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Boton, Campo, MensajeError } from '../components/Formulario'
import { PantallaAcceso } from '../components/Pantallas'
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
    <PantallaAcceso
      titulo="Santa María"
      subtitulo="La app de los grupos de la parroquia"
      pie={
        <>
          <Link
            to="/registro"
            className="flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 font-medium text-cielo-800 ring-1 ring-stone-300 hover:bg-cielo-50"
          >
            ¿Eres nuevo? Crea tu cuenta
          </Link>
          <p className="text-sm text-stone-600">¿Olvidaste tu contraseña? Habla con tu coordinador.</p>
        </>
      }
    >
      <h2 className="font-serif text-2xl font-semibold text-cielo-800">¡Hola!</h2>
      <p className="mt-1 text-sm text-stone-600">Inicia sesión para entrar a tu grupo.</p>
      <form
        className="mt-6 space-y-4"
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
    </PantallaAcceso>
  )
}
