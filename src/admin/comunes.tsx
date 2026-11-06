import { Search } from 'lucide-react'
import { BotonGrupo } from '../components/ElegirGrupo'
import { Campo, Selector } from '../components/Formulario'
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

// Las encuestas y el temario son de un grupo: se trabaja con el elegido, que se puede cambiar aquí mismo.
export function GrupoDeTrabajo() {
  const { grupo } = useGrupos()
  if (!grupo) return null
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-cielo-50 px-4 py-2.5 text-sm text-cielo-800 ring-1 ring-cielo-100">
      <span className="text-cielo-700">Grupo:</span>
      <BotonGrupo claro />
    </div>
  )
}

// El enlace de Google Maps de un lugar, con la explicación de cómo copiarlo.
export function CampoMapa({ valor, onCambiar, lugar }: { valor: string; onCambiar: (v: string) => void; lugar: string }) {
  const buscar = lugar.trim()
  return (
    <div className="space-y-1.5">
      <Campo
        id="mapa"
        etiqueta="Enlace de Google Maps"
        ayuda="(opcional)"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="https://maps.app.goo.gl/…"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
      />
      <p className="text-sm text-pretty text-stone-600">
        En Google Maps busca el lugar, toca «Compartir» y luego «Copiar enlace», y pégalo aquí. Así todos lo abren con un toque.
      </p>
      {buscar && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buscar)}`}
          target="_blank"
          rel="noreferrer"
          className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-cielo-700 hover:bg-cielo-50"
        >
          <Search className="size-4" aria-hidden /> Buscar «{buscar}» en Google Maps
        </a>
      )}
    </div>
  )
}

export function Destino({ grupoId }: { grupoId: number | null }) {
  const { grupos } = useGrupos()
  const grupo = grupos.find((g) => g.id === grupoId)
  return <span className="text-sm text-stone-600">{grupo ? grupo.santo.nombre : 'Toda la parroquia'}</span>
}
