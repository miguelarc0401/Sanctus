import { Bell, BellOff, BellRing, Share, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/contexto'
import { activarNotificaciones, desactivarNotificaciones, notificar, useNotificaciones } from '../lib/notificaciones'
import { Boton, MensajeError } from './Formulario'

const CLAVE_INVITACION = 'invitacion-notificaciones-oculta'

function leerOculta() {
  try {
    return localStorage.getItem(CLAVE_INVITACION) === '1'
  } catch {
    return false
  }
}

// En Inicio: invita a activar las notificaciones (una vez; se puede cerrar).
export function InvitacionNotificaciones() {
  const { estado, actualizar } = useNotificaciones()
  const [oculta, setOculta] = useState(leerOculta)
  const [error, setError] = useState<string | null>(null)

  if (oculta || estado !== 'apagadas') return null

  function ocultar() {
    setOculta(true)
    try {
      localStorage.setItem(CLAVE_INVITACION, '1')
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
      <p className="font-medium text-cielo-800">¿Quieres enterarte de los avisos al momento?</p>
      <button
        onClick={() =>
          void activarNotificaciones()
            .catch((e: Error) => setError(e.message))
            .finally(actualizar)
        }
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cielo-800 px-4 py-2 text-sm font-medium text-white hover:bg-cielo-700"
      >
        <Bell className="size-4" aria-hidden /> Activar notificaciones
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  )
}

// Tarjeta para activar o apagar las notificaciones en este teléfono.
export function AjusteNotificaciones() {
  const { perfil } = useAuth()
  const { estado, actualizar } = useNotificaciones()
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function hacer(accion: () => Promise<void>) {
    setTrabajando(true)
    setError(null)
    setMensaje(null)
    try {
      await accion()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTrabajando(false)
      actualizar()
    }
  }

  if (estado === 'cargando') return null

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <p className="flex items-center gap-2 font-medium text-stone-900">
        {estado === 'activas' ? <BellRing className="size-5 text-cielo-700" aria-hidden /> : <Bell className="size-5 text-cielo-700" aria-hidden />}
        Notificaciones
      </p>

      {estado === 'instalar-primero' && (
        <p className="mt-2 text-sm text-stone-600">
          En iPhone, primero instala la app: en Safari toca{' '}
          <Share className="inline size-4 align-text-bottom" aria-label="Compartir" /> y luego «Agregar a inicio». Ábrela desde
          ahí y activa las notificaciones en esta pantalla.
        </p>
      )}
      {estado === 'no-disponible' && (
        <p className="mt-2 text-sm text-stone-600">Este navegador no permite notificaciones. Prueba instalando la app en tu teléfono.</p>
      )}
      {estado === 'bloqueadas' && (
        <p className="mt-2 text-sm text-stone-600">
          Las bloqueaste para esta app. Para activarlas, entra a los ajustes del navegador (o del teléfono) y permite las
          notificaciones de Santa María.
        </p>
      )}
      {estado === 'apagadas' && (
        <>
          <p className="mt-2 text-sm text-stone-600">Entérate al momento de avisos, eventos, votaciones y respuestas a tus preguntas.</p>
          <Boton className="mt-3 w-full" disabled={trabajando} onClick={() => void hacer(activarNotificaciones)}>
            <Bell className="size-4" aria-hidden /> Activar notificaciones
          </Boton>
        </>
      )}
      {estado === 'activas' && (
        <>
          <p className="mt-2 text-sm text-emerald-700">Activadas en este teléfono.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {perfil?.es_admin && (
              <Boton
                variante="secundario"
                className="flex-1"
                disabled={trabajando}
                onClick={() =>
                  void hacer(async () => {
                    const r = await notificar('prueba')
                    setMensaje(r?.enviadas ? 'Listo: en unos segundos te llega una notificación de prueba.' : 'No se pudo enviar la prueba.')
                  })
                }
              >
                Enviarme una de prueba
              </Boton>
            )}
            <Boton variante="secundario" className="flex-1" disabled={trabajando} onClick={() => void hacer(desactivarNotificaciones)}>
              <BellOff className="size-4" aria-hidden /> Apagar
            </Boton>
          </div>
        </>
      )}
      {mensaje && <p className="mt-3 text-sm text-emerald-700">{mensaje}</p>}
      {error && (
        <div className="mt-3">
          <MensajeError>{error}</MensajeError>
        </div>
      )}
    </section>
  )
}
