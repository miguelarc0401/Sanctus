export type Santo = {
  id: number
  nombre: string
  fiesta: string | null
  descripcion: string | null
}

export type Grupo = {
  id: number
  nombre: string
  descripcion: string | null
  santo_id: number
  santo: { nombre: string }
}

export type Aviso = {
  id: number
  grupo_id: number | null
  titulo: string
  texto: string
  fijado: boolean
  publicado_en: string
}

export type TipoEvento = 'actividad' | 'campamento' | 'excursion' | 'misa' | 'hora_santa' | 'charla'

export type Evento = {
  id: number
  grupo_id: number | null
  tipo: TipoEvento
  titulo: string
  descripcion: string | null
  lugar: string | null
  inicio: string
  fin: string | null
  todo_el_dia: boolean
}

export type Virtud = {
  id: number
  semana: string
  grupo_id: number | null
  virtud: string
  explicacion: string | null
  ejemplos: string[]
}

export type Miembro = {
  id: string
  nombre: string
  acceso: string | null
  es_admin: boolean
  debe_cambiar_contrasena: boolean
  miembros: { grupo_id: number }[]
}

export const TIPOS_EVENTO: Record<TipoEvento, { nombre: string; estilo: string }> = {
  actividad: { nombre: 'Actividad', estilo: 'bg-cielo-100 text-cielo-800' },
  campamento: { nombre: 'Campamento', estilo: 'bg-emerald-100 text-emerald-800' },
  excursion: { nombre: 'Excursión', estilo: 'bg-amber-100 text-amber-800' },
  misa: { nombre: 'Misa', estilo: 'bg-oro-400/25 text-oro-600' },
  hora_santa: { nombre: 'Hora santa', estilo: 'bg-violet-100 text-violet-800' },
  charla: { nombre: 'Charla', estilo: 'bg-rose-100 text-rose-800' },
}
