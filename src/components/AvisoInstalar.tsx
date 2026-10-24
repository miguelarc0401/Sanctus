import { Download, Share, X } from 'lucide-react'
import { useState } from 'react'
import { esAppInstalada, esIOS, instalar, usePuedeInstalar } from '../lib/instalar'

const CLAVE_OCULTO = 'aviso-instalar-oculto'

function leerOculto() {
  try {
    return localStorage.getItem(CLAVE_OCULTO) === '1'
  } catch {
    return false
  }
}

export function AvisoInstalar() {
  const puedeInstalar = usePuedeInstalar()
  const [oculto, setOculto] = useState(leerOculto)

  if (oculto || esAppInstalada || (!puedeInstalar && !esIOS)) return null

  function ocultar() {
    setOculto(true)
    try {
      localStorage.setItem(CLAVE_OCULTO, '1')
    } catch {
      // Sin almacenamiento sólo se oculta mientras la página esté abierta.
    }
  }

  return (
    <section className="relative rounded-2xl bg-white p-4 pr-14 shadow-tarjeta ring-1 ring-stone-200/80">
      <button
        onClick={ocultar}
        aria-label="Ocultar"
        className="absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-700"
      >
        <X className="size-5" aria-hidden />
      </button>
      <p className="font-medium text-cielo-800">Instala Santa María en tu teléfono</p>
      {puedeInstalar ? (
        <button
          onClick={() => void instalar()}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cielo-800 px-4 text-sm font-medium text-white shadow-sm shadow-cielo-900/20 hover:bg-cielo-700"
        >
          <Download className="size-4" aria-hidden />
          Instalar
        </button>
      ) : (
        <p className="mt-1 text-sm text-stone-600">
          En Safari toca <Share className="inline size-4 align-text-bottom" aria-label="Compartir" /> y
          luego «Agregar a inicio».
        </p>
      )}
    </section>
  )
}
