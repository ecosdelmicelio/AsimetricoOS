import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export interface LabelData {
  codigo: string
  nombre: string
  bodegaNombre?: string
}

export async function generatePositionLabelPDF(data: LabelData | LabelData[]): Promise<void> {
  const items = Array.isArray(data) ? data : [data]
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [50, 50] // Tamaño estándar de etiqueta 5x5cm
  })

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (i > 0) doc.addPage([50, 50])

    const qrDataUrl = await QRCode.toDataURL(item.codigo, {
      margin: 1,
      width: 150
    })

    // QR Code (centrado en la parte superior)
    doc.addImage(qrDataUrl, 'PNG', 5, 2, 40, 40)

    // Texto descriptivo (parte inferior)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const textWidth = doc.getTextWidth(item.nombre)
    const xPos = (50 - textWidth) / 2
    doc.text(item.nombre, xPos, 43)

    // Código en texto pequeño
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    const codeWidth = doc.getTextWidth(item.codigo)
    const xCodePos = (50 - codeWidth) / 2
    doc.text(item.codigo, xCodePos, 47)
  }

  const fileName = items.length === 1 
    ? `etiqueta_${items[0].codigo.toLowerCase()}.pdf`
    : `etiquetas_posiciones_${new Date().toISOString().split('T')[0]}.pdf`

  doc.save(fileName)
}
