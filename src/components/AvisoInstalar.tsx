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
    <section className="relative rounded-2xl bg-white p-4 pr-12 shadow-sm ring-1 ring-stone-200">
      <button
        onClick={ocultar}
        aria-label="Ocultar"
        className="absolute top-3 right-3 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
      >
        <X className="size-5" />
      </button>
      <p className="font-medium text-cielo-800">Instala Santa María en tu teléfono</p>
      {puedeInstalar ? (
        <button
          onClick={() => void instalar()}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cielo-800 px-4 py-2 text-sm font-medium text-white hover:bg-cielo-700"
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
