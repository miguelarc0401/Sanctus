import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { datos } from '../lib/consultas'
import { supabase } from '../lib/supabase'
import type { Grupo } from '../lib/tipos'
import { GruposContext } from './contexto'

const CLAVE_GRUPO = 'grupo-elegido'

function leerGrupoGuardado() {
  try {
    return Number(localStorage.getItem(CLAVE_GRUPO)) || null
  } catch {
    return null
  }
}

export function GruposProvider({ children }: { children: ReactNode }) {
  const [elegido, setElegido] = useState(leerGrupoGuardado)

  const { data: grupos = [], isPending } = useQuery({
    queryKey: ['grupos'],
    queryFn: () =>
      datos<Grupo[]>(
        supabase.from('grupos').select('id, nombre, descripcion, santo_id, santo:santos(nombre)').order('nombre'),
      ),
  })

  const valor = useMemo(() => {
    const grupo = grupos.find((g) => g.id === elegido) ?? grupos[0] ?? null
    const elegirGrupo = (id: number) => {
      setElegido(id)
      try {
        localStorage.setItem(CLAVE_GRUPO, String(id))
      } catch {
        // Sin almacenamiento, el grupo elegido dura mientras la app esté abierta.
      }
    }
    return { cargando: isPending, grupos, grupo, elegirGrupo }
  }, [grupos, elegido, isPending])

  return <GruposContext value={valor}>{children}</GruposContext>
}
