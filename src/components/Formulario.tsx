import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const estiloCampo =
  'block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-cielo-600 focus:ring-2 focus:ring-cielo-200'

function Etiqueta({ id, texto, ayuda }: { id?: string; texto: string; ayuda?: string }) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-stone-700">
      {texto}
      {ayuda && <span className="ml-1 font-normal text-stone-500">{ayuda}</span>}
    </label>
  )
}

type PropsCampo = InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }

export function Campo({ etiqueta, ayuda, id, ...props }: PropsCampo) {
  return (
    <div className="space-y-1.5">
      <Etiqueta id={id} texto={etiqueta} ayuda={ayuda} />
      <input id={id} className={estiloCampo} {...props} />
    </div>
  )
}

type PropsAreaTexto = TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta: string; ayuda?: string }

export function AreaTexto({ etiqueta, ayuda, id, rows = 4, ...props }: PropsAreaTexto) {
  return (
    <div className="space-y-1.5">
      <Etiqueta id={id} texto={etiqueta} ayuda={ayuda} />
      <textarea id={id} rows={rows} className={estiloCampo} {...props} />
    </div>
  )
}

type PropsSelector = SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string; children: ReactNode }

export function Selector({ etiqueta, id, children, ...props }: PropsSelector) {
  return (
    <div className="space-y-1.5">
      <Etiqueta id={id} texto={etiqueta} />
      <select id={id} className={estiloCampo} {...props}>
        {children}
      </select>
    </div>
  )
}

type PropsCasilla = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { etiqueta: string }

export function Casilla({ etiqueta, id, ...props }: PropsCasilla) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 text-stone-800">
      <input id={id} type="checkbox" className="size-5 rounded accent-cielo-800" {...props} />
      {etiqueta}
    </label>
  )
}

type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'peligro' }

const estilos = {
  primario: 'bg-cielo-800 text-white hover:bg-cielo-700',
  secundario: 'bg-white text-cielo-800 ring-1 ring-stone-300 hover:bg-cielo-50',
  peligro: 'bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50',
}

export function Boton({ variante = 'primario', className = '', ...props }: PropsBoton) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${estilos[variante]} ${className}`}
      {...props}
    />
  )
}

export function MensajeError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
      {children}
    </p>
  )
}

// Botones al pie de un formulario: guardar y, si se está editando, eliminar.
export function PieFormulario({
  guardando,
  onEliminar,
  textoGuardar = 'Guardar',
}: {
  guardando: boolean
  onEliminar?: () => void
  textoGuardar?: string
}) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
      {onEliminar ? (
        <Boton type="button" variante="peligro" disabled={guardando} onClick={onEliminar}>
          Eliminar
        </Boton>
      ) : (
        <span />
      )}
      <Boton type="submit" disabled={guardando}>
        {guardando ? 'Guardando…' : textoGuardar}
      </Boton>
    </div>
  )
}
