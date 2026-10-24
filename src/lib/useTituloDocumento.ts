import { useEffect } from 'react'

// El título de la pestaña del navegador sigue a la pantalla (los lectores de pantalla lo anuncian).
export function useTituloDocumento(titulo: string | null) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · Santa María` : 'Santa María'
    return () => {
      document.title = 'Santa María'
    }
  }, [titulo])
}
