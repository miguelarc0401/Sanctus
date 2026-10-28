import { focusManager, onlineManager, type QueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { hayConexion } from './conexion'
import { datos } from './consultas'
import type { Anotacion, FilaProgreso } from './libros'
import { supabase } from './supabase'

// Lo que la persona hace en un libro (subrayar, escribir notas, guardar frases, marcar páginas y la
// página en la que va) se guarda primero en el teléfono y se sube en orden en cuanto hay internet.
// Así funciona igual con o sin conexión.

export type NuevaAnotacion = Pick<Anotacion, 'pagina' | 'tipo'> &
  Partial<Pick<Anotacion, 'texto' | 'posicion' | 'nota' | 'color'>>

export type CambiosAnotacion = Partial<Pick<Anotacion, 'nota' | 'color' | 'tipo'>>

// Una anotación nueva lleva un número negativo provisional hasta que se sube y recibe el suyo.
type Cambio =
  | { que: 'crear'; id: number; libro: number; anotacion: NuevaAnotacion }
  | { que: 'cambiar'; id: number; cambios: CambiosAnotacion }
  | { que: 'borrar'; id: number }
  | { que: 'progreso'; libro: number; pagina: number }

type Estado = { cambios: Cambio[]; reales: Record<number, number> }

// Las anotaciones y el progreso se piden por separado al servidor; cada uno espera sólo sus cambios.
type Area = 'anotaciones' | 'progreso'
const areaDe = (cambio: Cambio): Area => (cambio.que === 'progreso' ? 'progreso' : 'anotaciones')

const CLAVE = 'cambios-pendientes'
const REINTENTO = 30_000

function leerEstado(): Estado {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Estado | null
    if (guardado?.cambios) return guardado
  } catch {
    // Sin almacenamiento, los cambios sólo se recuerdan mientras la app esté abierta.
  }
  return { cambios: [], reales: {} }
}

let estado = leerEstado()
// El cambio que se está subiendo en este momento: ya no se le pueden sumar otros.
let enviando: Cambio | null = null
let cliente: QueryClient | null = null
let enCurso: Promise<void> | null = null
let reintento: number | undefined
// Cuántos cambios se han hecho en cada área, para saber si hubo alguno mientras se pedían datos.
const versiones: Record<Area, number> = { anotaciones: 0, progreso: 0 }
const oyentes = new Set<() => void>()

function guardar() {
  // Una vez subido todo, los números provisionales sólo hacen falta mientras la app siga abierta.
  const paraGuardar = estado.cambios.length ? estado : { cambios: [], reales: {} }
  try {
    localStorage.setItem(CLAVE, JSON.stringify(paraGuardar))
  } catch {
    // Sin espacio: siguen en memoria y se suben igual si hay internet antes de cerrar la app.
  }
  oyentes.forEach((oyente) => oyente())
}

// El número definitivo de una anotación (o el provisional, si todavía no se sube).
export const idActual = (id: number) => estado.reales[id] ?? id

const pendientes = () => estado.cambios.filter((c) => c !== enviando)

export function anotarCambio(cambio: Cambio) {
  versiones[areaDe(cambio)]++
  if (cambio.que === 'crear' || cambio.que === 'progreso') {
    // De la página en la que se va sólo importa la última.
    if (cambio.que === 'progreso') {
      estado.cambios = estado.cambios.filter((c) => c === enviando || !(c.que === 'progreso' && c.libro === cambio.libro))
    }
    estado.cambios.push(cambio)
  } else {
    const id = idActual(cambio.id)
    const creacion = pendientes().find((c) => c.que === 'crear' && c.id === id) as Extract<Cambio, { que: 'crear' }> | undefined
    if (cambio.que === 'cambiar') {
      const cambioAnterior = pendientes().find((c) => c.que === 'cambiar' && c.id === id) as
        | Extract<Cambio, { que: 'cambiar' }>
        | undefined
      // Si todavía no se sube, el cambio se suma a lo que falta subir.
      if (creacion) Object.assign(creacion.anotacion, cambio.cambios)
      else if (cambioAnterior) Object.assign(cambioAnterior.cambios, cambio.cambios)
      else estado.cambios.push({ ...cambio, id })
    } else {
      // Lo que se borra antes de subirse no tiene que subirse.
      const sobra = (c: Cambio) => c !== enviando && (c.que === 'crear' || c.que === 'cambiar') && c.id === id
      estado.cambios = estado.cambios.filter((c) => !sobra(c))
      if (!creacion) estado.cambios.push({ que: 'borrar', id })
    }
  }
  guardar()
  void sincronizar()
}

