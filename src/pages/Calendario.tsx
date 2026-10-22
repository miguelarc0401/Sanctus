import { useState } from 'react'
import { Cargando, Tarjeta, Titulo, Vacio } from '../components/Bloques'
import { FilaEvento } from '../components/Contenido'
import { useGrupos } from '../grupos/contexto'
import { useEventosPasados, useProximosEventos } from '../lib/contenido'
import { mes } from '../lib/fechas'
import { TIPOS_EVENTO, type Evento, type TipoEvento } from '../lib/tipos'

function porMes(eventos: Evento[]) {
  const meses = new Map<string, Evento[]>()
  for (const evento of eventos) {
    const clave = mes(evento.inicio)
    meses.set(clave, [...(meses.get(clave) ?? []), evento])
  }
  return [...meses.entries()]
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
        activo ? 'bg-cielo-800 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-cielo-50'
      }`}
    >
      {children}
    </button>
  )
}

export function Calendario() {
  const { grupo } = useGrupos()
  const grupoId = grupo?.id ?? null
  const [verPasados, setVerPasados] = useState(false)
  const [tipo, setTipo] = useState<TipoEvento | null>(null)
  const proximos = useProximosEventos(grupoId)
  const pasados = useEventosPasados(grupoId, verPasados)
  const consulta = verPasados ? pasados : proximos
  const eventos = (consulta.data ?? []).filter((e) => tipo === null || e.tipo === tipo)

  return (
    <div className="space-y-5">
      <Titulo>Calendario</Titulo>

      <div className="grid grid-cols-2 rounded-xl bg-stone-200/70 p-1 text-sm font-medium">
        {[false, true].map((pasado) => (
          <button
            key={String(pasado)}
            onClick={() => setVerPasados(pasado)}
            className={`rounded-lg py-2 transition ${verPasados === pasado ? 'bg-white text-cielo-800 shadow-sm' : 'text-stone-600'}`}
          >
            {pasado ? 'Anteriores' : 'Próximos'}
          </button>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip activo={tipo === null} onClick={() => setTipo(null)}>
          Todos
        </Chip>
        {(Object.keys(TIPOS_EVENTO) as TipoEvento[]).map((t) => (
          <Chip key={t} activo={tipo === t} onClick={() => setTipo(t)}>
            {TIPOS_EVENTO[t].nombre}
          </Chip>
        ))}
      </div>

      {consulta.isPending ? (
        <Cargando />
      ) : eventos.length === 0 ? (
        <Vacio>{verPasados ? 'No hay eventos anteriores.' : 'No hay eventos próximos.'}</Vacio>
      ) : (
        porMes(eventos).map(([nombreMes, delMes]) => (
          <section key={nombreMes} className="space-y-2">
            <h2 className="px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">{nombreMes}</h2>
            <Tarjeta className="py-1">
              <ul className="divide-y divide-stone-100">
                {delMes.map((evento) => (
                  <FilaEvento key={evento.id} evento={evento} />
                ))}
              </ul>
            </Tarjeta>
          </section>
        ))
      )}
    </div>
  )
}
