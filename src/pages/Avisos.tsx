import { Megaphone } from 'lucide-react'
import { Cargando, Encabezado, Vacio } from '../components/Bloques'
import { TarjetaAviso } from '../components/Contenido'
import { useGrupos } from '../grupos/contexto'
import { useAvisos } from '../lib/contenido'

export function Avisos() {
  const { grupo } = useGrupos()
  const { data: avisos = [], isPending } = useAvisos(grupo?.id ?? null)

  return (
    <div className="space-y-5">
      <Encabezado titulo="Avisos" descripcion="Lo que necesitas saber de tu grupo y de la parroquia." volver={{ a: '/mas', texto: 'Más' }} />
      {isPending ? (
        <Cargando />
      ) : avisos.length === 0 ? (
        <Vacio Icono={Megaphone}>Todavía no hay avisos.</Vacio>
      ) : (
        <div className="space-y-3">
          {avisos.map((aviso) => (
            <TarjetaAviso key={aviso.id} aviso={aviso} />
          ))}
        </div>
      )}
    </div>
  )
}
