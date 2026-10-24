import { CircleAlert, CircleCheck, Eye, EyeOff } from 'lucide-react'
import {
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const estiloCampo =
  'block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-cielo-600 focus:ring-4 focus:ring-cielo-500/15'

function Etiqueta({ id, texto, ayuda }: { id?: string; texto: string; ayuda?: string }) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-stone-700">
      {texto}
      {ayuda && <span className="ml-1 font-normal text-stone-500">{ayuda}</span>}
    </label>
  )
}

type PropsCampo = InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }

// Las contraseñas llevan un ojito para mostrarlas y revisar lo que se escribió.
export function Campo({ etiqueta, ayuda, id, type, className = '', ...props }: PropsCampo) {
  const [visible, setVisible] = useState(false)
  const esContrasena = type === 'password'
  return (
    <div className="space-y-1.5">
      <Etiqueta id={id} texto={etiqueta} ayuda={ayuda} />
      <div className="relative">
        <input
          id={id}
          type={esContrasena && visible ? 'text' : type}
          className={`${estiloCampo} ${esContrasena ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {esContrasena && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-stone-500 hover:text-cielo-700"
          >
            {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        )}
      </div>
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
      <select id={id} className={`${estiloCampo} cursor-pointer`} {...props}>
        {children}
      </select>
    </div>
  )
}

type PropsCasilla = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { etiqueta: string }

export function Casilla({ etiqueta, id, ...props }: PropsCasilla) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-stone-800">
      <input id={id} type="checkbox" className="size-5 shrink-0 cursor-pointer rounded accent-cielo-800" {...props} />
      {etiqueta}
    </label>
  )
}

type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'peligro' }

const estilos = {
  primario: 'bg-cielo-800 text-white shadow-sm shadow-cielo-900/20 hover:bg-cielo-700',
  secundario: 'bg-white text-cielo-800 ring-1 ring-stone-300 hover:bg-cielo-50',
  peligro: 'bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50',
}

export function Boton({ variante = 'primario', className = '', ...props }: PropsBoton) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${estilos[variante]} ${className}`}
      {...props}
    />
  )
}

export function MensajeError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
      <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

export function MensajeExito({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
      <CircleCheck className="mt-px size-4 shrink-0" aria-hidden />
      <span>{children}</span>
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
