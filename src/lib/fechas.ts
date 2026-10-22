const IDIOMA = 'es-MX'

const dos = (n: number) => String(n).padStart(2, '0')

// AAAA-MM-DD en hora local (toISOString usaría la hora de Greenwich).
export function aFechaISO(fecha: Date) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

// «2026-10-19» → fecha local a medianoche (new Date('2026-10-19') la tomaría en hora de Greenwich).
export function deFechaISO(valor: string) {
  return new Date(`${valor}T00:00`)
}

export function lunesDe(fecha = new Date()) {
  const lunes = new Date(fecha)
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  return aFechaISO(lunes)
}

export function inicioDeHoy() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return hoy.toISOString()
}

// Valor para <input type="date"> o <input type="datetime-local"> a partir de una fecha guardada.
export function aValorDeCampo(iso: string, conHora: boolean) {
  const fecha = new Date(iso)
  const dia = aFechaISO(fecha)
  return conHora ? `${dia}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}` : dia
}

export function deValorDeCampo(valor: string) {
  return new Date(valor.includes('T') ? valor : `${valor}T00:00`).toISOString()
}

const formatoDiaLargo = new Intl.DateTimeFormat(IDIOMA, { weekday: 'long', day: 'numeric', month: 'long' })
const formatoDiaCorto = new Intl.DateTimeFormat(IDIOMA, { day: 'numeric', month: 'short', year: 'numeric' })
const formatoHora = new Intl.DateTimeFormat(IDIOMA, { hour: 'numeric', minute: '2-digit' })
const formatoMes = new Intl.DateTimeFormat(IDIOMA, { month: 'long', year: 'numeric' })
const formatoDiaSemana = new Intl.DateTimeFormat(IDIOMA, { weekday: 'short' })

export const diaLargo = (iso: string) => formatoDiaLargo.format(new Date(iso))
export const diaCorto = (iso: string) => formatoDiaCorto.format(new Date(iso))
export const hora = (iso: string) => formatoHora.format(new Date(iso))
export const mes = (iso: string) => formatoMes.format(new Date(iso))
export const diaSemana = (iso: string) => formatoDiaSemana.format(new Date(iso))
export const semanaDel = (semana: string) => `Semana del ${formatoDiaLargo.format(deFechaISO(semana))}`
