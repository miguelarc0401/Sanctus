import '@fontsource-variable/inter'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { FaltaConfiguracion } from './components/Pantallas'
import './index.css'
import { aplicarTamanoLetra } from './lib/apariencia'
import { iniciarSincronizacion } from './lib/cambiosPendientes'
import { persistidor, TIEMPO_GUARDADO } from './lib/conexion'
import { supabaseConfigurado } from './lib/supabase'

// Antes de dibujar, para que la letra no cambie de tamaño al abrir la app.
aplicarTamanoLetra()

const clienteConsultas = new QueryClient({
  // gcTime: lo que se consultó no se olvida antes de que caduque lo guardado en el teléfono.
  defaultOptions: { queries: { staleTime: 60_000, retry: 1, gcTime: TIEMPO_GUARDADO } },
})

// Cambiarlo cuando cambie la forma de los datos guardados, para descartar los de la versión anterior.
const VERSION_DATOS = '1'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigurado ? (
      <PersistQueryClientProvider
        client={clienteConsultas}
        persistOptions={{ persister: persistidor, maxAge: TIEMPO_GUARDADO, buster: VERSION_DATOS }}
        // Ya con lo guardado en el teléfono, se suben las notas que se hicieron sin internet.
        onSuccess={() => iniciarSincronizacion(clienteConsultas)}
      >
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </PersistQueryClientProvider>
    ) : (
      <FaltaConfiguracion />
    )}
  </StrictMode>,
)
