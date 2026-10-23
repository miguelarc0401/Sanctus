import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/contexto'
import { datos } from './consultas'
import { supabase } from './supabase'
import { COLUMNAS_TEMA, type Charla, type Encuesta, type Pregunta, type Tema } from './tipos'

export function useEncuestas(grupoId: number | null) {
  return useQuery({
    queryKey: ['encuestas', grupoId],
    enabled: grupoId !== null,
    queryFn: () =>
      datos<Encuesta[]>(
        supabase.from('encuestas').select('*').eq('grupo_id', grupoId!).order('creada_en', { ascending: false }),
      ),
  })
}

export function useTemas(encuestaId: number) {
  return useQuery({
    queryKey: ['temas', encuestaId],
    queryFn: () =>
      datos<Tema[]>(supabase.from('temas').select(COLUMNAS_TEMA).eq('encuesta_id', encuestaId).order('creado_en')),
  })
}

// El voto de la persona actual (el administrador puede leer todos, por eso se filtra).
export function useMiVoto(encuestaId: number, activo: boolean) {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['votos', encuestaId, 'mio'],
    enabled: activo && !!perfil,
    queryFn: async () => {
      const fila = await datos<{ tema_id: number } | null>(
        supabase
          .from('votos')
          .select('tema_id')
          .eq('encuesta_id', encuestaId)
          .eq('usuario_id', perfil!.id)
          .maybeSingle(),
      )
      return fila?.tema_id ?? null
    },
  })
}

// Votos por tema. Los miembros sólo los reciben cuando la encuesta está cerrada.
export function useResultados(encuestaId: number, activo: boolean) {
  return useQuery({
    queryKey: ['resultados', encuestaId],
    enabled: activo,
    queryFn: async () => {
      const filas = await datos<{ tema_id: number; votos: number }[]>(
        supabase.rpc('resultados_encuesta', { encuesta: encuestaId }),
      )
      return new Map(filas.map((f) => [f.tema_id, f.votos]))
    },
  })
}

export function useCharlas(grupoId: number | null) {
  return useQuery({
    queryKey: ['charlas', grupoId],
    enabled: grupoId !== null,
    queryFn: () =>
      datos<Charla[]>(
        supabase
          .from('charlas')
          .select('*, tema:temas(titulo)')
          .eq('grupo_id', grupoId!)
          .order('orden')
          .order('fecha', { nullsFirst: false }),
      ),
  })
}

export function useMisPreguntas() {
  const { perfil } = useAuth()
  return useQuery({
    queryKey: ['preguntas', 'mias', perfil?.id],
    enabled: !!perfil,
    queryFn: () =>
      datos<Pregunta[]>(
        supabase.from('preguntas').select('*').eq('autor_id', perfil!.id).order('creada_en', { ascending: false }),
      ),
  })
}
