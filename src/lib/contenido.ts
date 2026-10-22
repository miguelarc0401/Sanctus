import { useQuery } from '@tanstack/react-query'
import { datos, filtroGrupo } from './consultas'
import { inicioDeHoy, lunesDe } from './fechas'
import { supabase } from './supabase'
import type { Aviso, Evento, Virtud } from './tipos'

export function useVirtudDeLaSemana(grupoId: number | null) {
  const lunes = lunesDe()
  return useQuery({
    queryKey: ['virtudes', 'actual', grupoId, lunes],
    queryFn: async () => {
      // La más reciente hasta esta semana; si esa semana hay una del grupo y otra general, gana la del grupo.
      const filas = await datos<Virtud[]>(
        supabase
          .from('virtudes')
          .select('*')
          .or(filtroGrupo(grupoId))
          .lte('semana', lunes)
          .order('semana', { ascending: false })
          .order('grupo_id', { ascending: false, nullsFirst: false })
          .limit(1),
      )
      return filas[0] ?? null
    },
  })
}

export function useAvisos(grupoId: number | null, limite = 50) {
  return useQuery({
    queryKey: ['avisos', grupoId, limite],
    queryFn: () =>
      datos<Aviso[]>(
        supabase
          .from('avisos')
          .select('*')
          .or(filtroGrupo(grupoId))
          .order('fijado', { ascending: false })
          .order('publicado_en', { ascending: false })
          .limit(limite),
      ),
  })
}

const DIA = 24 * 60 * 60 * 1000

// Eventos que aún no terminan (incluye un campamento que empezó hace unos días).
export function useProximosEventos(grupoId: number | null, limite = 100) {
  return useQuery({
    queryKey: ['eventos', 'proximos', grupoId, limite],
    queryFn: async () => {
      const hoy = inicioDeHoy()
      const hace31Dias = new Date(Date.parse(hoy) - 31 * DIA).toISOString()
      const filas = await datos<Evento[]>(
        supabase.from('eventos').select('*').or(filtroGrupo(grupoId)).gte('inicio', hace31Dias).order('inicio'),
      )
      return filas.filter((e) => (e.fin ?? e.inicio) >= hoy).slice(0, limite)
    },
  })
}

export function useEventosPasados(grupoId: number | null, activo: boolean) {
  return useQuery({
    queryKey: ['eventos', 'pasados', grupoId],
    enabled: activo,
    queryFn: () =>
      datos<Evento[]>(
        supabase
          .from('eventos')
          .select('*')
          .or(filtroGrupo(grupoId))
          .lt('inicio', inicioDeHoy())
          .order('inicio', { ascending: false })
          .limit(30),
      ),
  })
}
