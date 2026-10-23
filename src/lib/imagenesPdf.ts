import { PDFDocument } from 'pdf-lib'

// Convierte cualquier imagen que el navegador sepa abrir en JPEG, reducida a un tamaño razonable.
async function aJpeg(archivo: File, ladoMaximo = 2000) {
  const imagen = await createImageBitmap(archivo)
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(imagen.width * escala)
  canvas.height = Math.round(imagen.height * escala)
  canvas.getContext('2d')!.drawImage(imagen, 0, 0, canvas.width, canvas.height)
  imagen.close()
  const blob = await new Promise<Blob>((resolver, rechazar) =>
    canvas.toBlob((b) => (b ? resolver(b) : rechazar(new Error(`No se pudo leer la imagen ${archivo.name}.`))), 'image/jpeg', 0.85),
  )
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ancho: canvas.width, alto: canvas.height }
}

// Une varias imágenes (fotos de páginas) en un solo PDF, una imagen por página.
export async function unirImagenes(archivos: File[]) {
  const pdf = await PDFDocument.create()
  for (const archivo of archivos) {
    const { bytes, ancho, alto } = await aJpeg(archivo)
    const imagen = await pdf.embedJpg(bytes)
    // Ancho de una hoja carta (612 puntos); el alto sigue la proporción de la foto.
    const anchoPagina = 612
    const altoPagina = (alto / ancho) * anchoPagina
    pdf.addPage([anchoPagina, altoPagina]).drawImage(imagen, { x: 0, y: 0, width: anchoPagina, height: altoPagina })
  }
  return pdf.save()
}
