import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Cargando, Chip, Encabezado, Segmentos, Tarjeta, TituloSeccion, Vacio } from '../components/Bloques'
import { FilaEvento } from '../components/Contenido'
import { useGrupos } from '../grupos/contexto'
import { useEventosDelMes, useEventosPasados, useProximosEventos } from '../lib/contenido'
import { aFechaISO, deFechaISO, diaLargo, hoyISO, mes as nombreMes } from '../lib/fechas'
import { TIPOS_EVENTO, type Evento, type TipoEvento } from '../lib/tipos'

type Vista = 'proximos' | 'mes' | 'anteriores'

function porMes(eventos: Evento[]) {
  const meses = new Map<string, Evento[]>()
  for (const evento of eventos) {
    const clave = nombreMes(evento.inicio)
    meses.set(clave, [...(meses.get(clave) ?? []), evento])
  }
  return [...meses.entries()]
}

function ListaPorMes({ eventos }: { eventos: Evento[] }) {
  return porMes(eventos).map(([titulo, delMes]) => (
    <section key={titulo} className="space-y-2">
      <TituloSeccion>{titulo}</TituloSeccion>
      <Tarjeta className="py-1">
        <ul className="divide-y divide-stone-100">
          {delMes.map((evento) => (
            <FilaEvento key={evento.id} evento={evento} />
          ))}
        </ul>
      </Tarjeta>
    </section>
  ))
}

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Un evento cae en un día si ese día está entre su inicio y su fin (los campamentos duran varios).
const caeEn = (evento: Evento, dia: string) =>
  aFechaISO(new Date(evento.inicio)) <= dia && aFechaISO(new Date(evento.fin ?? evento.inicio)) >= dia

