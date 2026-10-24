import { Clock, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/contexto'
import { Boton } from './Formulario'
import { useTituloDocumento } from '../lib/useTituloDocumento'

// Pantalla de entrada: el manto azul con el logo arriba y una tarjeta blanca con el contenido.
export function PantallaAcceso({
  titulo,
  subtitulo,
  arriba,
  children,
  pie,
}: {
  titulo: string
  subtitulo?: ReactNode
  arriba?: ReactNode
  children: ReactNode
  pie?: ReactNode
}) {
  useTituloDocumento(titulo === 'Santa María' ? null : titulo)
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="manto rounded-b-[2.5rem] px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-20 text-center text-white">
        <div className="mx-auto max-w-sm">
          {arriba && <div className="mb-4 text-left">{arriba}</div>}
          <img src="/logo.svg" alt="" className="mx-auto size-20 rounded-3xl shadow-xl ring-4 ring-white/10" />
          <h1 className="mt-5 font-serif text-5xl leading-none font-semibold text-balance">{titulo}</h1>
          {subtitulo && <p className="mt-3 text-pretty text-cielo-100">{subtitulo}</p>}
        </div>
      </div>
      <main className="-mt-12 flex-1 px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-sm animate-aparecer rounded-3xl bg-white p-6 shadow-xl shadow-cielo-900/10 ring-1 ring-stone-200/80">
          {children}
        </div>
        {pie && <div className="mx-auto mt-6 max-w-sm space-y-3 text-center">{pie}</div>}
      </main>
    </div>
  )
}

function PantallaCentrada({ titulo, Icono, children }: { titulo?: string; Icono?: typeof Clock; children: ReactNode }) {
  useTituloDocumento(titulo ?? null)
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="relative">
        <img src="/logo.svg" alt="" className="size-20 rounded-3xl shadow-lg" />
        {Icono && (
          <span className="absolute -right-2 -bottom-2 grid size-9 place-items-center rounded-full bg-oro-500 text-white ring-4 ring-crema">
            <Icono className="size-5" aria-hidden />
          </span>
        )}
      </div>
      {children}
    </main>
  )
}

export function PantallaCarga() {
  return (
    <main role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <img src="/logo.svg" alt="" className="size-16 animate-pulse rounded-2xl shadow" />
      <p className="text-stone-500">Cargando…</p>
    </main>
  )
}

export function PerfilNoEncontrado() {
  const { cerrarSesion } = useAuth()
  return (
    <PantallaCentrada titulo="No encontramos tu perfil">
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

export function CuentaEnEspera() {
  const { perfil, recargarPerfil, cerrarSesion } = useAuth()
  const suspendida = perfil?.estado === 'suspendido'
  const titulo = suspendida ? 'Tu cuenta está desactivada' : `¡Gracias, ${perfil?.nombre.split(' ')[0]}!`
  return (
    <PantallaCentrada titulo={titulo} Icono={suspendida ? Lock : Clock}>
      <h1 className="mt-2 font-serif text-4xl font-semibold text-balance text-cielo-800">{titulo}</h1>
      <p className="max-w-sm text-pretty text-stone-600">
        {suspendida
          ? 'Habla con tu coordinador para volver a activarla.'
          : 'Tu solicitud ya le llegó al coordinador. En cuanto la apruebe podrás entrar a tu grupo.'}
      </p>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
        {!suspendida && <Boton onClick={() => void recargarPerfil()}>Ya me aprobaron, revisar</Boton>}
        <Boton variante="secundario" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Boton>
      </div>
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
