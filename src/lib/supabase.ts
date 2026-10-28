import { createClient } from '@supabase/supabase-js'

export const url = import.meta.env.VITE_SUPABASE_URL
export const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Sin estas variables la app muestra una pantalla de configuración en lugar de fallar.
export const supabaseConfigurado = Boolean(url && clave)

// Dónde queda guardada la sesión en el teléfono (el mismo nombre que Supabase usa por omisión).
export const claveSesion = `sb-${new URL(url || 'http://localhost').hostname.split('.')[0]}-auth-token`

export const supabase = createClient(url || 'http://localhost', clave || 'sin-configurar', {
  auth: { storageKey: claveSesion },
})
