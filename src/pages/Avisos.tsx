import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Cargando, Titulo, Vacio } from '../components/Bloques'
import { TarjetaAviso } from '../components/Contenido'
import { useGrupos } from '../grupos/contexto'
import { useAvisos } from '../lib/contenido'

export function Avisos() {
  const { grupo } = useGrupos()
  const { data: avisos = [], isPending } = useAvisos(grupo?.id ?? null)

  return (
    <div className="space-y-5">
      <Link to="/mas" className="inline-flex items-center gap-1 text-sm text-cielo-700">
        <ArrowLeft className="size-4" aria-hidden /> Más
      </Link>
      <Titulo>Avisos</Titulo>
      {isPending ? (
        <Cargando />
      ) : avisos.length === 0 ? (
        <Vacio>Todavía no hay avisos.</Vacio>
      ) : (
        avisos.map((aviso) => <TarjetaAviso key={aviso.id} aviso={aviso} />)
      )}
    </div>
  )
}