// Errores que no se arreglan reintentando (por ejemplo, el libro ya no existe): el cambio se descarta.
// Sin internet, o si el servidor falla, se vuelve a intentar más tarde.
function esDefinitivo(error: unknown) {
  const { code } = (error ?? {}) as { code?: string }
  return !!code && (/^(22|23|42)/.test(code) || code === 'PGRST116')
}

async function subir(cambio: Cambio) {
  if (cambio.que === 'crear') {
    const fila = await datos<Anotacion>(
      supabase
        .from('anotaciones')
        .insert({ libro_id: cambio.libro, ...cambio.anotacion })
        .select()
        .single(),
    )
    estado.reales[cambio.id] = fila.id
    // Conserva lo que se haya cambiado mientras se subía (por ejemplo, el color).
    cliente?.setQueryData<Anotacion[]>(['anotaciones', cambio.libro], (lista) =>
      lista?.map((a) => (a.id === cambio.id ? { ...a, id: fila.id } : a)),
    )
    return
  }
  if (cambio.que === 'progreso') {
    const { error } = await supabase.rpc('guardar_progreso', { libro: cambio.libro, pagina: cambio.pagina })
    if (error) throw error
    return
  }
  const id = idActual(cambio.id)
  // Su creación no se pudo subir: no hay nada que cambiar ni borrar.
  if (id < 0) return
  const consulta = supabase.from('anotaciones')
  const { error } = await (cambio.que === 'cambiar' ? consulta.update(cambio.cambios) : consulta.delete()).eq('id', id)
  if (error) throw error
}

export function sincronizar() {
  if (!enCurso && cliente) {
    enCurso = (async () => {
      let subio = false
      while (estado.cambios.length && hayConexion()) {
        const cambio = estado.cambios[0]
        enviando = cambio
        try {
          await subir(cambio)
          subio = true
        } catch (error) {
          if (!esDefinitivo(error)) {
            window.clearTimeout(reintento)
            reintento = window.setTimeout(() => void sincronizar(), REINTENTO)
            break
          }
          console.error('Se descartó un cambio que el servidor no aceptó', cambio, error)
          subio = true
        } finally {
          enviando = null
        }
        estado.cambios = estado.cambios.filter((c) => c !== cambio)
        guardar()
      }
      if (subio && !estado.cambios.length) {
        void cliente?.invalidateQueries({ queryKey: ['anotaciones'] })
        void cliente?.invalidateQueries({ queryKey: ['progreso'] })
      }
    })().finally(() => {
      enCurso = null
    })
  }
  return enCurso ?? Promise.resolve()
}

// Pide al servidor anotaciones o progreso sin pisar lo que se cambió en el teléfono: primero sube
// los cambios y, si alguno no se pudo subir (o se hizo otro mientras tanto), falla para que se siga
// viendo lo del teléfono. React Query vuelve a intentarlo después.
export async function leerDelServidor<T>(area: Area, pedir: () => Promise<T>) {
  const faltan = () => estado.cambios.some((c) => areaDe(c) === area)
  await sincronizar()
  const version = versiones[area]
  if (faltan()) throw new Error('Hay cambios del teléfono sin subir.')
  const resultado = await pedir()
  if (faltan() || versiones[area] !== version) throw new Error('Hay cambios del teléfono sin subir.')
  return resultado
}

let iniciada = false

// Se llama una vez, ya recuperado lo guardado en el teléfono.
export function iniciarSincronizacion(clienteConsultas: QueryClient) {
  cliente = clienteConsultas
  if (iniciada) return
  iniciada = true
  onlineManager.subscribe((enLinea) => {
    if (enLinea) void sincronizar()
  })
  // Al volver a la app (por si el teléfono decía tener internet y no lo tenía).
  focusManager.subscribe((enFoco) => {
    if (enFoco) void sincronizar()
  })
  void sincronizar()
}

export const hayCambiosPendientes = () => estado.cambios.length > 0

// Al cerrar sesión: lo que no se subió se pierde (antes se le pregunta a la persona).
export function olvidarCambiosPendientes() {
  window.clearTimeout(reintento)
  estado = { cambios: [], reales: {} }
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // No había nada guardado.
  }
  oyentes.forEach((oyente) => oyente())
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

// Cuántos cambios faltan por subir.
export function useCambiosPendientes() {
  return useSyncExternalStore(suscribir, () => estado.cambios.length)
}

// La página en la que se va: se ve enseguida en la biblioteca, aunque no haya internet.
export function guardarProgreso(clienteConsultas: QueryClient, libro: number, pagina: number) {
  const ahora = new Date().toISOString()
  clienteConsultas.setQueriesData<FilaProgreso[]>({ queryKey: ['progreso'] }, (filas) =>
    filas && [...filas.filter((f) => f.libro_id !== libro), { libro_id: libro, pagina, actualizado_en: ahora }],
  )
  anotarCambio({ que: 'progreso', libro, pagina })
}
