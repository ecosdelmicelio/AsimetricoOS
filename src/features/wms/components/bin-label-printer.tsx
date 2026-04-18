'use client'

import React, { useRef } from 'react'
import { Printer } from 'lucide-react'

interface BinLabelPrinterProps {
  bin: {
    codigo: string
    bodega: string
    zona: string
    fecha?: string
  }
  items: Array<{
    referencia: string
    talla: string
    cantidad: number
  }>
  triggerClassName?: string
}

export function BinLabelPrinter({ bin, items, triggerClassName }: BinLabelPrinterProps) {
  const printRef = useRef<HTMLDivElement>(null)

  // Agrupar items matricialmente: Ref -> Talla -> Cantidad
  const groupedMatrix = items.reduce((acc: any, item) => {
    if (!acc[item.referencia]) acc[item.referencia] = {}
    acc[item.referencia][item.talla] = (acc[item.referencia][item.talla] || 0) + item.cantidad
    return acc
  }, {})

  const handlePrint = () => {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    
    // Crear una ventana temporal para imprimir, configurada paramétricamente para 10x5cm
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page {
              size: 100mm 50mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Helvetica', 'Arial', sans-serif;
              color: black;
              background: white;
              width: 100mm;
              height: 50mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: center;
              overflow: hidden;
            }
            .label-container {
              padding: 4mm;
              display: flex;
              gap: 4mm;
              width: 100%;
              height: 100%;
              box-sizing: border-box;
            }
            .left-col {
              flex: 1;
              display: flex;
              flex-col;
              gap: 2mm;
            }
            .right-col {
              width: 35mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .title { font-size: 16px; font-weight: 900; letter-spacing: -0.5px; margin:0; line-height: 1.1; }
            .subtitle { font-size: 10px; color: #333; margin:0; margin-bottom: 2mm; text-transform: uppercase; }
            
            .matrix-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 1mm;
              font-size: 8px;
            }
            .matrix-table th, .matrix-table td {
              border: 1px solid #000;
              padding: 1mm;
              text-align: center;
            }
            .matrix-table th { background-color: #000; color: #FFF; font-weight: bold; }
            .matrix-td-ref { font-weight: bold; text-align: left !important; }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = () => {
              window.print()
              window.setTimeout(() => { window.close() }, 500)
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const deepLink = `https://os.asimetrico.io/wms/scan?bin=${bin.codigo}`

  return (
    <>
      <button 
        onClick={handlePrint}
        className={`flex items-center gap-2 ${triggerClassName || 'px-3 py-1.5 bg-slate-800 text-white font-bold text-[10px] rounded-lg tracking-widest uppercase hover:bg-slate-700'}`}
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>

      {/* Contenido Oculto para Print */}
      <div className="hidden">
        <div ref={printRef} className="label-container">
          <div className="left-col">
            <div>
              <h1 className="title">{bin.codigo}</h1>
              <p className="subtitle">{bin.bodega} • {bin.zona} • {bin.fecha || new Date().toISOString().split('T')[0]}</p>
            </div>
            
            <table className="matrix-table">
              <tbody>
                {Object.entries(groupedMatrix).slice(0, 4).map(([ref, tallas]: any) => (
                  <tr key={ref}>
                    <td className="matrix-td-ref">{ref.substring(0, 10)}</td>
                    {Object.entries(tallas).map(([talla, qty]) => (
                      <React.Fragment key={talla}>
                        <td>{talla}</td>
                        <th>{String(qty)}</th>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="right-col">
             <div style={{ padding: '2mm', background: 'white', border: '2px solid black', borderRadius: '4px' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(deepLink)}`} style={{ width: '100%', height: '100%', display: 'block' }} alt="QR" />
             </div>
          </div>
        </div>
      </div>
    </>
  )
}
