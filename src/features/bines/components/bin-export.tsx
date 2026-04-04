'use client'

import { useRef } from 'react'
import { Download } from 'lucide-react'
import { formatDate } from '@/shared/lib/utils'
import type { BinContenido } from '../types'

interface Props {
  bin: BinContenido
  formato?: 'png' | 'pdf'
}

export function BinExport({ bin, formato = 'png' }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)

  const handleExport = async () => {
    if (!contentRef.current) return
    if (formato === 'png') {
      await exportarPNG()
    } else {
      await exportarPDF()
    }
  }

  const exportarPNG = async () => {
    try {
      const { default: html2canvas } = await import('html2canvas')
      if (!contentRef.current) return
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${bin.codigo}.png`
      link.click()
    } catch (error) {
      console.error('Error exportando PNG:', error)
    }
  }

  const exportarPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      if (!contentRef.current) return
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4',
      })
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth - 20, imgHeight - 20)
      pdf.save(`${bin.codigo}.pdf`)
    } catch (error) {
      console.error('Error exportando PDF:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={contentRef}
        className="bg-white p-8 rounded-lg border-2 border-black"
        style={{ width: '600px', maxWidth: '100%' }}
      >
        <div className="text-center mb-8 pb-4 border-b-2 border-black">
          <div className="text-sm font-bold mb-2">BIN / CAJA</div>
          <div className="text-3xl font-mono font-bold">{bin.codigo}</div>
          <div className="text-xs text-gray-600 mt-2">
            {bin.bodega_nombre && <div>Bodega: {bin.bodega_nombre}</div>}
            <div>Fecha: {formatDate(bin.created_at)}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase mb-3">Contenido</h3>
          {bin.items.length === 0 ? (
            <div className="text-xs text-gray-500 italic">Bin vacío</div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border border-black p-2 text-left font-bold">Referencia</th>
                  <th className="border border-black p-2 text-left font-bold">Color</th>
                  <th className="border border-black p-2 text-left font-bold">Talla</th>
                  <th className="border border-black p-2 text-right font-bold">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {bin.items.map((item) => (
                  <tr key={item.recepcion_id}>
                    <td className="border border-black p-2">{item.referencia}</td>
                    <td className="border border-black p-2">{item.color || '—'}</td>
                    <td className="border border-black p-2">{item.talla || '—'}</td>
                    <td className="border border-black p-2 text-right font-mono font-bold">
                      {item.cantidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pt-4 border-t-2 border-black">
          <div className="text-xs font-mono text-center">
            {bin.codigo}
          </div>
          <div className="text-xs text-center text-gray-500 mt-1">
            Asimetrico - Sistema de Inventario
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <button
          onClick={exportarPNG}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold text-body-sm transition-all hover:bg-primary-700 active:shadow-neu-inset"
        >
          <Download className="w-4 h-4" />
          Descargar PNG
        </button>
        <button
          onClick={exportarPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold text-body-sm transition-all hover:bg-primary-700 active:shadow-neu-inset"
        >
          <Download className="w-4 h-4" />
          Descargar PDF
        </button>
      </div>
    </div>
  )
}
