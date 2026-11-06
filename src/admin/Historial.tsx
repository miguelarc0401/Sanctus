import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, History, LoaderCircle, Pencil, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Cargando, EncabezadoAdmin, TituloSeccion, Vacio } from '../components/Bloques'
import { MensajeError } from '../components/Formulario'
import { datos } from '../lib/consultas'
import { deshacerLote, limpiarHistorial } from '../lib/deshacer'
import { traducirErrorDatos } from '../lib/errores'
import { diaLargo, diasDesdeHoy, fechaLarga, hora } from '../lib/fechas'
import { supabase } from '../lib/supabase'
import { FASES, type FaseEncuesta } from '../lib/tipos'

type Entrada = {
  lote: number
  hecho_en: string
  hecho_por: string | null
  deshecho_en: string | null
  deshecho_por: string | null
  tabla: string
  accion: 'borrado' | 'edicion'
  titulo: string
  contexto: string | null
  cambios: string[] | null
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  directos: number
  en_cadena: Record<string, number> | null
}

// Cómo se llama cada cosa: [uno, varios]. Lo que no aparece aquí no se menciona (por ejemplo, en qué
// página iba cada lector).
const NOMBRES: Record<string, [string, string]> = {
  avisos: ['aviso', 'avisos'],
  eventos: ['evento', 'eventos'],
  virtudes: ['virtud de la semana', 'virtudes'],
  encuestas: ['encuesta', 'encuestas'],
  temas: ['tema propuesto', 'temas propuestos'],
  charlas: ['charla del temario', 'charlas del temario'],
  grupos: ['grupo', 'grupos'],
  santos: ['santo', 'santos'],
  libros: ['libro', 'libros'],
  votos: ['voto', 'votos'],
  miembros: ['persona del grupo', 'personas del grupo'],
  anotaciones: ['nota de un lector', 'notas de los lectores'],
}

const CAMPOS: Record<string, string> = {
  titulo: 'título',
  texto: 'texto',
  fijado: 'fijado',
  grupo_id: 'grupo',
  tipo: 'tipo',
  descripcion: 'descripción',
  lugar: 'lugar',
  inicio: 'fecha',
  fin: 'fin',
  todo_el_dia: 'todo el día',
  semana: 'semana',
  virtud: 'virtud',
  explicacion: 'explicación',
  ejemplos: 'ejemplos',
  fase: 'fase',
  tema_ganador_id: 'tema ganador',
  orden: 'orden',
  fecha: 'fecha',
  objetivo: 'objetivo',
  tema_votado_id: 'tema votado',
  nombre: 'nombre',
  santo_id: 'santo',
  fiesta: 'fiesta',
  autor: 'autor',
  portada: 'portada',
  num_paginas: 'páginas',
  publicado_en: 'fecha de publicación',
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// «a», «a y b», «a, b y c».
function enLista(partes: string[]) {
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
}

function queCambio(entrada: Entrada) {
  const { cambios, antes, despues } = entrada
  if (entrada.accion === 'borrado') return 'Se borró'
  if (entrada.tabla === 'encuestas' && cambios?.includes('fase') && antes && despues) {
    const de = FASES[antes.fase as FaseEncuesta]?.nombre
    const a = FASES[despues.fase as FaseEncuesta]?.nombre
    if (de && a) return `Cambió de fase: ${de} → ${a}`
  }
  const nombres = [...new Set((cambios ?? []).map((c) => CAMPOS[c] ?? c))]
  return nombres.length ? `Se cambió ${enLista(nombres)}` : 'Se cambió'
}

function contexto(entrada: Entrada) {
  if (!entrada.contexto) return null
  if (entrada.tabla === 'temas') return `En la encuesta «${entrada.contexto}»`
  if (entrada.tabla === 'virtudes') return `Semana del ${fechaLarga(entrada.contexto)}`
  if (entrada.tabla === 'eventos') return mayuscula(diaLargo(entrada.contexto))
  return null
}

function enCadena(entrada: Entrada) {
  const partes = Object.entries(entrada.en_cadena ?? {})
    .filter(([tabla]) => NOMBRES[tabla])
    .map(([tabla, cuantos]) => (cuantos === 1 ? `1 ${NOMBRES[tabla][0]}` : `${cuantos} ${NOMBRES[tabla][1]}`))
  return partes.length ? `Con ${enLista(partes)}` : null
}

function dia(iso: string) {
  const dias = -diasDesdeHoy(iso)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  return mayuscula(diaLargo(iso))
}

function Renglon({ entrada, onDeshecho }: { entrada: Entrada; onDeshecho: () => void }) {
  const [deshaciendo, setDeshaciendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deshecho = entrada.deshecho_en !== null
  const borrado = entrada.accion === 'borrado'
  const Icono = borrado ? Trash2 : Pencil
  const detalles = [contexto(entrada), enCadena(entrada)].filter(Boolean)

  async function deshacer() {
    setDeshaciendo(true)
    setError(null)
    try {
      await deshacerLote(entrada.lote)
      onDeshecho()
    } catch (e) {
      setError(traducirErrorDatos(e))
    } finally {
      setDeshaciendo(false)
    }
  }

  return (
    <li className={`space-y-3 px-4 py-4 ${deshecho ? 'bg-stone-50' : ''}`}>
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full ${
            deshecho ? 'bg-emerald-50 text-emerald-700' : borrado ? 'bg-red-50 text-red-700' : 'bg-cielo-50 text-cielo-700'
          }`}
        >
          {deshecho ? <CircleCheck className="size-5" aria-hidden /> : <Icono className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-medium break-words ${deshecho ? 'text-stone-600' : 'text-stone-900'}`}>
            {mayuscula(NOMBRES[entrada.tabla]?.[0] ?? entrada.tabla)} «{entrada.titulo}»
          </p>
          <p className="text-sm text-stone-700">{queCambio(entrada)}</p>
          {detalles.length > 0 && <p className="text-sm text-stone-600">{detalles.join(' · ')}</p>}
          {entrada.directos > 1 && (
            <p className="text-sm text-stone-600">
              Y {entrada.directos - 1} {entrada.directos === 2 ? 'cosa más' : 'cosas más'} en el mismo momento.
            </p>
          )}
          <p className="mt-0.5 text-sm text-stone-500">
            {entrada.hecho_por ?? 'Una cuenta eliminada'} · {hora(entrada.hecho_en)}
          </p>
          {deshecho && (
            <p className="mt-1 text-sm font-medium text-emerald-800">
              {borrado ? 'Se recuperó' : 'Se deshizo'}
              {entrada.deshecho_por && ` · ${entrada.deshecho_por}`} · {dia(entrada.deshecho_en!).toLowerCase()},{' '}
              {hora(entrada.deshecho_en!)}
            </p>
          )}
        </div>
        {!deshecho && (
          <button
            onClick={() => void deshacer()}
            disabled={deshaciendo}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium text-cielo-800 ring-1 ring-stone-300 transition hover:bg-cielo-50 disabled:opacity-60"
          >
            {deshaciendo ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Undo2 className="size-4" aria-hidden />
            )}
            {borrado ? 'Recuperar' : 'Deshacer'}
            <span className="sr-only">: {entrada.titulo}</span>
          </button>
        )}
      </div>
      {error && <MensajeError>{error}</MensajeError>}
    </li>
  )
}

