import { CalendarPlus, Check, Clock, MapPin, Pin, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { descargarIcs, enlaceGoogle } from '../lib/calendario'
import { aFechaISO, cuandoEs, diaLargo, diaSemana, haceCuanto, hora, mesCorto, semanaDel } from '../lib/fechas'
import type { Aviso, Evento, Virtud } from '../lib/tipos'
import { EtiquetaTipo } from './Bloques'
import { Hoja } from './Hoja'
import { TextoConEnlaces } from './TextoConEnlaces'

const mismoDia = (a: string, b: string) => aFechaISO(new Date(a)) === aFechaISO(new Date(b))

function horario(evento: Evento) {
  const { inicio, fin, todo_el_dia } = evento
  if (todo_el_dia) return fin && !mismoDia(inicio, fin) ? `Todo el día, hasta el ${diaLargo(fin)}` : 'Todo el día'
  if (!fin) return hora(inicio)
  return mismoDia(inicio, fin) ? `${hora(inicio)} – ${hora(fin)}` : `${hora(inicio)} – ${diaLargo(fin)}, ${hora(fin)}`
}

function AgregarAlCalendario({ evento }: { evento: Evento }) {
  const [abierta, setAbierta] = useState(false)
  return (
    <>
      <button
        onClick={() => setAbierta(true)}
        className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-cielo-700 hover:bg-cielo-50 hover:text-cielo-900"
      >
        <CalendarPlus className="size-4" aria-hidden /> Agregar a mi calendario
      </button>
      {abierta && (
        <Hoja titulo="Agregar a mi calendario" onCerrar={() => setAbierta(false)}>
          <div className="space-y-3">
            <p className="text-stone-600">{evento.titulo}</p>
            <a
              href={enlaceGoogle(evento)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setAbierta(false)}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-cielo-800 px-5 py-3 font-medium text-white hover:bg-cielo-700"
            >
              Google Calendar
            </a>
            <button
              onClick={() => {
                descargarIcs(evento)
                setAbierta(false)
              }}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-5 py-3 font-medium text-cielo-800 ring-1 ring-stone-300 hover:bg-cielo-50"
            >
              iPhone u otro calendario
            </button>
          </div>
        </Hoja>
      )}
    </>
  )
}

// Hojita de calendario: mes arriba, día grande y día de la semana.
function HojaDeCalendario({ iso, destacada }: { iso: string; destacada: boolean }) {
  return (
    <div
      aria-hidden
      className={`w-14 shrink-0 self-start overflow-hidden rounded-xl bg-white text-center ring-1 ${destacada ? 'ring-oro-400' : 'ring-cielo-100'}`}
    >
      <p className={`py-0.5 text-[0.7rem] font-semibold tracking-wider uppercase ${destacada ? 'bg-oro-500 text-white' : 'bg-cielo-800 text-cielo-50'}`}>
        {mesCorto(iso)}
      </p>
      <p className="pt-1 font-serif text-3xl leading-none font-semibold text-cielo-800">{new Date(iso).getDate()}</p>
      <p className="pb-1.5 text-xs text-stone-500">{diaSemana(iso).replace('.', '')}</p>
    </div>
  )
}

export function FilaEvento({ evento }: { evento: Evento }) {
  const cuando = cuandoEs(evento.inicio, evento.fin)
  const pronto = cuando === 'Hoy' || cuando === 'En curso'
  return (
    <li className="flex gap-4 py-4">
      <HojaDeCalendario iso={evento.inicio} destacada={pronto} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <EtiquetaTipo tipo={evento.tipo} />
          {cuando && (
            <span className={`text-xs font-semibold ${pronto ? 'text-oro-700' : 'text-cielo-700'}`}>{cuando}</span>
          )}
        </div>
        <p className="font-medium text-pretty text-stone-900">
          <span className="sr-only">{diaLargo(evento.inicio)}: </span>
          {evento.titulo}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-stone-600">
          <Clock className="size-4 shrink-0" aria-hidden /> {horario(evento)}
        </p>
        {evento.lugar && (
          <div className="flex items-start gap-1.5 text-sm text-stone-600">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <TextoConEnlaces className="min-w-0">{evento.lugar}</TextoConEnlaces>
          </div>
        )}
        {evento.descripcion && <TextoConEnlaces className="pt-1 text-sm text-stone-600">{evento.descripcion}</TextoConEnlaces>}
        <AgregarAlCalendario evento={evento} />
      </div>
    </li>
  )
}

export function TarjetaAviso({ aviso }: { aviso: Aviso }) {
  return (
    <article
      className={`rounded-2xl p-5 shadow-tarjeta ring-1 ${aviso.fijado ? 'bg-oro-50 ring-oro-400/50' : 'bg-white ring-stone-200/80'}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {aviso.fijado && (
          <span className="inline-flex items-center gap-1 font-semibold text-oro-700">
            <Pin className="size-3.5" aria-hidden /> Fijado
          </span>
        )}
        <span className="text-stone-500">{haceCuanto(aviso.publicado_en)}</span>
        {aviso.grupo_id === null && <span className="text-stone-500">· Para toda la parroquia</span>}
      </div>
      <h3 className="mt-1 font-semibold text-pretty text-stone-900">{aviso.titulo}</h3>
      <TextoConEnlaces className="mt-1.5 text-stone-700">{aviso.texto}</TextoConEnlaces>
    </article>
  )
}

// Los ejemplos que la persona ya vivió esta semana (se guardan sólo en este teléfono).
function useEjemplosVividos(virtudId: number) {
  const clave = `virtud-vivida-${virtudId}`
  const [vividos, setVividos] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(clave) ?? '[]') as number[]
    } catch {
      return []
    }
  })
  const alternar = (i: number) => {
    const nuevos = vividos.includes(i) ? vividos.filter((v) => v !== i) : [...vividos, i]
    setVividos(nuevos)
    try {
      localStorage.setItem(clave, JSON.stringify(nuevos))
    } catch {
      // Sin almacenamiento sólo se recuerda mientras la app esté abierta.
    }
  }
  return { vividos, alternar }
}

function EjemplosDeLaVirtud({ virtud }: { virtud: Virtud }) {
  const { vividos, alternar } = useEjemplosVividos(virtud.id)
  const cuantos = virtud.ejemplos.filter((_, i) => vividos.includes(i)).length
  const todos = cuantos === virtud.ejemplos.length

  return (
    <fieldset className="mt-5 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
      <legend className="sr-only">Para vivirla esta semana</legend>
      <div className="flex items-center justify-between gap-3" aria-hidden>
        <p className="text-sm font-semibold text-oro-400">Para vivirla esta semana</p>
        <p className="text-xs text-cielo-100 tabular-nums">
          {cuantos} de {virtud.ejemplos.length}
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {virtud.ejemplos.map((ejemplo, i) => {
          const hecho = vividos.includes(i)
          return (
            <li key={ejemplo}>
              <label className="group flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                <input type="checkbox" className="peer sr-only" checked={hecho} onChange={() => alternar(i)} />
                <span
                  aria-hidden
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-2 transition peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-oro-400 ${
                    hecho ? 'bg-oro-400 text-cielo-900 ring-oro-400' : 'ring-cielo-200/60'
                  }`}
                >
                  {hecho && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={`transition ${hecho ? 'text-cielo-200 line-through decoration-oro-400/70' : 'text-cielo-50'}`}>
                  {ejemplo}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {todos && (
        <p role="status" className="mt-2 px-2 text-sm font-medium text-oro-400">
          ¡Muy bien! Sigue así toda la semana.
        </p>
      )}
    </fieldset>
  )
}

export function TarjetaVirtud({ virtud }: { virtud: Virtud | null }) {
  return (
    <section aria-labelledby="titulo-virtud" className="manto relative overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-cielo-900/20">
      {/* Resplandor dorado en la esquina, como una estrella. */}
      <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-oro-400/20 blur-3xl" />
      <p id="titulo-virtud" className="relative flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-oro-400 uppercase">
        <Sparkles className="size-4" aria-hidden /> Virtud de la semana
      </p>
      {virtud ? (
        <div className="relative">
          <p className="mt-2 font-serif text-5xl leading-none font-semibold">{virtud.virtud}</p>
          <p className="mt-2 text-sm text-cielo-200">{semanaDel(virtud.semana)}</p>
          {virtud.explicacion && (
            <TextoConEnlaces
              className="mt-4 text-lg leading-relaxed text-cielo-50"
              claseEnlace="text-oro-400 decoration-oro-400/50 hover:text-white"
            >
              {virtud.explicacion}
            </TextoConEnlaces>
          )}
          {virtud.ejemplos.length > 0 && <EjemplosDeLaVirtud virtud={virtud} />}
        </div>
      ) : (
        <div className="relative">
          <p className="mt-2 font-serif text-4xl">Muy pronto</p>
          <p className="mt-1 text-cielo-100">Aquí verás cada semana la virtud a ejercitar, con ejemplos concretos.</p>
        </div>
      )}
    </section>
  )
}
