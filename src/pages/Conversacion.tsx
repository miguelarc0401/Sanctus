import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CheckCheck, Lock, MessageCircle, SendHorizontal } from 'lucide-react'
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/contexto'
import { Cargando, Vacio } from '../components/Bloques'
import { MensajeError } from '../components/Formulario'
import { TextoConEnlaces } from '../components/TextoConEnlaces'
import { hayConexion } from '../lib/conexion'
import { traducirErrorDatos } from '../lib/errores'
import { diaLargo, diasDesdeHoy, hora } from '../lib/fechas'
import { enviarMensaje, esIdValido, marcarLeidos, useContacto, useMensajes, type Mensaje } from '../lib/mensajes'
import { useTituloDocumento } from '../lib/useTituloDocumento'
import { Iniciales } from './Mensajes'

// Mensajes seguidos de la misma persona (con menos de 5 minutos entre uno y otro) van más juntos.
const JUNTOS = 5 * 60_000

function nombreDelDia(iso: string) {
  const dias = -diasDesdeHoy(iso)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  const largo = diaLargo(iso)
  return largo.charAt(0).toUpperCase() + largo.slice(1)
}

// ¿Está la app a la vista? Si está en segundo plano, lo que llega no se marca como leído.
function useALaVista() {
  const [aLaVista, setALaVista] = useState(() => document.visibilityState === 'visible')
  useEffect(() => {
    const cambiar = () => setALaVista(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', cambiar)
    return () => document.removeEventListener('visibilitychange', cambiar)
  }, [])
  return aLaVista
}

function Burbuja({ mensaje, mio, nombre, junto }: { mensaje: Mensaje; mio: boolean; nombre: string; junto: boolean }) {
  return (
    <li className={`flex ${mio ? 'justify-end' : 'justify-start'} ${junto ? 'mt-1' : 'mt-3'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 pt-2 pb-1.5 shadow-sm sm:max-w-[75%] ${
          mio ? 'rounded-br-md bg-cielo-800 text-white' : 'rounded-bl-md bg-white text-stone-900 ring-1 ring-stone-200/80'
        } ${mensaje.enviando ? 'opacity-70' : ''}`}
      >
        <p className="sr-only">{mio ? 'Tú' : nombre}:</p>
        <TextoConEnlaces claseEnlace={mio ? 'text-white decoration-white/50 hover:decoration-white' : undefined}>
          {mensaje.texto}
        </TextoConEnlaces>
        <p className={`mt-0.5 flex items-center justify-end gap-1 text-xs ${mio ? 'text-cielo-200' : 'text-stone-500'}`}>
          {mensaje.enviando ? 'Enviando…' : hora(mensaje.creado_en)}
          {mio && !mensaje.enviando && (
            mensaje.leido_en ? (
              <CheckCheck className="size-3.5 text-oro-400" aria-label="Visto" />
            ) : (
              <Check className="size-3.5" aria-label="Enviado" />
            )
          )}
        </p>
      </div>
    </li>
  )
}

// Cada conversación empieza de cero (abajo del todo y con el campo vacío), aunque se pase de una a otra.
export function Conversacion() {
  const persona = useParams().persona ?? ''
  return <ConversacionCon key={persona} persona={persona} />
}

function ConversacionCon({ persona }: { persona: string }) {
  const { perfil } = useAuth()
  const yo = perfil?.id ?? ''
  const clienteConsultas = useQueryClient()
  const { data: contacto, isPending: cargandoContacto } = useContacto(persona)
  const { data: mensajes = [], isPending } = useMensajes(persona)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  const aLaVista = useALaVista()
  const nombre = contacto?.nombre ?? ''
  useTituloDocumento(nombre || 'Mensajes')

  // Al abrir la conversación (y mientras está abierta), lo que me escribieron queda como leído.
  const porLeer = mensajes.some((m) => m.de === persona && !m.leido_en)
  useEffect(() => {
    if (!porLeer || !aLaVista) return
    marcarLeidos(persona)
      .then(() => clienteConsultas.invalidateQueries({ queryKey: ['mensajes'] }))
      .catch(() => {})
  }, [porLeer, aLaVista, persona, clienteConsultas])

  // Al entrar se ve lo último; al llegar algo nuevo, se baja si ya se estaba abajo (o si lo mandé yo).
  const ultimoId = mensajes.at(-1)?.id
  const ultimoMio = mensajes.at(-1)?.de === yo
  const primeraVez = useRef(true)
  useLayoutEffect(() => {
    if (ultimoId === undefined) return
    const alto = document.documentElement.scrollHeight
    const cerca = window.innerHeight + window.scrollY >= alto - 240
    if (primeraVez.current || cerca || ultimoMio) {
      window.scrollTo({ top: alto, behavior: primeraVez.current ? 'instant' : 'smooth' })
    }
    primeraVez.current = false
  }, [ultimoId, ultimoMio])

  // El campo crece con el texto, hasta unas cinco líneas.
  useLayoutEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [texto])

  async function enviar() {
    const limpio = texto.trim()
    if (!limpio) return
    if (!hayConexion()) {
      setError('No hay internet. Tu mensaje se enviará cuando lo vuelvas a intentar con conexión.')
      return
    }
    const clave = ['mensajes', 'con', yo, persona]
    const temporal: Mensaje = {
      id: -Date.now(),
      de: yo,
      para: persona,
      texto: limpio,
      creado_en: new Date().toISOString(),
      leido_en: null,
      enviando: true,
    }
    await clienteConsultas.cancelQueries({ queryKey: clave })
    clienteConsultas.setQueryData<Mensaje[]>(clave, (viejos = []) => [...viejos, temporal])
    setTexto('')
    setError(null)
    campo.current?.focus()
    try {
      await enviarMensaje(persona, limpio)
    } catch (e) {
      clienteConsultas.setQueryData<Mensaje[]>(clave, (viejos = []) => viejos.filter((m) => m.id !== temporal.id))
      setTexto((actual) => actual || limpio)
      setError(traducirErrorDatos(e, { sinPermiso: 'Ya no le puedes escribir a esta persona.' }))
    } finally {
      void clienteConsultas.invalidateQueries({ queryKey: ['mensajes'] })
    }
  }

  if (!esIdValido(persona) || (!cargandoContacto && !isPending && !contacto && mensajes.length === 0)) {
    return (
      <div className="space-y-4">
        <Volver />
        <Vacio Icono={MessageCircle}>No encontramos esta conversación.</Vacio>
      </div>
    )
  }

  const puedeEscribir = contacto?.puede_escribir ?? false
  const esCoordinador = contacto?.es_coordinador ?? false

  return (
    <div className="flex min-h-[calc(100dvh-6.5rem-env(safe-area-inset-top))] flex-col lg:min-h-[calc(100dvh-3rem)]">
      <header className="flex items-center gap-3 border-b border-stone-200/80 pb-4">
        <Volver />
        {nombre && <Iniciales nombre={nombre} coordinador={esCoordinador} grande />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-3xl leading-tight font-semibold text-cielo-800">{nombre || 'Mensajes'}</h1>
          <p className="flex items-center gap-1.5 text-sm text-stone-600">
            {esCoordinador ? 'Coordinador' : 'Miembro'}
            <span aria-hidden>·</span>
            <Lock className="size-3.5" aria-hidden /> Privado
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-end py-4">
        {isPending ? (
          <Cargando />
        ) : mensajes.length === 0 ? (
          <p className="mx-auto max-w-xs py-10 text-center text-pretty text-stone-600">
            Escríbele a {nombre.split(' ')[0]}. Esta conversación sólo la ven ustedes dos.
          </p>
        ) : (
          <ol aria-label={`Conversación con ${nombre}`}>
            {mensajes.map((mensaje, i) => {
              const anterior = mensajes[i - 1]
              const dia = nombreDelDia(mensaje.creado_en)
              const nuevoDia = !anterior || nombreDelDia(anterior.creado_en) !== dia
              const junto =
                !nuevoDia && anterior.de === mensaje.de && Date.parse(mensaje.creado_en) - Date.parse(anterior.creado_en) < JUNTOS
              return (
                <Fragment key={mensaje.id}>
                  {nuevoDia && (
                    <li className="mt-5 mb-1 flex justify-center first:mt-0">
                      <span className="rounded-full bg-crema-200 px-3 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200/70">
                        {dia}
                      </span>
                    </li>
                  )}
                  <Burbuja mensaje={mensaje} mio={mensaje.de === yo} nombre={nombre} junto={junto} />
                </Fragment>
              )
            })}
          </ol>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-stone-200/80 bg-crema/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:-mx-10 lg:px-10 lg:pb-4">
        {puedeEscribir || cargandoContacto ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              void enviar()
            }}
          >
            {error && <MensajeError>{error}</MensajeError>}
            <div className="flex items-end gap-2">
              <label htmlFor="mensaje" className="sr-only">
                Mensaje para {nombre}
              </label>
              <textarea
                id="mensaje"
                ref={campo}
                rows={1}
                maxLength={4000}
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  // En la computadora, Enter envía (Mayús + Enter hace otro renglón). En el teléfono, Enter es otro renglón.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && matchMedia('(pointer: fine)').matches) {
                    e.preventDefault()
                    void enviar()
                  }
                }}
                placeholder="Escribe un mensaje…"
                className="block max-h-42 min-h-12 flex-1 resize-none rounded-3xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-cielo-600 focus:ring-4 focus:ring-cielo-500/15"
              />
              <button
                type="submit"
                disabled={!texto.trim()}
                aria-label="Enviar"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-cielo-800 text-white shadow-sm shadow-cielo-900/20 transition hover:bg-cielo-700 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              >
                <SendHorizontal className="size-5" aria-hidden />
              </button>
            </div>
          </form>
        ) : (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-700 ring-1 ring-stone-200">
            {perfil?.es_admin
              ? `La cuenta de ${nombre || 'esta persona'} está desactivada, así que ya no le puedes escribir.`
              : `${nombre || 'Esta persona'} ya no es coordinador, así que ya no le puedes escribir.`}{' '}
            {!perfil?.es_admin && (
              <Link to="/mensajes" className="font-medium text-cielo-700 underline underline-offset-2">
                Escríbele a otro coordinador
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

function Volver() {
  return (
    <Link
      to="/mensajes"
      aria-label="Volver a Mensajes"
      className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-cielo-700 hover:bg-cielo-50"
    >
      <ArrowLeft className="size-6" aria-hidden />
    </Link>
  )
}
