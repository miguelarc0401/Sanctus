// Tamaño de la letra de toda la app; se guarda en cada teléfono.
export type TamanoLetra = 'normal' | 'grande' | 'enorme'

const CLAVE = 'tamano-letra'

export function leerTamanoLetra(): TamanoLetra {
  try {
    const valor = localStorage.getItem(CLAVE)
    return valor === 'grande' || valor === 'enorme' ? valor : 'normal'
  } catch {
    return 'normal'
  }
}

export function aplicarTamanoLetra(tamano = leerTamanoLetra()) {
  if (tamano === 'normal') delete document.documentElement.dataset.letra
  else document.documentElement.dataset.letra = tamano
}

export function guardarTamanoLetra(tamano: TamanoLetra) {
  aplicarTamanoLetra(tamano)
  try {
    localStorage.setItem(CLAVE, tamano)
  } catch {
    // Sin almacenamiento, el tamaño dura mientras la app esté abierta.
  }
}
