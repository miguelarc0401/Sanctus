import { useQuery } from '@tanstack/react-query'
import { Bike, Music, Palette, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/contexto'
import { datos } from './consultas'
import { supabase } from './supabase'

// Lo que cada quien cuenta de sí. Sólo lo ven la persona y los coordinadores.
export type DatosPerfil = {
  telefono: string | null
  deportes: string[]
  musica: string[]
  actividades: string[]
}

export type TipoGusto = 'deportes' | 'musica' | 'actividades'

// Ideas para elegir con un toque; cada quien puede agregar las suyas.
export const GUSTOS: Record<TipoGusto, { titulo: string; pregunta: string; Icono: LucideIcon; ideas: string[] }> = {
  deportes: {
    titulo: 'Deportes',
    pregunta: '¿Qué deportes te gustan?',
    Icono: Bike,
    ideas: ['Fútbol', 'Básquetbol', 'Voleibol', 'Béisbol', 'Natación', 'Correr', 'Ciclismo', 'Tenis', 'Artes marciales', 'Gimnasio'],
  },
  musica: {
    titulo: 'Música',
    pregunta: '¿Qué música te gusta?',
    Icono: Music,
    ideas: ['Música católica', 'Pop', 'Rock', 'Regional mexicano', 'Cumbia', 'Reguetón', 'Rap', 'Electrónica', 'Baladas', 'Clásica'],
  },
  actividades: {
    titulo: 'Actividades',
    pregunta: '¿Qué te gusta hacer?',
    Icono: Palette,
    ideas: [
      'Leer',
      'Dibujar o pintar',
      'Tocar un instrumento',
      'Cantar',
      'Bailar',
      'Videojuegos',
      'Cocinar',
      'Teatro',
      'Fotografía',
      'Acampar',
      'Manualidades',
      'Ayudar a otros',
    ],
  },
}

export const TIPOS_GUSTO = Object.keys(GUSTOS) as TipoGusto[]
export const MAXIMO_GUSTOS = 15

export function useMiPerfil() {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['perfil', perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const fila = await datos<Partial<DatosPerfil>>(
        supabase.from('perfiles').select('telefono, deportes, musica, actividades').eq('id', perfil!.id).single(),
      )
      return {
        telefono: fila.telefono ?? null,
        deportes: fila.deportes ?? [],
        musica: fila.musica ?? [],
        actividades: fila.actividades ?? [],
      } satisfies DatosPerfil
    },
  })
}

export const perfilVacio = (d: DatosPerfil) => !d.telefono && TIPOS_GUSTO.every((t) => d[t].length === 0)

// Para llamar o escribir por WhatsApp desde la ficha del miembro.
export function enlaceLlamar(telefono: string) {
  return `tel:${telefono.replace(/[^\d+]/g, '')}`
}

// WhatsApp pide el número con lada del país: a uno de 10 dígitos (México) se le pone el 52.
export function enlaceWhatsApp(telefono: string) {
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length < 8) return null
  return `https://wa.me/${digitos.length === 10 ? `52${digitos}` : digitos}`
}
