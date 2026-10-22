// Los niños entran con un usuario; por dentro Supabase necesita un correo.
// Igual que en supabase/functions/miembros/index.ts y en la migración de la Fase 1.
export const DOMINIO_USUARIOS = 'usuarios.santamaria.invalid'

export function correoDeAcceso(acceso: string) {
  const limpio = acceso.trim().toLowerCase()
  return limpio.includes('@') ? limpio : `${limpio}@${DOMINIO_USUARIOS}`
}

// «José Pérez López» → «jose.perez»
export function sugerirUsuario(nombre: string) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join('.')
}

const palabras =['cielo', 'luz', 'paz', 'sol', 'mar', 'rosa', 'cruz', 'pan', 'vida', 'gozo', 'nube', 'monte', 'flor', 'ave', 'trigo', 'lirio']

// Contraseña temporal fácil de dictar a un niño, por ejemplo «rosamonte47».
export function generarContrasena() {
  const azar = crypto.getRandomValues(new Uint32Array(3))
  const numero = String(azar[2] % 100).padStart(2, '0')
  return palabras[azar[0] % palabras.length] + palabras[azar[1] % palabras.length] + numero
}
