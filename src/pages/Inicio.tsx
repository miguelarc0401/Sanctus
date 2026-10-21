import { CalendarDays, Megaphone, Sparkles } from 'lucide-react'
import { useAuth } from '../auth/contexto'
import { AvisoInstalar } from '../components/AvisoInstalar'

export function Inicio() {
  const { perfil } = useAuth()
  const primerNombre = perfil?.nombre.split(' ')[0]

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl font-semibold text-cielo-800">Hola, {primerNombre}</h1>

      <AvisoInstalar />

      <section className="rounded-2xl bg-cielo-800 p-5 text-white shadow">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-oro-400 uppercase">
          <Sparkles className="size-4" aria-hidden /> Virtud de la semana
        </p>
        <p className="mt-2 font-serif text-3xl">Muy pronto</p>
        <p className="mt-1 text-cielo-100">
          Aquí verás cada semana la virtud a ejercitar, con ejemplos concretos para vivirla.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <h2 className="flex items-center gap-2 font-medium text-cielo-800">
          <CalendarDays className="size-5" aria-hidden /> Próximos eventos
        </h2>
        <p className="mt-2 text-sm text-stone-500">Todavía no hay eventos.</p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <h2 className="flex items-center gap-2 font-medium text-cielo-800">
          <Megaphone className="size-5" aria-hidden /> Últimos avisos
        </h2>
        <p className="mt-2 text-sm text-stone-500">Todavía no hay avisos.</p>
      </section>
    </div>
  )
}
