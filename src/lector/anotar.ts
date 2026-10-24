import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { datos } from '../lib/consultas'
import type { Anotacion } from '../lib/libros'
import { supabase } from '../lib/supabase'

export type NuevaAnotacion = Pick<Anotacion, 'pagina' | 'tipo'> &
  Partial<Pick<Anotacion, 'texto' | 'posicion' | 'nota' | 'color'>>

type Cambios = Partial<Pick<Anotacion, 'nota' | 'color' | 'tipo'>>

// Crear, cambiar y borrar anotaciones de un libro. Los cambios se ven al instante y
// se deshacen solos si no se pudieron guardar.
export function useAnotar(libroId: number) {
  const cliente = useQueryClient()
  const clave = ['anotaciones', libroId]
  // Mientras se guarda, una anotación nueva lleva un número negativo provisional;
  // aquí se apunta cuál le tocó al guardarse y qué guardados siguen en camino.
  const reales = useRef(new Map<number, number>())
  const pendientes = useRef(new Map<number, Promise<Anotacion>>())

  const cambiarLista = (cambio: (lista: Anotacion[]) => Anotacion[]) =>
    cliente.setQueryData<Anotacion[]>(clave, (lista = []) => cambio(lista))
  const avisarMisNotas = () => void cliente.invalidateQueries({ queryKey: ['anotaciones', 'todas'] })
  const es = (a: Anotacion, id: number) => a.id === id || a.id === reales.current.get(id)

  async function idReal(id: number) {
    if (id >= 0) return id
    return reales.current.get(id) ?? (await pendientes.current.get(id))?.id ?? id
  }

  // Busca una anotación aunque se la conozca por su número provisional.
  const buscar = (lista: Anotacion[], id: number) => lista.find((a) => es(a, id))

  function crear(nueva: NuevaAnotacion) {
    const provisional: Anotacion = {
      id: -Date.now(),
      libro_id: libroId,
      texto: null,
      posicion: null,
      nota: null,
      color: null,
      creada_en: new Date().toISOString(),
      ...nueva,
    }
    void cliente.cancelQueries({ queryKey: clave })
    cambiarLista((lista) => [...lista, provisional])
    const guardada = datos<Anotacion>(
      supabase
        .from('anotaciones')
        .insert({ libro_id: libroId, ...nueva })
        .select()
        .single(),
    )
    pendientes.current.set(provisional.id, guardada)
    guardada
      .then((fila) => {
        reales.current.set(provisional.id, fila.id)
        // Conserva lo que se haya cambiado mientras se guardaba (por ejemplo, el color).
        cambiarLista((lista) => lista.map((a) => (a.id === provisional.id ? { ...a, id: fila.id } : a)))
      })
      .catch(() => cambiarLista((lista) => lista.filter((a) => a.id !== provisional.id)))
      .finally(() => {
        pendientes.current.delete(provisional.id)
        avisarMisNotas()
      })
    return { provisional, guardada }
  }

  async function cambiar(id: number, cambios: Cambios) {
    const anterior = buscar(cliente.getQueryData<Anotacion[]>(clave) ?? [], id)
    cambiarLista((lista) => lista.map((a) => (es(a, id) ? { ...a, ...cambios } : a)))
    try {
      const { error } = await supabase
        .from('anotaciones')
        .update(cambios)
        .eq('id', await idReal(id))
      if (error) throw error
      avisarMisNotas()
    } catch (e) {
      if (anterior) cambiarLista((lista) => lista.map((a) => (es(a, id) ? { ...anterior, id: a.id } : a)))
      throw e
    }
  }

  async function borrar(anotacion: Anotacion) {
    cambiarLista((lista) => lista.filter((a) => !es(a, anotacion.id)))
    try {
      const { error } = await supabase
        .from('anotaciones')
        .delete()
        .eq('id', await idReal(anotacion.id))
      if (error) throw error
      avisarMisNotas()
    } catch (e) {
      cambiarLista((lista) => [...lista, anotacion])
      throw e
    }
  }

  // Vuelve a crear una anotación borrada (para «Deshacer»).
  function restaurar({ pagina, tipo, texto, posicion, nota, color }: Anotacion) {
    return crear({ pagina, tipo, texto, posicion, nota, color })
  }

  return { crear, cambiar, borrar, restaurar, buscar }
}
