import { useEffect, useState } from 'react'
import type { ColorAnotacion } from '../lib/libros'

export type Tema = 'claro' | 'sepia' | 'noche'

export type Ajustes = {
  tema: Tema
  // 1 = la página completa a la vista.
  zoom: number
  // En pantallas anchas, dos páginas lado a lado como un libro abierto.
  dosPaginas: boolean
  // Para releer sin ver los propios subrayados.
  ocultarMarcas: boolean
  // El último color usado para subrayar.
  color: ColorAnotacion
}

// Pasos de los botones para agrandar o achicar; con los dedos se elige cualquier tamaño entre ellos.
export const ZOOMS = [1, 1.25, 1.5, 2, 2.5, 3]
export const ZOOM_MAXIMO = ZOOMS[ZOOMS.length - 1]
export const zoomMayor = (zoom: number) => ZOOMS.find((z) => z > zoom + 0.01) ?? ZOOM_MAXIMO
export const zoomMenor = (zoom: number) => ZOOMS.findLast((z) => z < zoom - 0.01) ?? 1

export const TEMAS: Record<Tema, { nombre: string; papel: string; tinta: string; barra: string }> = {
  claro: { nombre: 'Claro', papel: '#ffffff', tinta: '#1c1917', barra: '#ffffff' },
  sepia: { nombre: 'Sepia', papel: '#f4ead5', tinta: '#3b2f20', barra: '#f8f1e3' },
  noche: { nombre: 'Noche', papel: '#1f1d1a', tinta: '#e7e5e4', barra: '#1c1a17' },
}

const CLAVE = 'lector-ajustes'
const INICIALES: Ajustes = { tema: 'claro', zoom: 1, dosPaginas: true, ocultarMarcas: false, color: 'amarillo' }

function leer(): Ajustes {
  try {
    return { ...INICIALES, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') }
  } catch {
    return INICIALES
  }
}

// Preferencias de lectura de este teléfono o computadora.
export function useAjustes() {
  const [ajustes, setAjustes] = useState(leer)
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(ajustes))
    } catch {
      // Sin almacenamiento, las preferencias duran mientras el libro esté abierto.
    }
  }, [ajustes])
  const cambiar = (cambio: Partial<Ajustes>) => setAjustes((previos) => ({ ...previos, ...cambio }))
  return [ajustes, cambiar] as const
}

// Pinta la barra del teléfono (en la app instalada) del color de la barra del lector.
export function useColorDeBarra(tema: Tema) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) return
    const anterior = meta.content
    meta.content = TEMAS[tema].barra
    return () => {
      meta.content = anterior
    }
  }, [tema])
}
