import { useQueryClient } from '@tanstack/react-query'
import { anotarCambio, idActual, type CambiosAnotacion, type NuevaAnotacion } from '../lib/cambiosPendientes'
import type { Anotacion, NotaConLibro } from '../lib/libros'

// Lo que aparece en «Mis frases y notas» de la biblioteca (lo mismo que pide useMisNotas).
const esNota = (a: Anotacion) => a.tipo === 'frase' || a.tipo === 'nota' || a.nota !== null

let ultimoProvisional = 0
// Número negativo y único mientras la anotación no se sube.
const nuevoProvisional = () => (ultimoProvisional = Math.min(-Date.now(), ultimoProvisional - 1))

// Crear, cambiar y borrar anotaciones de un libro. Los cambios se ven al instante, se guardan en el
// teléfono y se suben en cuanto hay internet (ver lib/cambiosPendientes).
export function useAnotar(libroId: number, titulo: string) {
  const cliente = useQueryClient()
  const clave = ['anotaciones', libroId]

  // Cambia la lista del libro y, con ella, «Mis frases y notas».
  function cambiarLista(cambio: (lista: Anotacion[]) => Anotacion[]) {
    const lista = cambio(cliente.getQueryData<Anotacion[]>(clave) ?? [])
    cliente.setQueryData(clave, lista)
    cliente.setQueryData<NotaConLibro[]>(
      ['anotaciones', 'todas'],
      (todas) =>
        todas &&
        [
          ...todas.filter((n) => n.libro_id !== libroId),
          ...lista.filter(esNota).map((a) => ({ ...a, libro: { titulo } })),
        ].sort((a, b) => b.creada_en.localeCompare(a.creada_en)),
    )
  }

  // Una anotación nueva se sigue encontrando por su número provisional después de subirse.
  const es = (a: Anotacion, id: number) => a.id === id || a.id === idActual(id)
  const buscar = (lista: Anotacion[], id: number) => lista.find((a) => es(a, id))

  function crear(nueva: NuevaAnotacion) {
    const provisional: Anotacion = {
      id: nuevoProvisional(),
      libro_id: libroId,
      texto: null,
      posicion: null,
      nota: null,
      color: null,
      creada_en: new Date().toISOString(),
      ...nueva,
    }
    cambiarLista((lista) => [...lista, provisional])
    anotarCambio({ que: 'crear', id: provisional.id, libro: libroId, anotacion: { ...nueva } })
    return provisional
  }

  function cambiar(id: number, cambios: CambiosAnotacion) {
    cambiarLista((lista) => lista.map((a) => (es(a, id) ? { ...a, ...cambios } : a)))
    anotarCambio({ que: 'cambiar', id, cambios })
  }

  function borrar(anotacion: Anotacion) {
    cambiarLista((lista) => lista.filter((a) => !es(a, anotacion.id)))
    anotarCambio({ que: 'borrar', id: anotacion.id })
  }

  // Vuelve a crear una anotación borrada (para «Deshacer»).
  function restaurar({ pagina, tipo, texto, posicion, nota, color }: Anotacion) {
    return crear({ pagina, tipo, texto, posicion, nota, color })
  }

  return { crear, cambiar, borrar, restaurar, buscar }
}
