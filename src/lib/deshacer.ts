import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

// Lo último que borró este coordinador, para ofrecerle «Deshacer» durante unos segundos.
export type Borrado = { tabla: string; id: number; nombre?: string; clave: number }

let actual: Borrado | null = null
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())

export function ofrecerDeshacer(borrado: Omit<Borrado, 'clave'>) {
  actual = { ...borrado, clave: Date.now() }
  avisar()
}

export function cerrarAvisoDeshacer() {
  actual = null
  avisar()
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function useUltimoBorrado() {
  return useSyncExternalStore(suscribir, () => actual)
}

// Vuelve a poner lo que se acaba de borrar (con todo lo que se fue con ello, como los votos de un tema).
export async function deshacerBorrado(tabla: string, id: number) {
  const { error } = await supabase.rpc('deshacer_borrado', { nombre_tabla: tabla, fila: id })
  if (error) throw error
}

// Deshace un renglón de «Deshacer cambios».
export async function deshacerLote(lote: number) {
  const { error } = await supabase.rpc('deshacer', { cambio: lote })
  if (error) throw error
}

// Quita del almacenamiento los libros borrados hace más de 30 días (ya no se pueden recuperar).
export async function limpiarHistorial() {
  const { data, error } = await supabase.rpc('limpiar_historial')
  if (error) throw error
  const porCarpeta = new Map<string, string[]>()
  for (const { carpeta, ruta } of (data ?? []) as { carpeta: string; ruta: string }[]) {
    porCarpeta.set(carpeta, [...(porCarpeta.get(carpeta) ?? []), ruta])
  }
  for (const [carpeta, rutas] of porCarpeta) await supabase.storage.from(carpeta).remove(rutas)
}
