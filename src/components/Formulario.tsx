import type { ButtonHTMLAttributes, InputHTMLAttributes } from 'react'

type PropsCampo = InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }

export function Campo({ etiqueta, id, ...props }: PropsCampo) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {etiqueta}
      </label>
      <input
        id={id}
        className="block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-cielo-600 focus:ring-2 focus:ring-cielo-200"
        {...props}
      />
    </div>
  )
}

type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' }

const estilos = {
  primario: 'bg-cielo-800 text-white hover:bg-cielo-700',
  secundario: 'bg-white text-cielo-800 ring-1 ring-stone-300 hover:bg-cielo-50',
}

export function Boton({ variante = 'primario', className = '', ...props }: PropsBoton) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${estilos[variante]} ${className}`}
      {...props}
    />
  )
}

export function MensajeError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
      {children}
    </p>
  )
}
