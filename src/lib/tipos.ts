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

export type EstadoCuenta = 'pendiente' | 'aprobado' | 'suspendido'

export type Miembro = {
  id: string
  nombre: string
  acceso: string | null
  es_admin: boolean
  debe_cambiar_contrasena: boolean
  estado: EstadoCuenta
  grupo_solicitado: number | null
  nota_registro: string | null
  creado_en: string
  miembros: { grupo_id: number }[]
}

export type Pregunta = {
  id: number
  autor_id: string
  grupo_id: number | null
  texto: string
  creada_en: string
  respuesta: string | null
  respondida_en: string | null
  respuesta_vista: boolean
}

export type FaseEncuesta = 'propuestas' | 'votacion' | 'cerrada'

export type Encuesta = {
  id: number
  grupo_id: number
  titulo: string
  fase: FaseEncuesta
  tema_ganador_id: number | null
  creada_en: string
}

// Los miembros no pueden leer quién propuso cada tema: siempre se piden sólo estas columnas.
export const COLUMNAS_TEMA = 'id, encuesta_id, titulo, descripcion, creado_en'

export type Tema = {
  id: number
  encuesta_id: number
  titulo: string
  descripcion: string | null
  creado_en: string
}

export type Charla = {
  id: number
  grupo_id: number
  orden: number
  fecha: string | null
  titulo: string
  objetivo: string | null
  tema_votado_id: number | null
  tema: { titulo: string } | null
}

export const FASES: Record<FaseEncuesta, { nombre: string; estilo: string }> = {
  propuestas: { nombre: 'Propuestas abiertas', estilo: 'bg-emerald-100 text-emerald-800' },
  votacion: { nombre: 'Votación abierta', estilo: 'bg-oro-400/25 text-oro-600' },
  cerrada: { nombre: 'Cerrada', estilo: 'bg-stone-200 text-stone-600' },
}

export const TIPOS_EVENTO:Record<TipoEvento, { nombre: string; estilo: string }> = {
  actividad: { nombre: 'Actividad', estilo: 'bg-cielo-100 text-cielo-800' },
  campamento: { nombre: 'Campamento', estilo: 'bg-emerald-100 text-emerald-800' },
  excursion: { nombre: 'Excursión', estilo: 'bg-amber-100 text-amber-800' },
  misa: { nombre: 'Misa', estilo: 'bg-oro-400/25 text-oro-600' },
  hora_santa: { nombre: 'Hora santa', estilo: 'bg-violet-100 text-violet-800' },
  charla: { nombre: 'Charla', estilo: 'bg-rose-100 text-rose-800' },
}