export function Historial() {
  const clienteConsultas = useQueryClient()
  const { data: entradas = [], isPending } = useQuery({
    queryKey: ['historial'],
    queryFn: () => datos<Entrada[]>(supabase.rpc('historial_reciente')),
  })

  // Lo de hace más de 30 días se borra para siempre (y con ello, los archivos de libros borrados).
  useEffect(() => {
    limpiarHistorial().catch((e) => console.warn('No se pudo limpiar el historial', e))
  }, [])

  // Agrupado por día, como un diario.
  const dias = new Map<string, Entrada[]>()
  for (const entrada of entradas) {
    const nombre = dia(entrada.hecho_en)
    dias.set(nombre, [...(dias.get(nombre) ?? []), entrada])
  }

  return (
    <div className="space-y-6">
      <EncabezadoAdmin
        titulo="Deshacer cambios"
        descripcion="Lo que se borró o se cambió en el panel durante los últimos 30 días. Si fue un error, déjalo como estaba."
      />

      {isPending ? (
        <Cargando />
      ) : entradas.length === 0 ? (
        <Vacio Icono={History}>Nada se ha borrado ni cambiado en los últimos 30 días.</Vacio>
      ) : (
        [...dias].map(([nombre, delDia]) => (
          <section key={nombre} className="space-y-2">
            <TituloSeccion>{nombre}</TituloSeccion>
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-tarjeta ring-1 ring-stone-200/80">
              {delDia.map((entrada) => (
                <Renglon
                  key={entrada.lote}
                  entrada={entrada}
                  onDeshecho={() => {
                    // Lo recuperado puede ser de cualquier pantalla: se vuelve a pedir todo.
                    void clienteConsultas.invalidateQueries()
                  }}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <p className="px-1 text-sm text-pretty text-stone-500">
        Las cuentas de los miembros no aparecen aquí: para dejar de dar acceso a alguien sin perder nada, desactiva su cuenta
        en lugar de eliminarla.
      </p>
    </div>
  )
}
