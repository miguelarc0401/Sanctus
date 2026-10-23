import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/contexto'
import { AreaTexto, Boton, Campo, MensajeError, Selector } from '../components/Formulario'
import { llamarFuncion } from '../lib/consultas'
import { traducirError } from '../lib/errores'
import { supabase } from '../lib/supabase'
import { correoDeAcceso, sugerirUsuario } from '../lib/usuarios'

type GrupoPublico = { id: number; nombre: string; santo: { nombre: string } }

export function Registro() {
  const { sesion, cargando } = useAuth()
  const [nombre, setNombre] = useState('')
  const [acceso, setAcceso] = useState('')
  const [accesoEditado, setAccesoEditado] = useState(false)
  const [contrasena, setContrasena] = useState('')
  const [repetida, setRepetida] = useState('')
  const [grupo, setGrupo] = useState('')
  const [nota, setNota] = useState('')
  const [trampa, setTrampa] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const { data: grupos = [] } = useQuery({
    queryKey: ['registro', 'grupos'],
    queryFn: async () => (await llamarFuncion<{ grupos: GrupoPublico[] }>('registro')).grupos,
  })

  if (!cargando && sesion) return <Navigate to="/" replace />

  async function registrarme() {
    if (contrasena.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (contrasena !== repetida) return setError('Las contraseñas no coinciden.')
    setEnviando(true)
    setError(null)
    try {
      await llamarFuncion('registro', {
        nombre,
        acceso,
        contrasena,
        grupo_id: grupo ? Number(grupo) : null,
        nota,
        sitio: trampa,
      })
      // Al entrar, la app muestra que la solicitud está en espera.
      const { error } = await supabase.auth.signInWithPassword({ email: correoDeAcceso(acceso), password: contrasena })
      if (error) setError(traducirError(error))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <Link to="/entrar" className="mb-6 inline-flex items-center gap-1 text-sm text-cielo-700">
        <ArrowLeft className="size-4" aria-hidden /> Ya tengo cuenta
      </Link>
      <img src="/logo.svg" alt="" className="size-14 rounded-2xl shadow" />
      <h1 className="mt-4 font-serif text-4xl font-semibold text-cielo-800">Crear mi cuenta</h1>
      <p className="mt-2 text-stone-600">Tu coordinador revisará tu solicitud y te dará acceso a tu grupo.</p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void registrarme()
        }}
      >
        <Campo
          id="nombre"
          etiqueta="Nombre completo"
          required
          autoComplete="name"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value)
            if (!accesoEditado) setAcceso(sugerirUsuario(e.target.value))
          }}
        />
        <Campo
          id="acceso"
          etiqueta="Usuario"
          ayuda="(o tu correo, si tienes)"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={acceso}
          onChange={(e) => {
            setAcceso(e.target.value)
            setAccesoEditado(true)
          }}
        />
        <p className="-mt-2 text-sm text-stone-500">Con esto vas a entrar a la app. Sin espacios ni acentos.</p>
        <Campo
          id="contrasena"
          etiqueta="Contraseña"
          ayuda="(mínimo 8 caracteres)"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        <Campo
          id="repetida"
          etiqueta="Repite la contraseña"
          type="password"
          required
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
        <Selector id="grupo" etiqueta="¿A qué grupo perteneces?" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
          <option value="">No sé / otro</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.santo.nombre} · {g.nombre}
            </option>
          ))}
        </Selector>
        <AreaTexto
          id="nota"
          etiqueta="Nota para el coordinador"
          ayuda="(opcional)"
          rows={2}
          maxLength={300}
          placeholder="Por ejemplo: soy hijo de María López"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        {/* Campo trampa para robots: las personas no lo ven. */}
        <input
          type="text"
          name="sitio"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
          value={trampa}
          onChange={(e) => setTrampa(e.target.value)}
        />
        {error && <MensajeError>{error}</MensajeError>}
        <Boton type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Enviando…' : 'Enviar solicitud'}
        </Boton>
      </form>
    </div>
  )
}
