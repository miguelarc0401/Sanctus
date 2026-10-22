import '@fontsource-variable/inter'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { FaltaConfiguracion } from './components/Pantallas'
import './index.css'
import { supabaseConfigurado } from './lib/supabase'

const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigurado ? (
      <QueryClientProvider client={clienteConsultas}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    ) : (
      <FaltaConfiguracion />
    )}
  </StrictMode>,
)
