import { Clock, MapPin, Pin, Sparkles } from 'lucide-react'
import { aFechaISO, diaCorto, diaLargo, diaSemana, hora, semanaDel } from '../lib/fechas'
import type { Aviso, Evento, Virtud } from '../lib/tipos'
import { EtiquetaTipo } from './Bloques'

const mismoDia = (a: string, b: string) => aFechaISO(new Date(a)) === aFechaISO(new Date(b))

function horario(evento: Evento) {
  const { inicio, fin, todo_el_dia } = evento
  if (todo_el_dia) return fin && !mismoDia(inicio, fin) ? `Todo el día, hasta el ${diaLargo(fin)}` : 'Todo el día'
  if (!fin) return hora(inicio)
  return mismoDia(inicio, fin) ? `${hora(inicio)} – ${hora(fin)}` : `${hora(inicio)} – ${diaLargo(fin)}, ${hora(fin)}`
}

export function FilaEvento({ evento }: { evento: Evento }) {
  return (
    <li className="flex gap-4 py-4">
      <div className="w-14 shrink-0 self-start rounded-xl bg-cielo-50 py-2 text-center ring-1 ring-cielo-100">
        <p className="text-xs text-cielo-600 uppercase">{diaSemana(evento.inicio)}</p>
        <p className="font-serif text-3xl leading-none font-semibold text-cielo-800">{new Date(evento.inicio).getDate()}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <EtiquetaTipo tipo={evento.tipo} />
        <p className="font-medium text-stone-900">{evento.titulo}</p>
        <p className="flex items-center gap-1.5 text-sm text-stone-600">
          <Clock className="size-4 shrink-0" aria-hidden /> {horario(evento)}
        </p>
        {evento.lugar && (
          <p className="flex items-center gap-1.5 text-sm text-stone-600">
            <MapPin className="size-4 shrink-0" aria-hidden /> {evento.lugar}
          </p>
        )}
        {evento.descripcion && <p className="pt-1 text-sm whitespace-pre-line text-stone-600">{evento.descripcion}</p>}
      </div>
    </li>
  )
}

export function TarjetaAviso({ aviso }: { aviso: Aviso }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-start gap-2">
        {aviso.fijado && <Pin className="mt-1 size-4 shrink-0 text-oro-500" aria-label="Fijado" />}
        <h3 className="font-medium text-stone-900">{aviso.titulo}</h3>
      </div>
      <p className="mt-0.5 text-xs text-stone-500">{diaCorto(aviso.publicado_en)}</p>
      <p className="mt-2 whitespace-pre-line text-stone-700">{aviso.texto}</p>
    </article>
  )
}

export function TarjetaVirtud({ virtud }: { virtud: Virtud | null }) {
  return (
    <section className="rounded-2xl bg-cielo-800 p-5 text-white shadow">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-oro-400 uppercase">
        <Sparkles className="size-4" aria-hidden /> Virtud de la semana
      </p>
      {virtud ? (
        <>
          <p className="mt-2 font-serif text-4xl font-semibold">{virtud.virtud}</p>
          <p className="text-sm text-cielo-200">{semanaDel(virtud.semana)}</p>
          {virtud.explicacion && <p className="mt-3 whitespace-pre-line text-cielo-50">{virtud.explicacion}</p>}
          {virtud.ejemplos.length > 0 && (
            <div className="mt-4 rounded-xl bg-white/10 p-4">
              <p className="text-sm font-medium text-oro-400">Para vivirla esta semana</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-cielo-50 marker:text-oro-400">
                {virtud.ejemplos.map((ejemplo) => (
                  <li key={ejemplo}>{ejemplo}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 font-serif text-3xl">Muy pronto</p>
          <p className="mt-1 text-cielo-100">Aquí verás cada semana la virtud a ejercitar, con ejemplos concretos.</p>
        </>
      )}
    </section>
  )
}
