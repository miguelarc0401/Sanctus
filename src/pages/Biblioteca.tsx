import { BookOpen, ChevronRight, Quote, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Cargando, Encabezado, Segmentos, Vacio } from '../components/Bloques'
import { useGrupos } from '../grupos/contexto'
import {
  colorDe,
  ICONOS_ANOTACION,
  urlPortada,
  useLibros,
  useMisNotas,
  useProgreso,
  type Libro,
  type NotaConLibro,
} from '../lib/libros'

const DIAS_NUEVO = 21

// Portada con lomo, como un libro de verdad; sin imagen, una portada sencilla con el título.
function Portada({ libro, className = '' }: { libro: Libro; className?: string }) {
  const portada = urlPortada(libro.portada)
  return (
    <span
      className={`relative block aspect-[3/4] overflow-hidden rounded-l-[3px] rounded-r-lg bg-white shadow-[0_2px_4px_rgb(0_0_0/0.08),0_10px_24px_-10px_rgb(0_0_0/0.35)] ring-1 ring-black/5 ${className}`}
    >
      {portada ? (
        <img src={portada} alt="" loading="lazy" className="size-full object-cover object-top" />
      ) : (
        <span className="flex size-full flex-col justify-center bg-gradient-to-br from-cielo-700 to-cielo-900 p-3 pl-5">
          <span className="border-y border-oro-400/70 py-2 font-serif text-lg leading-tight font-semibold text-white">{libro.titulo}</span>
        </span>
      )}
      <span aria-hidden className="absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/25 via-white/20 to-transparent" />
    </span>
  )
}