function VistaMes({ grupoId, filtrar }: { grupoId: number | null; filtrar: (e: Evento) => boolean }) {
  const [ahora] = useState(() => new Date())
  const [{ anio, mes }, setMes] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() })
  const [elegido, setElegido] = useState<string | null>(null)
  const consulta = useEventosDelMes(grupoId, anio, mes)
  const eventos = (consulta.data ?? []).filter(filtrar)
  const hoy = hoyISO()
  const esteMes = anio === ahora.getFullYear() && mes === ahora.getMonth()

  const primero = new Date(anio, mes, 1)
  const hueco = (primero.getDay() + 6) % 7
  const totalDias = new Date(anio, mes + 1, 0).getDate()
  const dias = Array.from({ length: totalDias }, (_, i) => aFechaISO(new Date(anio, mes, i + 1)))
  const titulo = nombreMes(primero.toISOString())

  function mover(cuanto: number) {
    const nuevo = new Date(anio, mes + cuanto, 1)
    setMes({ anio: nuevo.getFullYear(), mes: nuevo.getMonth() })
    setElegido(null)
  }

  const visibles = elegido ? eventos.filter((e) => caeEn(e, elegido)) : eventos

  return (
    <div className="space-y-5">
      <section aria-label="Mes" className="rounded-2xl bg-white p-3 shadow-tarjeta ring-1 ring-stone-200/80 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => mover(-1)} aria-label="Mes anterior" className="grid size-11 place-items-center rounded-full text-cielo-800 hover:bg-cielo-50">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <div className="text-center">
            <h2 aria-live="polite" className="font-serif text-2xl font-semibold text-cielo-800 first-letter:uppercase">
              {titulo}
            </h2>
            {!esteMes && (
              <button
                onClick={() => {
                  setMes({ anio: ahora.getFullYear(), mes: ahora.getMonth() })
                  setElegido(null)
                }}
                className="text-sm font-medium text-cielo-700 underline-offset-2 hover:underline"
              >
                Volver a hoy
              </button>
            )}
          </div>
          <button onClick={() => mover(1)} aria-label="Mes siguiente" className="grid size-11 place-items-center rounded-full text-cielo-800 hover:bg-cielo-50">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>

        <div aria-hidden className="mt-3 grid grid-cols-7 text-center text-xs font-semibold text-stone-500">
          {DIAS_SEMANA.map((d, i) => (
            <span key={i} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {hueco > 0 && <span style={{ gridColumn: `span ${hueco}` }} />}
          {dias.map((dia) => {
            const delDia = eventos.filter((e) => caeEn(e, dia))
            const esElegido = dia === elegido
            const esHoy = dia === hoy
            return (
              <button
                key={dia}
                onClick={() => setElegido(esElegido ? null : dia)}
                aria-pressed={esElegido}
                aria-current={esHoy ? 'date' : undefined}
                aria-label={`${diaLargo(deFechaISO(dia).toISOString())}: ${
                  delDia.length === 0 ? 'sin eventos' : delDia.length === 1 ? '1 evento' : `${delDia.length} eventos`
                }`}
                className={`flex aspect-square min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-sm transition ${
                  esElegido
                    ? 'bg-cielo-800 font-semibold text-white shadow'
                    : esHoy
                      ? 'bg-oro-50 font-semibold text-cielo-900 ring-2 ring-oro-400'
                      : delDia.length
                        ? 'font-semibold text-cielo-900 hover:bg-cielo-50'
                        : 'text-stone-500 hover:bg-stone-100'
                }`}
              >
                {Number(dia.slice(8))}
                <span className="flex h-1.5 gap-0.5">
                  {delDia.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className={`size-1.5 rounded-full ${esElegido ? 'ring-1 ring-white' : ''}`}
                      style={{ background: TIPOS_EVENTO[e.tipo].color }}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        <TituloSeccion
          extra={
            elegido && (
              <button onClick={() => setElegido(null)} className="-mr-2 min-h-10 rounded-full px-2 text-sm font-medium text-cielo-700 hover:bg-cielo-50">
                Ver todo el mes
              </button>
            )
          }
        >
          {elegido ? diaLargo(deFechaISO(elegido).toISOString()) : `Eventos de ${titulo.split(' ')[0]}`}
        </TituloSeccion>
        {consulta.isPending ? (
          <Cargando filas={2} />
        ) : visibles.length === 0 ? (
          <Vacio Icono={CalendarDays}>{elegido ? 'No hay eventos este día.' : 'No hay eventos este mes.'}</Vacio>
        ) : (
          <Tarjeta className="py-1">
            <ul className="divide-y divide-stone-100">
              {visibles.map((evento) => (
                <FilaEvento key={evento.id} evento={evento} />
              ))}
            </ul>
          </Tarjeta>
        )}
      </section>
    </div>
  )
}

export function Calendario() {
  const { grupo } = useGrupos()
  const grupoId = grupo?.id ?? null
  // La vista va en la dirección («?vista=mes»), así «atrás» y los enlaces la respetan.
  const [parametros, setParametros] = useSearchParams()
  const vista: Vista = parametros.get('vista') === 'mes' ? 'mes' : parametros.get('vista') === 'anteriores' ? 'anteriores' : 'proximos'
  const [tipo, setTipo] = useState<TipoEvento | null>(null)
  const proximos = useProximosEventos(grupoId)
  const pasados = useEventosPasados(grupoId, vista === 'anteriores')
  const consulta = vista === 'anteriores' ? pasados : proximos
  const filtrar = (e: Evento) => tipo === null || e.tipo === tipo
  const eventos = (consulta.data ?? []).filter(filtrar)

  return (
    <div className="space-y-5">
      <Encabezado titulo="Calendario" descripcion="Actividades, misas y encuentros de tu grupo y de la parroquia." />

      <Segmentos
        etiqueta="Vista del calendario"
        opciones={[
          { valor: 'proximos', texto: 'Próximos' },
          { valor: 'mes', texto: 'Mes' },
          { valor: 'anteriores', texto: 'Anteriores' },
        ]}
        valor={vista}
        onCambiar={(v) => setParametros(v === 'proximos' ? {} : { vista: v }, { replace: true })}
      />

      <div role="group" aria-label="Filtrar por tipo" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip activo={tipo === null} onClick={() => setTipo(null)}>
          Todos
        </Chip>
        {(Object.keys(TIPOS_EVENTO) as TipoEvento[]).map((t) => (
          <Chip key={t} activo={tipo === t} onClick={() => setTipo(t)} Icono={TIPOS_EVENTO[t].Icono}>
            {TIPOS_EVENTO[t].nombre}
          </Chip>
        ))}
      </div>

      {vista === 'mes' ? (
        <VistaMes grupoId={grupoId} filtrar={filtrar} />
      ) : consulta.isPending ? (
        <Cargando />
      ) : eventos.length === 0 ? (
        <Vacio Icono={CalendarDays}>{vista === 'anteriores' ? 'No hay eventos anteriores.' : 'No hay eventos próximos.'}</Vacio>
      ) : (
        <ListaPorMes eventos={eventos} />
      )}
    </div>
  )
}
