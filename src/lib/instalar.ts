import { useSyncExternalStore } from 'react'

// Chrome y Android avisan con este evento que la app se puede instalar.
// Se guarda para mostrar nuestro propio botón de «Instalar».
type EventoInstalar = Event & { prompt: () => Promise<void> }

let evento: EventoInstalar | null = null
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  evento = e as EventoInstalar
  avisar()
})

window.addEventListener('appinstalled', () => {
  evento = null
  avisar()
})

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function usePuedeInstalar() {
  return useSyncExternalStore(suscribir, () => evento !== null)
}

export async function instalar() {
  if (!evento) return
  await evento.prompt()
  evento = null
  avisar()
}

// En iPhone y iPad no hay botón de instalar: se hace desde «Compartir → Agregar a inicio».
export const esIOS =
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)

export const esAppInstalada =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
