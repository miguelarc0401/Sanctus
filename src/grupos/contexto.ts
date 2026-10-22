import { createContext, useContext } from 'react'
import type { Grupo } from '../lib/tipos'

type EstadoGrupos = {
  cargando: boolean
  // El administrador ve todos los grupos; cada miembro, sólo los suyos.
  grupos: Grupo[]
  grupo: Grupo | null
  elegirGrupo: (id: number) => void
}

export const GruposContext = createContext<EstadoGrupos | null>(null)

export function useGrupos() {
  const estado = useContext(GruposContext)
  if (!estado) throw new Error('useGrupos debe usarse dentro de <GruposProvider>')
  return estado
}

export function nombreDeGrupo(grupo: Grupo) {
  return `${grupo.santo.nombre} · ${grupo.nombre}`
}
