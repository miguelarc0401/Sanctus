import { Bookmark, MessageSquareText, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { colorDe, type Anotacion } from '../lib/libros'
import type { EntradaIndice } from './paginas'
import { Panel, Pestanas } from './Piezas'
import type { useBusqueda } from './useBusqueda'

export type Pestana = 'indice' | 'notas' | 'buscar'

type Filtro = 'todo' | 'subrayado' | 'frase' | 'nota'

const FILTROS: { valor: Filtro; texto: string; incluye: (a: Anotacion) => boolean }[] = [
  { valor: 'todo', texto: 'Todo', incluye: () => true },
  { valor: 'subrayado', texto: 'Subrayados', incluye: (a) => a.tipo === 'subrayado' },
  { valor: 'frase', texto: 'Frases', incluye: (a) => a.tipo === 'frase' },
  { valor: 'nota', texto: 'Notas', incluye: (a) => a.tipo === 'nota' || !!a.nota },
]

function Encabezado({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold tracking-wider text-(--lector-tenue) uppercase">{children}</h3>
}

function Indice({
  indice,
  marcadores,
  actual,
  total,
  onIr,
}: {
  indice: EntradaIndice[] | null
  marcadores: Anotacion[]
  actual: number
  total: number
  onIr: (pagina: number) => void
}) {
  const [pagina, setPagina] = useState('')
  // El capítulo en el que va la persona: la última entrada que empieza antes de la página actual.
  const enCurso = indice?.findLastIndex((e) => e.pagina <= actual) ?? -1

  return (
    <div className="space-y-6">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (pagina) onIr(Number(pagina))
        }}
      >
        <label htmlFor="ir-a" className="sr-only">
          Ir a la página
        </label>
        <input
          id="ir-a"
          type="number"
          inputMode="numeric"
          min={1}
          max={total}
          value={pagina}
          onChange={(e) => setPagina(e.target.value)}
          placeholder={`Ir a la página (1 a ${total})`}
          className="min-w-0 flex-1 rounded-xl border-0 bg-(--lector-suave) px-4 py-3 text-base text-(--lector-tinta) outline-none placeholder:text-(--lector-tenue) focus:ring-2 focus:ring-(--lector-acento)"
        />
        <button type="submit" className="rounded-xl bg-cielo-800 px-5 font-medium text-white hover:bg-cielo-700">
          Ir
        </button>
      </form>

      {marcadores.length > 0 && (
        <section>
          <Encabezado>Páginas marcadas</Encabezado>
          <div className="flex flex-wrap gap-2">
            {marcadores.map((m) => (
              <button
                key={m.id}
                onClick={() => onIr(m.pagina)}
                className="flex items-center gap-1.5 rounded-full bg-(--lector-suave) py-2 pr-4 pl-3 text-sm font-medium hover:ring-1 hover:ring-(--lector-borde)"
              >
                <Bookmark className="size-4 fill-oro-500 text-oro-500" aria-hidden /> Página {m.pagina}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <Encabezado>Índice</Encabezado>
        {indice === null ? (
          <p className="animate-pulse py-4 text-(--lector-tenue)">Leyendo el índice…</p>
        ) : indice.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-(--lector-borde) px-4 py-5 text-center text-sm text-(--lector-tenue)">
            Este libro no trae índice. Puedes marcar páginas con la cinta para volver a ellas rápido.
          </p>
        ) : (
          <ol className="-mx-2">
            {indice.map((entrada, i) => (
              <li key={i}>
                <button
                  onClick={() => onIr(entrada.pagina)}
                  aria-current={i === enCurso ? 'true' : undefined}
                  className={`flex w-full items-baseline gap-3 rounded-xl py-2.5 pr-2 text-left hover:bg-(--lector-suave) ${
                    i === enCurso ? 'font-semibold text-(--lector-acento)' : ''
                  } ${entrada.nivel === 0 ? 'font-serif text-lg' : 'text-sm'}`}
                  style={{ paddingLeft: `${0.5 + entrada.nivel * 1}rem` }}
                >
                  <span className="flex-1">{entrada.titulo}</span>
                  <span className="font-sans text-sm text-(--lector-tenue) tabular-nums">{entrada.pagina}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function Notas({ anotaciones, onIr }: { anotaciones: Anotacion[]; onIr: (a: Anotacion) => void }) {
  const [filtro, setFiltro] = useState<Filtro>('todo')

  if (anotaciones.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-(--lector-tenue)">
        <MessageSquareText className="mx-auto mb-3 size-10 opacity-40" aria-hidden />
        <p>Aquí aparecerán tus subrayados, frases y notas de este libro.</p>
        <p className="mt-2 text-sm">Para subrayar, mantén presionado el texto. Sólo tú los ves.</p>
      </div>
    )
  }

  const visibles = anotaciones.filter(FILTROS.find((f) => f.valor === filtro)!.incluye)
  const porPagina = new Map<number, Anotacion[]>()
  for (const a of visibles) porPagina.set(a.pagina, [...(porPagina.get(a.pagina) ?? []), a])

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTROS.map((f) => {
          const cuenta = anotaciones.filter(f.incluye).length
          return (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              aria-pressed={filtro === f.valor}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filtro === f.valor ? 'bg-cielo-800 text-white' : 'bg-(--lector-suave) text-(--lector-tinta)'
              }`}
            >
              {f.texto} <span className="opacity-70">{cuenta}</span>
            </button>
          )
        })}
      </div>
      {visibles.length === 0 && <p className="py-6 text-center text-sm text-(--lector-tenue)">Nada por aquí todavía.</p>}
      {[...porPagina].sort(([a], [b]) => a - b).map(([pagina, delaPagina]) => (
        <section key={pagina}>
          <Encabezado>Página {pagina}</Encabezado>
          <ul className="-mx-2 space-y-1">
            {delaPagina.map((a) => (
              <li key={a.id}>
                <button onClick={() => onIr(a)} className="flex w-full gap-3 rounded-2xl p-2 text-left hover:bg-(--lector-suave)">
                  <span className="w-1 shrink-0 rounded-full" style={{ background: colorDe(a) }} />
                  <span className="min-w-0 flex-1">
                    {a.texto && <span className="line-clamp-3 font-serif text-lg leading-snug italic">«{a.texto}»</span>}
                    {a.nota && (
                      <span className={`flex gap-1.5 text-sm text-(--lector-tenue) ${a.texto ? 'mt-1' : ''}`}>
                        <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden />
                        <span className="line-clamp-4 min-w-0 whitespace-pre-line wrap-break-word">{a.nota}</span>
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Buscar({ busqueda, onIr }: { busqueda: ReturnType<typeof useBusqueda>; onIr: (pagina: number) => void }) {
  const { termino, setTermino, buscado, resultados, revisadas, buscando, total } = busqueda
  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar en este libro</span>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-(--lector-tenue)" aria-hidden />
        <input
          type="search"
          autoFocus
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar en este libro"
          className="block w-full rounded-xl border-0 bg-(--lector-suave) py-3 pr-4 pl-12 text-base text-(--lector-tinta) outline-none placeholder:text-(--lector-tenue) focus:ring-2 focus:ring-(--lector-acento)"
        />
      </label>

      {buscando && (
        <div aria-live="polite">
          <p className="text-sm text-(--lector-tenue)">
            Buscando… {revisadas > 0 && `página ${revisadas} de ${total}`}
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-(--lector-suave)">
            <div className="h-full rounded-full bg-oro-500 transition-[width]" style={{ width: `${(revisadas / Math.max(total, 1)) * 100}%` }} />
          </div>
        </div>
      )}
      {!buscando && buscado && (
        <p aria-live="polite" className="text-sm text-(--lector-tenue)">
          {resultados.length === 0
            ? `No encontré «${buscado}» en este libro.`
            : `${resultados.length === 1 ? '1 resultado' : `${resultados.length} resultados`}${resultados.length >= 5 ? ' (hasta 5 por página)' : ''}.`}
        </p>
      )}
      {!buscado && !buscando && (
        <p className="text-sm text-(--lector-tenue)">Escribe una palabra o frase. No importan los acentos ni las mayúsculas.</p>
      )}

      <ul className="-mx-2 space-y-1">
        {resultados.map((r, i) => (
          <li key={i}>
            <button onClick={() => onIr(r.pagina)} className="w-full rounded-2xl p-2 text-left hover:bg-(--lector-suave)">
              <span className="text-xs font-semibold tracking-wider text-(--lector-tenue) uppercase">Página {r.pagina}</span>
              <span className="mt-0.5 block font-serif text-lg leading-snug">
                {r.antes}
                <mark className="rounded bg-oro-400/45 px-0.5 text-inherit">{r.encontrado}</mark>
                {r.despues}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Cuaderno({
  pestana,
  onPestana,
  indice,
  anotaciones,
  busqueda,
  actual,
  total,
  onIrPagina,
  onIrAnotacion,
  onIrResultado,
  onCerrar,
}: {
  pestana: Pestana
  onPestana: (p: Pestana) => void
  indice: EntradaIndice[] | null
  anotaciones: Anotacion[]
  busqueda: ReturnType<typeof useBusqueda>
  actual: number
  total: number
  onIrPagina: (pagina: number) => void
  onIrAnotacion: (a: Anotacion) => void
  onIrResultado: (pagina: number) => void
  onCerrar: () => void
}) {
  const marcadores = anotaciones.filter((a) => a.tipo === 'marcador')
  const notas = anotaciones.filter((a) => a.tipo !== 'marcador')
  return (
    <Panel titulo="Cuaderno" variante="cajon" onCerrar={onCerrar}>
      <div className="space-y-5">
        <Pestanas
          opciones={[
            { valor: 'indice', texto: 'Índice' },
            { valor: 'notas', texto: 'Mis notas' },
            { valor: 'buscar', texto: 'Buscar' },
          ]}
          valor={pestana}
          onCambiar={onPestana}
        />
        {pestana === 'indice' && <Indice indice={indice} marcadores={marcadores} actual={actual} total={total} onIr={onIrPagina} />}
        {pestana === 'notas' && <Notas anotaciones={notas} onIr={onIrAnotacion} />}
        {pestana === 'buscar' && <Buscar busqueda={busqueda} onIr={onIrResultado} />}
      </div>
    </Panel>
  )
}
