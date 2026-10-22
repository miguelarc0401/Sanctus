import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { Cargando, EncabezadoAdmin, EtiquetaTipo, Vacio } from '../components/Bloques'
import { AreaTexto, Campo, Casilla, MensajeError, PieFormulario, Selector } from '../components/Formulario'
import { Hoja } from '../components/Hoja'
import { borrarFila, datos, guardarFila } from '../lib/consultas'
import { aValorDeCampo, deValorDeCampo, diaLargo, hora, inicioDeHoy } from '../lib/fechas'
import { supabase } from '../lib/supabase'
import { TIPOS_EVENTO, type Evento, type TipoEvento } from '../lib/tipos'
import { useEnvio } from '../lib/useEnvio'
import { Destino, SelectorDeDestino } from './comunes'

function FormEvento({ evento, onListo }: { evento: Evento | null; onListo: () => void }) {
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo ?? 'actividad')
  const [titulo, setTitulo] = useState(evento?.titulo ?? '')
  const [todoElDia, setTodoElDia] = useState(evento?.todo_el_dia ?? false)
  const [inicio, setInicio] = useState(evento ? aValorDeCampo(evento.inicio, !evento.todo_el_dia) : '')
  const [fin, setFin] = useState(evento?.fin ? aValorDeCampo(evento.fin, !evento.todo_el_dia) : '')
  const [lugar, setLugar] = useState(evento?.lugar ?? '')
  const [descripcion, setDescripcion] = useState(evento?.descripcion ?? '')
  const [destino, setDestino] = useState(evento?.grupo_id ? String(evento.grupo_id) : '')
  const [errorFechas, setErrorFechas] = useState<string | null>(null)
  const { guardando, error, enviar } = useEnvio()

  // Al cambiar entre «todo el día» y «con hora», se conserva la fecha y se ajusta el formato del campo.
  function cambiarTodoElDia(valor: boolean) {
    const convertir = (v: string) => (!v ? '' : valor ? v.slice(0, 10) : `${v}T18:00`)
    setTodoElDia(valor)
    setInicio(convertir(inicio))
    setFin(convertir(fin))
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (fin && deValorDeCampo(fin) < deValorDeCampo(inicio)) {
          setErrorFechas('La fecha de fin no puede ser antes que la de inicio.')
          return
        }
        setErrorFechas(null)
        void enviar(async () => {
          await guardarFila('eventos', evento?.id ?? null, {
            tipo,
            titulo: titulo.trim(),
            todo_el_dia: todoElDia,
            inicio: deValorDeCampo(inicio),
            fin: fin ? deValorDeCampo(fin) : null,
            lugar: lugar.trim() || null,
            descripcion: descripcion.trim() || null,
            grupo_id: destino ? Number(destino) : null,
          })
          onListo()
        })
      }}
    >
      <Selector id="tipo" etiqueta="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)}>
        {(Object.keys(TIPOS_EVENTO) as TipoEvento[]).map((t) => (
          <option key={t} value={t}>
            {TIPOS_EVENTO[t].nombre}
          </option>
        ))}
      </Selector>
      <Campo id="titulo" etiqueta="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <Casilla id="todo-el-dia" etiqueta="Todo el día" checked={todoElDia} onChange={(e) => cambiarTodoElDia(e.target.checked)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="inicio"
          etiqueta="Empieza"
          type={todoElDia ? 'date' : 'datetime-local'}
          required
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
        />
        <Campo
          id="fin"
          etiqueta="Termina"
          ayuda="(opcional)"
          type={todoElDia ? 'date' : 'datetime-local'}
          min={inicio}
          value={fin}
          onChange={(e) => setFin(e.target.value)}
        />
      </div>
      <Campo id="lugar" etiqueta="Lugar" ayuda="(opcional)" value={lugar} onChange={(e) => setLugar(e.target.value)} />
      <AreaTexto
        id="descripcion"
        etiqueta="Detalles"
        ayuda="(opcional)"
        rows={3}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      <SelectorDeDestino valor={destino} onCambiar={setDestino} />
      {(errorFechas || error) && <MensajeError>{errorFechas ?? error}</MensajeError>}
      <PieFormulario
        guardando={guardando}
        onEliminar={
          evento
            ? () => {
                if (!confirm('¿Eliminar este evento?')) return
                void enviar(async () => {
                  await borrarFila('eventos', evento.id)
                  onListo()
                })
              }
            : undefined
        }
      />
    </form>
  )
}

function ListaEventos({ eventos, onEditar }: { eventos: Evento[]; onEditar: (e: Evento) => void }) {
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <button
            onClick={() => onEditar(evento)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cielo-50"
          >
            <span className="min-w-0 flex-1 space-y-0.5">
              <EtiquetaTipo tipo={evento.tipo} />
              <span className="block truncate text-stone-900">{evento.titulo}</span>
              <span className="block text-sm text-stone-600">
                {diaLargo(evento.inicio)}
                {!evento.todo_el_dia && `, ${hora(evento.inicio)}`}
              </span>
              <Destino grupoId={evento.grupo_id} />
            </span>
            <Pencil className="size-4 shrink-0 text-stone-400" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function EventosAdmin() {
  const clienteConsultas = useQueryClient()
  const [editando, setEditando] = useState<Evento | 'nuevo' | null>(null)
  const { data: eventos = [], isPending } = useQuery({
    queryKey: ['eventos', 'admin'],
    queryFn: () => datos<Evento[]>(supabase.from('eventos').select('*').order('inicio').limit(300)),
  })
  const hoy = inicioDeHoy()
  const proximos = eventos.filter((e) => (e.fin ?? e.inicio) >= hoy)
  const pasados = eventos.filter((e) => (e.fin ?? e.inicio) < hoy).reverse()

  return (
    <div className="space-y-5">
      <EncabezadoAdmin titulo="Calendario" textoNuevo="Nuevo evento" onNuevo={() => setEditando('nuevo')} />

      {isPending ? (
        <Cargando />
      ) : eventos.length === 0 ? (
        <Vacio>Todavía no hay eventos.</Vacio>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">Próximos</h2>
            {proximos.length > 0 ? (
              <ListaEventos eventos={proximos} onEditar={setEditando} />
            ) : (
              <Vacio>No hay eventos próximos.</Vacio>
            )}
          </section>
          {pasados.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">Anteriores</h2>
              <ListaEventos eventos={pasados} onEditar={setEditando} />
            </section>
          )}
        </>
      )}

      {editando && (
        <Hoja titulo={editando === 'nuevo' ? 'Nuevo evento' : 'Editar evento'} onCerrar={() => setEditando(null)}>
          <FormEvento
            evento={editando === 'nuevo' ? null : editando}
            onListo={() => {
              setEditando(null)
              void clienteConsultas.invalidateQueries({ queryKey: ['eventos'] })
            }}
          />
        </Hoja>
      )}
    </div>
  )
}
