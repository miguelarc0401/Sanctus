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

// Las encuestas y el temario son de un grupo: se trabaja con el elegido arriba.
export function GrupoDeTrabajo() {
  const { grupo, grupos } = useGrupos()
  if (!grupo) return null
  return (
    <p className="rounded-xl bg-cielo-50 px-4 py-3 text-sm text-cielo-800 ring-1 ring-cielo-100">
      Grupo: <strong>{nombreDeGrupo(grupo)}</strong>
      {grupos.length > 1 && <span className="text-cielo-600"> · cámbialo arriba, junto a «Santa María»</span>}
    </p>
  )
}

export function Destino({ grupoId }: { grupoId: number | null }) {
  const { grupos } = useGrupos()
  const grupo = grupos.find((g) => g.id === grupoId)
  return <span className="text-sm text-stone-500">{grupo ? grupo.santo.nombre : 'Toda la parroquia'}</span>
}
