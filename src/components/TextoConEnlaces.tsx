import { ExternalLink, MapPin } from 'lucide-react'

const ENLACE = /(?:https?:\/\/|www\.)[^\s<>]+/gi
// Signos que suelen ir pegados al final de un enlace pero no son parte de él («…mapa.», «(ver enlace)»).
const PUNTUACION_FINAL = /[.,;:!?)\]»"']+$/

const esMapa = (url: URL) =>
  url.hostname === 'maps.app.goo.gl' ||
  (url.hostname === 'goo.gl' && url.pathname.startsWith('/maps')) ||
  url.hostname.startsWith('maps.google.') ||
  (/(^|\.)google\.[a-z.]+$/.test(url.hostname) && url.pathname.startsWith('/maps'))

function Enlace({ texto, clase }: { texto: string; clase: string }) {
  let url: URL
  try {
    url = new URL(texto.startsWith('www.') ? `https://${texto}` : texto)
  } catch {
    return texto
  }
  const mapa = esMapa(url)
  const Icono = mapa ? MapPin : ExternalLink
  // Sin «https://»; si aun así no cabe en el renglón, se recorta con «…» en lugar de salirse.
  const visible = mapa ? 'Ver en el mapa' : texto.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  return (
    <a
      href={url.href}
      target="_blank"
      rel="noreferrer"
      title={mapa ? texto : undefined}
      className={`inline-flex max-w-full items-baseline gap-1 align-bottom font-medium underline underline-offset-2 ${clase}`}
    >
      <Icono className="size-3.5 shrink-0 self-center" aria-hidden />
      <span className="truncate">{visible}</span>
    </a>
  )
}

// Texto escrito en la app (avisos, eventos, respuestas…): respeta los saltos de línea, los enlaces se
// pueden tocar y nada se sale de la tarjeta aunque sea una palabra muy larga.
export function TextoConEnlaces({
  children,
  className = '',
  claseEnlace = 'text-cielo-700 decoration-cielo-300 hover:text-cielo-900',
}: {
  children: string
  className?: string
  claseEnlace?: string
}) {
  const partes: (string | { enlace: string })[] = []
  let desde = 0
  for (const encontrado of children.matchAll(ENLACE)) {
    const enlace = encontrado[0].replace(PUNTUACION_FINAL, '')
    partes.push(children.slice(desde, encontrado.index), { enlace })
    desde = encontrado.index + enlace.length
  }
  partes.push(children.slice(desde))

  return (
    <p className={`whitespace-pre-line wrap-break-word ${className}`}>
      {partes.map((parte, i) =>
        typeof parte === 'string' ? parte : <Enlace key={i} texto={parte.enlace} clase={claseEnlace} />,
      )}
    </p>
  )
}
