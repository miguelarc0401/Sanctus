import { BookOpen } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Cargando, Segmentos, Titulo, Vacio } from '../components/Bloques'
import { useGrupos } from '../grupos/contexto'
import { ICONOS_ANOTACION, urlPortada, useLibros, useMisNotas, useProgreso } from '../lib/libros'

function Libros({ grupoId }: { grupoId: number }) {
  const { data: libros = [], isPending } = useLibros(grupoId)
  const { data: progreso } = useProgreso()

  if (isPending) return <Cargando />
  if (libros.length === 0) return <Vacio>Todavía no hay libros para tu grupo.</Vacio>

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
      {libros.map((libro) => {
        const portada = urlPortada(libro.portada)
        const pagina = progreso?.get(libro.id)
        return (
          <li key={libro.id}>
            <Link to={`/biblioteca/${libro.id}`} className="group block">
              {portada ? (
                <img
                  src={portada}
                  alt=""
                  className="aspect-[3/4] w-full rounded-xl bg-white object-cover object-top shadow-md ring-1 ring-stone-200 transition group-hover:shadow-lg"
                />
              ) : (
                <span className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-cielo-100 text-cielo-700 shadow-md">
                  <BookOpen className="size-10" aria-hidden />
                </span>
              )}
              <p className="mt-2 line-clamp-2 font-medium text-stone-900">{libro.titulo}</p>
              {libro.autor && <p className="truncate text-sm text-stone-500">{libro.autor}</p>}
              {pagina && libro.num_paginas > 0 && (
                <div className="mt-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full bg-oro-500"
                      style={{ width: `${Math.round((pagina / libro.num_paginas) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Página {pagina} de {libro.num_paginas}
                  </p>
                </div>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function MisNotas() {
  const { data: notas = [], isPending } = useMisNotas()

  if (isPending) return <Cargando />
  if (notas.length === 0) {
    return <Vacio>Cuando guardes frases o escribas notas en un libro, aparecerán aquí. Sólo tú las ves.</Vacio>
  }

  return (
    <ul className="space-y-3">
      {notas.map((nota) => {
        const Icono = ICONOS_ANOTACION[nota.tipo]
        return (
          <li key={nota.id}>
            <Link
              to={`/biblioteca/${nota.libro_id}?pagina=${nota.pagina}`}
              className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 hover:bg-cielo-50"
            >
              <p className="flex items-center gap-1.5 text-xs text-stone-500">
                <Icono className="size-3.5 text-oro-600" aria-hidden /> {nota.libro.titulo} · pág. {nota.pagina}
              </p>
              {nota.texto && <p className="mt-1.5 font-serif text-lg leading-snug text-cielo-900 italic">«{nota.texto}»</p>}
              {nota.nota && <p className="mt-1.5 whitespace-pre-line text-stone-700">{nota.nota}</p>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Biblioteca() {
  const { grupo } = useGrupos()
  const [vista, setVista] = useState<'libros' | 'notas'>('libros')

  return (
    <div className="space-y-5">
      <Titulo>Biblioteca</Titulo>
      <Segmentos
        opciones={[
          { valor: 'libros', texto: 'Libros' },
          { valor: 'notas', texto: 'Mis frases y notas' },
        ]}
        valor={vista}
        onCambiar={setVista}
      />
      {vista === 'notas' ? (
        <MisNotas />
      ) : grupo ? (
        <Libros grupoId={grupo.id} />
      ) : (
        <Vacio>Cuando pertenezcas a un grupo, aquí verás sus libros.</Vacio>
      )}
    </div>
  )
}
