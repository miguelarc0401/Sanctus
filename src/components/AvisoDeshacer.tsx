import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, LoaderCircle, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cerrarAvisoDeshacer, deshacerBorrado, useUltimoBorrado, type Borrado } from '../lib/deshacer'
import { traducirErrorDatos } from '../lib/errores'

type Estado = 'listo' | 'deshaciendo' | 'hecho' | 'error'

function Tarjeta({ borrado }: { borrado: Borrado }) {
  const clienteConsultas = useQueryClient()
  const [estado, setEstado] = useState<Estado>('listo')
  const [error, setError] = useState('')
  // Mientras el ratón o el teclado están sobre la tarjeta, no se va.
  const [encima, setEncima] = useState(false)

  // Se va sola después de un rato (más corto cuando ya se recuperó).
  useEffect(() => {
    if (encima || estado === 'deshaciendo' || estado === 'error') return
    const espera = setTimeout(cerrarAvisoDeshacer, estado === 'hecho' ? 3000 : 12_000)
    return () => clearTimeout(espera)
  }, [estado, encima])

  async function deshacer() {
    setEstado('deshaciendo')
    try {
      await deshacerBorrado(borrado.tabla, borrado.id)
      setEstado('hecho')
      void clienteConsultas.invalidateQueries()
    } catch (e) {
      setError(traducirErrorDatos(e))
      setEstado('error')
    }
  }

  return (
    <div
      onPointerEnter={() => setEncima(true)}
      onPointerLeave={() => setEncima(false)}
      onFocus={() => setEncima(true)}
      onBlur={() => setEncima(false)}
      className="pointer-events-auto flex w-full max-w-md animate-aparecer items-center gap-3 rounded-2xl bg-stone-900 py-2 pr-2 pl-4 text-white shadow-xl shadow-stone-900/30"
    >
      {estado === 'hecho' ? (
        <CircleCheck className="size-5 shrink-0 text-emerald-400" aria-hidden />
      ) : (
        <Trash2 className="size-5 shrink-0 text-stone-400" aria-hidden />
      )}
      <p className="min-w-0 flex-1 py-1.5 text-sm">
        {estado === 'hecho' ? (
          'Listo, se recuperó.'
        ) : estado === 'error' ? (
          error
        ) : (
          <>
            Se borró{' '}
            {borrado.nombre ? <span className="font-semibold break-words">«{borrado.nombre}»</span> : 'correctamente'}.
          </>
        )}
      </p>
      {(estado === 'listo' || estado === 'deshaciendo') && (
        <button
          onClick={() => void deshacer()}
          disabled={estado === 'deshaciendo'}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 font-semibold text-oro-400 transition hover:bg-white/10 disabled:opacity-70"
        >
          {estado === 'deshaciendo' && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {estado === 'deshaciendo' ? 'Recuperando…' : 'Deshacer'}
        </button>
      )}
      <button
        onClick={cerrarAvisoDeshacer}
        aria-label="Cerrar aviso"
        className="grid size-11 shrink-0 place-items-center rounded-xl text-stone-400 transition hover:bg-white/10 hover:text-white"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  )
}

// Franja oscura abajo, justo después de borrar algo: «Se borró… Deshacer».
// Cada borrado nuevo trae su propia tarjeta (por la «key»), así empieza de cero.
export function AvisoDeshacer() {
  const borrado = useUltimoBorrado()
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:bottom-6 lg:pl-76"
    >
      {borrado && <Tarjeta key={borrado.clave} borrado={borrado} />}
    </div>
  )
}
