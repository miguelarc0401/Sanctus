import { Quote, Trash2, X } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { COLORES, colorDe, ICONOS_ANOTACION, NOMBRES_ANOTACION, type Anotacion, type ColorAnotacion } from '../lib/libros'
import { BotonIcono } from './Piezas'

// Tarjeta de un subrayado, frase o nota: cambiar su color, escribir la nota o borrarla.
// La nota se guarda también al cerrar la tarjeta, para no perder lo escrito.
export function Ficha({
  anotacion,
  pagina,
  enfocar,
  onGuardarNota,
  onColor,
  onFrase,
  onBorrar,
  onCerrar,
}: {
  // Sin anotación es una nota nueva para la página.
  anotacion: Anotacion | null
  pagina: number
  enfocar: boolean
  onGuardarNota: (nota: string) => Promise<void>
  onColor: (color: ColorAnotacion) => void
  onFrase: (esFrase: boolean) => void
  onBorrar: () => void
  onCerrar: () => void
}) {
  const inicial = anotacion?.nota ?? ''
  const [nota, setNota] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(false)
  const campo = useRef<HTMLTextAreaElement>(null)
  const cambiada = nota.trim() !== inicial.trim()
  const conTexto = !!anotacion?.texto
  const tipo = anotacion?.tipo ?? 'nota'
  const Icono = ICONOS_ANOTACION[tipo]

  async function cerrar() {
    if (cambiada && (anotacion || nota.trim())) {
      setGuardando(true)
      try {
        await onGuardarNota(nota.trim())
      } catch {
        setGuardando(false)
        setError(true)
        return
      }
    }
    onCerrar()
  }

  const alEscape = useEffectEvent(() => void cerrar())
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && alEscape()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [])

  useEffect(() => {
    if (enfocar) campo.current?.focus()
  }, [enfocar])

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="Cerrar" tabIndex={-1} onClick={() => void cerrar()} className="absolute inset-0 size-full bg-black/10" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={anotacion ? NOMBRES_ANOTACION[tipo] : 'Nueva nota'}
        className="absolute inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] mx-auto max-w-md animate-[subir_.22s_ease-out] rounded-3xl bg-(--lector-hoja) p-4 text-(--lector-tinta) shadow-2xl ring-1 ring-(--lector-borde)"
      >
        <div className="flex items-center gap-2">
          <Icono className="size-4" style={{ color: anotacion ? colorDe(anotacion) : '#b45309' }} aria-hidden />
          <p className="flex-1 text-sm text-(--lector-tenue)">
            {anotacion ? NOMBRES_ANOTACION[tipo] : 'Nueva nota'} · página {anotacion?.pagina ?? pagina}
          </p>
          <BotonIcono etiqueta="Cerrar" onClick={() => void cerrar()} className="-my-2 -mr-2">
            <X className="size-5" aria-hidden />
          </BotonIcono>
        </div>

        {conTexto && (
          <blockquote
            className="mt-2 line-clamp-4 border-l-4 pl-3 font-serif text-lg leading-snug italic"
            style={{ borderColor: colorDe(anotacion!) }}
          >
            {anotacion!.texto}
          </blockquote>
        )}

        {conTexto && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div role="group" aria-label="Color del subrayado" className="flex gap-0.5">
              {(Object.keys(COLORES) as ColorAnotacion[]).map((color) => {
                const elegido = tipo === 'subrayado' && (anotacion!.color ?? 'amarillo') === color
                return (
                  <button
                    key={color}
                    onClick={() => onColor(color)}
                    aria-label={COLORES[color].nombre}
                    aria-pressed={elegido}
                    className="grid size-10 place-items-center rounded-full hover:bg-(--lector-suave)"
                  >
                    <span
                      className={`size-7 rounded-full shadow-sm ring-(--lector-acento) ${elegido ? 'ring-2 ring-offset-2 ring-offset-(--lector-hoja)' : ''}`}
                      style={{ background: COLORES[color].muestra }}
                    />
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => onFrase(tipo !== 'frase')}
              aria-pressed={tipo === 'frase'}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium ring-1 transition ${
                tipo === 'frase' ? 'bg-oro-500 text-white ring-oro-500' : 'ring-(--lector-borde) hover:bg-(--lector-suave)'
              }`}
            >
              <Quote className="size-4" aria-hidden /> {tipo === 'frase' ? 'En mis frases' : 'Guardar frase'}
            </button>
          </div>
        )}

        <label htmlFor="nota-lector" className="sr-only">
          Tu nota (sólo tú la ves)
        </label>
        <textarea
          id="nota-lector"
          ref={campo}
          value={nota}
          onChange={(e) => {
            setNota(e.target.value)
            setError(false)
          }}
          rows={3}
          placeholder={conTexto ? 'Escribe qué te dice este fragmento…' : 'Escribe tu nota… (sólo tú la ves)'}
          className="mt-3 block max-h-[40dvh] min-h-24 w-full resize-none rounded-2xl border-0 bg-(--lector-suave) px-4 py-3 text-base leading-relaxed text-(--lector-tinta) outline-none placeholder:text-(--lector-tenue) focus:ring-2 focus:ring-(--lector-acento) [field-sizing:content]"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          {anotacion ? (
            <button
              onClick={onBorrar}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10"
            >
              <Trash2 className="size-4" aria-hidden /> Borrar
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => void cerrar()}
            disabled={guardando || (!anotacion && !nota.trim())}
            className="rounded-xl bg-cielo-800 px-5 py-2.5 font-medium text-white transition hover:bg-cielo-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : cambiada ? 'Guardar' : 'Listo'}
          </button>
        </div>
      </div>
    </div>
  )
}
