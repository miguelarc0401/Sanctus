import { Minus, Plus } from 'lucide-react'
import { TEMAS, ZOOM_MAXIMO, zoomMayor, zoomMenor, type Ajustes, type Tema } from './ajustes'
import { BotonIcono, Panel } from './Piezas'

function Interruptor({ etiqueta, ayuda, activo, onCambiar }: { etiqueta: string; ayuda?: string; activo: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={activo} onClick={() => onCambiar(!activo)} className="flex w-full items-center gap-4 py-2 text-left">
      <span className="flex-1">
        <span className="block font-medium">{etiqueta}</span>
        {ayuda && <span className="block text-sm text-(--lector-tenue)">{ayuda}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${activo ? 'bg-cielo-600' : 'bg-stone-400/50'}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${activo ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
}

export function Apariencia({
  ajustes,
  onCambiar,
  onZoom,
  puedeDosPaginas,
  onCerrar,
}: {
  ajustes: Ajustes
  onCambiar: (cambio: Partial<Ajustes>) => void
  onZoom: (zoom: number) => void
  puedeDosPaginas: boolean
  onCerrar: () => void
}) {
  const tactil = window.matchMedia('(pointer: coarse)').matches
  return (
    <Panel titulo="Apariencia" variante="tarjeta" onCerrar={onCerrar}>
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-medium text-(--lector-tenue)">Fondo</h3>
          <div role="radiogroup" aria-label="Fondo" className="grid grid-cols-3 gap-2">
            {(Object.keys(TEMAS) as Tema[]).map((tema) => (
              <button
                key={tema}
                role="radio"
                aria-checked={ajustes.tema === tema}
                onClick={() => onCambiar({ tema })}
                className={`flex flex-col items-center gap-1.5 rounded-2xl p-2 text-sm transition ${
                  ajustes.tema === tema ? 'ring-2 ring-(--lector-acento)' : 'ring-1 ring-(--lector-borde) hover:bg-(--lector-suave)'
                }`}
              >
                <span
                  className="grid h-12 w-full place-items-center rounded-xl font-serif text-xl font-semibold shadow-inner ring-1 ring-black/5"
                  style={{ background: TEMAS[tema].papel, color: TEMAS[tema].tinta }}
                >
                  Aa
                </span>
                {TEMAS[tema].nombre}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium text-(--lector-tenue)">Tamaño de la página</h3>
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-(--lector-suave) p-1">
            <BotonIcono etiqueta="Más pequeña" onClick={() => onZoom(zoomMenor(ajustes.zoom))} disabled={ajustes.zoom <= 1}>
              <Minus className="size-5" aria-hidden />
            </BotonIcono>
            <p aria-live="polite" className="font-medium tabular-nums">
              {ajustes.zoom === 1 ? 'Ajustada a la pantalla' : `${Math.round(ajustes.zoom * 100)} %`}
            </p>
            <BotonIcono etiqueta="Más grande" onClick={() => onZoom(zoomMayor(ajustes.zoom))} disabled={ajustes.zoom >= ZOOM_MAXIMO}>
              <Plus className="size-5" aria-hidden />
            </BotonIcono>
          </div>
          <p className="mt-2 text-sm text-(--lector-tenue)">
            {tactil
              ? ajustes.zoom > 1
                ? 'Mueve la página con un dedo para leerla completa; junta dos dedos para achicarla.'
                : 'También puedes agrandarla separando dos dedos sobre la página.'
              : 'También con la tecla Ctrl y la rueda del mouse, o con las lupas junto a la página.'}
          </p>
        </section>

        <section className="divide-y divide-(--lector-borde)">
          {puedeDosPaginas && (
            <Interruptor
              etiqueta="Libro abierto"
              ayuda="Dos páginas lado a lado"
              activo={ajustes.dosPaginas}
              onCambiar={(dosPaginas) => onCambiar({ dosPaginas })}
            />
          )}
          <Interruptor
            etiqueta="Mostrar mis subrayados"
            ayuda="Apágalo para releer la página limpia"
            activo={!ajustes.ocultarMarcas}
            onCambiar={(mostrar) => onCambiar({ ocultarMarcas: !mostrar })}
          />
        </section>
      </div>
    </Panel>
  )
}
