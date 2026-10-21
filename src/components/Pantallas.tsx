import { useAuth } from '../auth/contexto'
import { Boton } from './Formulario'

function PantallaCentrada({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <img src="/logo.svg" alt="" className="size-16 rounded-2xl shadow" />
      {children}
    </div>
  )
}

export function PantallaCarga() {
  return (
    <PantallaCentrada>
      <p className="animate-pulse text-stone-500">Cargando…</p>
    </PantallaCentrada>
  )
}

export function PerfilNoEncontrado() {
  const { cerrarSesion } = useAuth()
  return (
    <PantallaCentrada>
      <h1 className="font-serif text-3xl font-semibold text-cielo-800">No encontramos tu perfil</h1>
      <p className="max-w-sm text-stone-600">
        Tu cuenta existe, pero todavía no tiene perfil en la app. Avísale a tu coordinador.
      </p>
      <Boton variante="secundario" onClick={() => void cerrarSesion()}>
        Cerrar sesión
      </Boton>
    </PantallaCentrada>
  )
}

export function FaltaConfiguracion() {
  return (
    <PantallaCentrada>
      <h1 className="font-serif text-3xl font-semibold text-cielo-800">Falta configurar Supabase</h1>
      <p className="max-w-md text-stone-600">
        Define <code className="rounded bg-stone-200 px-1">VITE_SUPABASE_URL</code> y{' '}
        <code className="rounded bg-stone-200 px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> en{' '}
        <code className="rounded bg-stone-200 px-1">.env.local</code> (o en Cloudflare) y vuelve a
        cargar la app.
      </p>
    </PantallaCentrada>
  )
}
