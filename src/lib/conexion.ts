import { onlineManager } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { removeOldestQuery } from '@tanstack/react-query-persist-client'
import { useSyncExternalStore } from 'react'

// React Query sólo se entera cuando el teléfono pierde o recupera la conexión; al abrir la app se le
// dice cómo está, para que sin internet no intente descargar nada y muestre lo guardado.
onlineManager.setOnline(navigator.onLine)

export const hayConexion = () => onlineManager.isOnline()

export function useConexion() {
  return useSyncExternalStore(onlineManager.subscribe, hayConexion)
}

// Lo último que se descargó (avisos, eventos, temario…) se guarda en el teléfono para verlo sin
// internet durante tres semanas. Se borra al cerrar sesión.
// No más de 24 días: React Query usa este tiempo en un temporizador del navegador, y con más
// el temporizador se dispara al instante y olvida los datos apenas los recupera.
export const TIEMPO_GUARDADO = 21 * 24 * 60 * 60 * 1000

function almacenamiento() {
  try {
    return window.localStorage
  } catch {
    // Sin almacenamiento (por ejemplo, en modo privado) los datos sólo duran mientras la app esté abierta.
    return undefined
  }
}

export const persistidor = createSyncStoragePersister({
  storage: almacenamiento(),
  key: 'santa-maria-datos',
  // Si el teléfono se queda sin espacio, se deja de guardar lo que se consultó hace más tiempo.
  retry: removeOldestQuery,
})
