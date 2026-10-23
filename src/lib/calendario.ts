import { aFechaISO } from './fechas'
import type { Evento } from './tipos'

const HORA = 60 * 60 * 1000

// 2026-10-24T02:30:00.000Z → 20261024T023000Z (formato de los calendarios).
const enUtc = (fecha: Date) => fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const dia = (fecha: Date) => aFechaISO(fecha).replace(/-/g, '')

function rango(evento: Evento) {
  if (evento.todo_el_dia) {
    // En los calendarios, el último día de un evento de todo el día no se incluye: se pone el siguiente.
    const ultimo = new Date(evento.fin ?? evento.inicio)
    ultimo.setDate(ultimo.getDate() + 1)
    return { inicio: dia(new Date(evento.inicio)), fin: dia(ultimo), todoElDia: true }
  }
  const inicio = new Date(evento.inicio)
  const fin = evento.fin ? new Date(evento.fin) : new Date(inicio.getTime() + HORA)
  return { inicio: enUtc(inicio), fin: enUtc(fin), todoElDia: false }
}

export function enlaceGoogle(evento: Evento) {
  const { inicio, fin } = rango(evento)
  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: evento.titulo,
    dates: `${inicio}/${fin}`,
    details: evento.descripcion ?? '',
    location: evento.lugar ?? '',
  })
  return `https://calendar.google.com/calendar/render?${parametros}`
}

const escapar = (texto: string) =>
  texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Archivo .ics: al abrirlo, el iPhone (y casi cualquier app de calendario) ofrece agregar el evento.
export function descargarIcs(evento: Evento) {
  const { inicio, fin, todoElDia } = rango(evento)
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Santa Maria//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:evento-${evento.id}@santa-maria`,
    `DTSTAMP:${enUtc(new Date())}`,
    todoElDia ? `DTSTART;VALUE=DATE:${inicio}` : `DTSTART:${inicio}`,
    todoElDia ? `DTEND;VALUE=DATE:${fin}` : `DTEND:${fin}`,
    `SUMMARY:${escapar(evento.titulo)}`,
    evento.lugar ? `LOCATION:${escapar(evento.lugar)}` : null,
    evento.descripcion ? `DESCRIPTION:${escapar(evento.descripcion)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  const blob = new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(blob)
  enlace.download = `${evento.titulo.replace(/[^\p{L}\p{N} ]/gu, '').trim() || 'evento'}.ics`
  enlace.click()
  window.setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
}