function SeguirLeyendo({ libro, pagina }: { libro: Libro; pagina: number }) {
  const avance = libro.num_paginas ? Math.round((pagina / libro.num_paginas) * 100) : 0
  return (
    <Link
      to={`/biblioteca/${libro.id}`}
      className="group flex items-center gap-4 rounded-3xl bg-gradient-to-br from-cielo-800 to-cielo-900 p-4 text-white shadow-lg transition hover:shadow-xl"
    >
      <Portada libro={libro} className="w-20 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold tracking-wider text-oro-400 uppercase">Seguir leyendo</span>
        <span className="mt-1 line-clamp-2 font-serif text-2xl leading-tight font-semibold">{libro.titulo}</span>
        {libro.num_paginas > 0 && (
          <>
            <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/20">
              <span className="block h-full rounded-full bg-oro-400" style={{ width: `${avance}%` }} />
            </span>
            <span className="mt-1.5 block text-sm text-cielo-100">
              Página {pagina} de {libro.num_paginas} · {avance} %
            </span>
          </>
        )}
      </span>
      <ChevronRight className="size-6 shrink-0 text-cielo-200 transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}

function Libros({ grupoId }: { grupoId: number }) {
  const { data: libros = [], isPending } = useLibros(grupoId)
  const { data: progreso } = useProgreso()
  // Los libros agregados después de esta fecha (y sin abrir) llevan la etiqueta «Nuevo».
  const [haceNada] = useState(() => Date.now() - DIAS_NUEVO * 86_400_000)

  if (isPending) return <Cargando />
  if (libros.length === 0) return <Vacio Icono={BookOpen}>Todavía no hay libros para tu grupo.</Vacio>

  // El libro que se leyó más recientemente.
  const reciente = libros
    .filter((l) => progreso?.has(l.id))
    .sort((a, b) => progreso!.get(b.id)!.leido_en.localeCompare(progreso!.get(a.id)!.leido_en))[0]

  return (
    <div className="space-y-6">
      {reciente && <SeguirLeyendo libro={reciente} pagina={progreso!.get(reciente.id)!.pagina} />}
      <ul className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3">
        {libros.map((libro) => {
          const pagina = progreso?.get(libro.id)?.pagina
          const avance = pagina && libro.num_paginas ? Math.round((pagina / libro.num_paginas) * 100) : null
          const nuevo = !pagina && new Date(libro.creado_en).getTime() > haceNada
          return (
            <li key={libro.id}>
              <Link to={`/biblioteca/${libro.id}`} className="group block">
                <span className="relative block transition duration-300 group-hover:-translate-y-1">
                  <Portada libro={libro} />
                  {nuevo && (
                    <span className="absolute top-2 right-2 rounded-full bg-oro-500 px-2 py-0.5 text-xs font-semibold text-white shadow">
                      Nuevo
                    </span>
                  )}
                </span>
                <span className="mt-2.5 line-clamp-2 font-medium text-stone-900">{libro.titulo}</span>
                {libro.autor && <span className="block truncate text-sm text-stone-500">{libro.autor}</span>}
                {avance !== null && (
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-stone-200">
                      <span className="block h-full rounded-full bg-oro-500" style={{ width: `${avance}%` }} />
                    </span>
                    <span className="text-xs text-stone-500 tabular-nums">{avance} %</span>
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Para buscar sin importar mayúsculas ni acentos: «Oración» encuentra «oracion».
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

type Filtro = 'todo' | 'frase' | 'nota'

const FILTROS: { valor: Filtro; texto: string; incluye: (n: NotaConLibro) => boolean }[] = [
  { valor: 'todo', texto: 'Todo', incluye: () => true },
  { valor: 'frase', texto: 'Frases', incluye: (n) => n.tipo === 'frase' },
  { valor: 'nota', texto: 'Notas', incluye: (n) => !!n.nota },
]

function MisNotas() {
  const { data: notas = [], isPending } = useMisNotas()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todo')

  if (isPending) return <Cargando />
  if (notas.length === 0) {
    return <Vacio Icono={Quote}>Cuando guardes frases o escribas notas en un libro, aparecerán aquí. Sólo tú las ves.</Vacio>
  }

  const buscada = normalizar(busqueda.trim())
  const visibles = notas
    .filter(FILTROS.find((f) => f.valor === filtro)!.incluye)
    .filter((n) => !buscada || normalizar(`${n.texto ?? ''} ${n.nota ?? ''} ${n.libro.titulo}`).includes(buscada))

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar en mis frases y notas</span>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-stone-400" aria-hidden />
        <input
          type="search"
          placeholder="Buscar en mis frases y notas"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="block min-h-12 w-full rounded-xl border border-stone-300 bg-white py-3 pr-4 pl-12 text-base shadow-sm outline-none placeholder:text-stone-500 focus:border-cielo-600 focus:ring-4 focus:ring-cielo-500/15"
        />
      </label>
      <div role="group" aria-label="Mostrar" className="flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            aria-pressed={filtro === f.valor}
            className={`min-h-10 rounded-full px-3.5 text-sm font-medium transition ${
              filtro === f.valor ? 'bg-cielo-800 text-white shadow-sm' : 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-cielo-50'
            }`}
          >
            {f.texto} <span className="opacity-70">{notas.filter(f.incluye).length}</span>
          </button>
        ))}
      </div>
      {visibles.length === 0 && (
        <Vacio>{busqueda.trim() ? `No encontré nada con «${busqueda.trim()}».` : 'Nada por aquí todavía.'}</Vacio>
      )}
      <ListaDeNotas notas={visibles} />
    </div>
  )
}

function ListaDeNotas({ notas }: { notas: NotaConLibro[] }) {
  return (
    <ul className="space-y-3">
      {notas.map((nota) => {
        const Icono = ICONOS_ANOTACION[nota.tipo]
        return (
          <li key={nota.id}>
            <Link
              to={`/biblioteca/${nota.libro_id}?pagina=${nota.pagina}&marca=${nota.id}`}
              className="flex gap-3 rounded-2xl bg-white p-4 shadow-tarjeta ring-1 ring-stone-200/80 transition hover:bg-cielo-50"
            >
              <span aria-hidden className="w-1 shrink-0 rounded-full" style={{ background: colorDe(nota) }} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-xs text-stone-600">
                  <Icono className="size-3.5 text-oro-600" aria-hidden /> {nota.libro.titulo} · pág. {nota.pagina}
                </span>
                {nota.texto && <span className="mt-1.5 block font-serif text-lg leading-snug text-cielo-900 italic">«{nota.texto}»</span>}
                {nota.nota && <span className="mt-1.5 block whitespace-pre-line text-stone-700">{nota.nota}</span>}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Biblioteca() {
  const { grupo, cargando } = useGrupos()
  const [parametros, setParametros] = useSearchParams()
  const vista = parametros.get('vista') === 'notas' ? 'notas' : 'libros'

  return (
    <div className="space-y-5">
      <Encabezado titulo="Biblioteca" descripcion="Libros para reflexionar, con tus subrayados y notas privadas." />
      <Segmentos
        etiqueta="Biblioteca"
        opciones={[
          { valor: 'libros', texto: 'Libros' },
          { valor: 'notas', texto: 'Mis frases y notas' },
        ]}
        valor={vista}
        onCambiar={(v) => setParametros(v === 'libros' ? {} : { vista: v }, { replace: true })}
      />
      {vista === 'notas' ? (
        <MisNotas />
      ) : cargando ? (
        <Cargando />
      ) : grupo ? (
        <Libros grupoId={grupo.id} />
      ) : (
        <Vacio Icono={BookOpen}>Cuando pertenezcas a un grupo, aquí verás sus libros.</Vacio>
      )}
    </div>
  )
}
