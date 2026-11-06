import { useCallback, useEffect, useState } from 'react'
import { llamarFuncion } from './consultas'
import { esAppInstalada, esIOS } from './instalar'
import { supabase } from './supabase'

const VAPID_PUBLICA = import.meta.env.VITE_VAPID_PUBLICA ?? ''

export type EstadoNotificaciones = 'cargando' | 'no-disponible' | 'instalar-primero' | 'bloqueadas' | 'apagadas' | 'activas'

const hayApoyo = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLICA

// La clave pública viene en base64url; el navegador la pide en bytes.
function enBytes(base64url: string) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

async function registro() {
  // Sin service worker (por ejemplo, en desarrollo) no hay notificaciones.
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

async function consultarEstado(): Promise<EstadoNotificaciones> {
  // En iPhone sólo funcionan con la app instalada en la pantalla de inicio.
  if (esIOS && !esAppInstalada) return 'instalar-primero'
  if (!hayApoyo()) return 'no-disponible'
  if (Notification.permission === 'denied') return 'bloqueadas'
  const reg = await registro()
  if (!reg) return 'no-disponible'
  return (await reg.pushManager.getSubscription()) ? 'activas' : 'apagadas'
}

export function useNotificaciones() {
  const [estado, setEstado] = useState<EstadoNotificaciones>('cargando')
  const actualizar = useCallback(() => {
    void consultarEstado().then(setEstado)
  }, [])
  useEffect(actualizar, [actualizar])
  return { estado, actualizar }
}

export async function activarNotificaciones() {
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    throw new Error(
      permiso === 'denied'
        ? 'Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador para esta página.'
        : 'No diste permiso para las notificaciones.',
    )
  }
  const reg = await registro()
  if (!reg) throw new Error('Abre la app instalada (o recarga la página) e inténtalo de nuevo.')
  await guardar(await suscribir(reg))
  marcarApagadas(false)
}

async function suscribir(reg: ServiceWorkerRegistration) {
  return (
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: enBytes(VAPID_PUBLICA) }))
  )
}

// El servidor guarda la dirección de este teléfono a nombre de la cuenta con la que se entró.
async function guardar(suscripcion: PushSubscription) {
  const { endpoint, keys } = suscripcion.toJSON()
  const { error } = await supabase.rpc('guardar_suscripcion', {
    direccion: endpoint,
    clave_p256dh: keys?.p256dh,
    clave_auth: keys?.auth,
  })
  if (error) throw error
}

// Si alguien las apaga a mano, no se vuelven a encender solas al abrir la app.
const CLAVE_APAGADAS = 'notificaciones-apagadas'

function apagadasAMano() {
  try {
    return localStorage.getItem(CLAVE_APAGADAS) === '1'
  } catch {
    return false
  }
}

function marcarApagadas(apagadas: boolean) {
  try {
    if (apagadas) localStorage.setItem(CLAVE_APAGADAS, '1')
    else localStorage.removeItem(CLAVE_APAGADAS)
  } catch {
    // Sin almacenamiento, sólo no se recuerda la preferencia.
  }
}

// Al abrir la app: el servidor vuelve a guardar la dirección de este teléfono tal como está hoy. El navegador a
// veces la cambia o la pierde (al reinstalar la app, al borrar datos, al actualizarse), y entonces las
// notificaciones dejaban de llegar aunque la app dijera «activadas». Sólo si el permiso ya estaba dado: no
// pregunta nada.
async function sincronizar() {
  if (!hayApoyo() || Notification.permission !== 'granted' || apagadasAMano()) return
  const reg = await registro()
  if (reg) await guardar(await suscribir(reg))
}

export function useSincronizarNotificaciones(cuenta: string | null) {
  useEffect(() => {
    if (cuenta) void sincronizar().catch((e) => console.warn('No se pudieron revisar las notificaciones', e))
  }, [cuenta])
}

// Al cerrar sesión: este teléfono deja de recibir notificaciones de la cuenta.
export async function desactivarNotificaciones() {
  if (!hayApoyo()) return
  const suscripcion = await (await registro())?.pushManager.getSubscription()
  if (!suscripcion) return
  await supabase.rpc('borrar_suscripcion', { direccion: suscripcion.endpoint })
  await suscripcion.unsubscribe()
}

// El botón «Apagar»: además, recuerda que fue a propósito.
export async function apagarNotificaciones() {
  await desactivarNotificaciones()
  marcarApagadas(true)
}

type Tipo = 'aviso' | 'evento' | 'mensaje' | 'encuesta' | 'prueba'

// Avisa a los miembros (o, con un mensaje, a la otra persona). Si falla, lo publicado ya quedó guardado:
// sólo no llega la notificación.
export async function notificar(tipo: Tipo, id?: number) {
  try {
    return await llamarFuncion<{ enviadas: number; total: number }>('notificar', {
      tipo,
      id,
      zona: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  } catch (e) {
    console.warn('No se pudo enviar la notificación', e)
    return null
  }
}
