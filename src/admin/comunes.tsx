import { Selector } from '../components/Formulario'
import { nombreDeGrupo, useGrupos } from '../grupos/contexto'

// Para avisos, eventos y virtudes: un grupo concreto o toda la parroquia (valor vacío).
export function SelectorDeDestino({ valor, onCambiar }: { valor: string; onCambiar: (v: string) => void }) {
  const { grupos } = useGrupos()
  return (
    <Selector id="destino" etiqueta="¿Para quién?" value={valor} onChange={(e) => onCambiar(e.target.value)}>
      <option value="">Toda la parroquia (todos los grupos)</option>
      {grupos.map((grupo) => (
        <option key={grupo.id} value={grupo.id}>
          {nombreDeGrupo(grupo)}
        </option>
      ))}
    </Selector>
  )
}

export function Destino({ grupoId }: { grupoId: number | null }) {
  const { grupos } = useGrupos()
  const grupo = grupos.find((g) => g.id === grupoId)
  return <span className="text-sm text-stone-500">{grupo ? grupo.santo.nombre : 'Toda la parroquia'}</span>
}
