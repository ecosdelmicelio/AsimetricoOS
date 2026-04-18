'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import type { SaldoBin } from '../services/kardex-actions'

interface Props {
  saldos: SaldoBin[]
  bodegas: Array<{ id: string; nombre: string }>
}

export function SaldosPorBin({ saldos, bodegas }: Props) {
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState<string | null>(null)
  const [expandedBins, setExpandedBins] = useState<Set<string>>(new Set())

  const saldosFiltrados = bodegaSeleccionada
    ? saldos.filter(s => s.bodega_id === bodegaSeleccionada)
    : saldos

  // Agrupar por bin_id
  const saldosPorBin = saldosFiltrados.reduce((acc, saldo) => {
    const key = saldo.bin_id
    if (!acc[key]) {
      acc[key] = {
        bin_id: saldo.bin_id,
        bin_codigo: saldo.bin_codigo,
        bodega_id: saldo.bodega_id,
        bodega_nombre: saldo.bodega_nombre,
        items: [] as SaldoBin[],
      }
    }
    acc[key].items.push(saldo)
    return acc
  }, {} as Record<string, any>)

  const binsList = Object.values(saldosPorBin)

  const toggleBin = (binId: string) => {
    const newExpanded = new Set(expandedBins)
    if (newExpanded.has(binId)) {
      newExpanded.delete(binId)
    } else {
      newExpanded.add(binId)
    }
    setExpandedBins(newExpanded)
  }

  const downloadCSV = () => {
    let csv = 'Bin,Bodega,Producto,Referencia,Talla,Cantidad,Costo Promedio,Valor Total\n'

    binsList.forEach(bin => {
      const binTotalSaldo = bin.items.reduce((sum: number, item: SaldoBin) => sum + item.saldo, 0)
      const binTotalValor = bin.items.reduce((sum: number, item: SaldoBin) => sum + (item.valor_total || 0), 0)

      csv += `"${bin.bin_codigo}","${bin.bodega_nombre}","","","",${binTotalSaldo},,"${binTotalValor.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}"\n`

      bin.items.forEach((item: SaldoBin) => {
        csv += `,"${item.bodega_nombre}","${item.nombre}","${item.referencia}","${item.talla || ''}",${item.saldo},"${(item.costo_promedio || 0).toLocaleString('es-CO', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}","${(item.valor_total || 0).toLocaleString('es-CO', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}"\n`
      })
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `saldos-por-bin-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      {/* Filtro por bodega */}
      <div className="flex items-center gap-3">
        <label className="text-body-sm font-medium text-muted-foreground">Bodega:</label>
        <select
          value={bodegaSeleccionada || ''}
          onChange={e => setBodegaSeleccionada(e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-black/10 bg-white text-body-sm"
        >
          <option value="">Todas las bodegas</option>
          {bodegas.map(bodega => (
            <option key={bodega.id} value={bodega.id}>
              {bodega.nombre}
            </option>
          ))}
        </select>
        <button
          onClick={downloadCSV}
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white text-body-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar CSV
        </button>
      </div>

      {binsList.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay saldos en inventario para mostrar
        </div>
      ) : (
        <div className="rounded-xl border border-black/10 overflow-hidden">
          {binsList.map(bin => {
            const isExpanded = expandedBins.has(bin.bin_id)
            const binTotalSaldo = bin.items.reduce((sum: number, item: SaldoBin) => sum + item.saldo, 0)
            const binTotalValor = bin.items.reduce((sum: number, item: SaldoBin) => sum + (item.valor_total || 0), 0)

            return (
              <div key={bin.bin_id} className="border-b border-black/10 last:border-b-0">
                {/* Encabezado bin */}
                <button
                  onClick={() => toggleBin(bin.bin_id)}
                  className="w-full px-4 py-3 bg-neu-50 hover:bg-neu-100 transition-colors flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-base ${isExpanded ? 'rotate-90' : ''} transition-transform duration-200`}>
                      ▶
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-foreground">{bin.bin_codigo}</p>
                      <p className="text-xs text-muted-foreground">{bin.bodega_nombre}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-body-sm font-semibold text-foreground">{binTotalSaldo} unidades</p>
                    <p className="text-xs text-muted-foreground">
                      ${(binTotalValor || 0).toLocaleString('es-CO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </button>

                {/* Contenido expandido */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-white">
                    <table className="w-full text-body-xs">
                      <thead>
                        <tr className="border-b border-black/10">
                          <th className="text-left py-2 font-semibold text-muted-foreground">Producto</th>
                          <th className="text-left py-2 font-semibold text-muted-foreground">Ref</th>
                          <th className="text-left py-2 font-semibold text-muted-foreground">Talla</th>
                          <th className="text-right py-2 font-semibold text-muted-foreground">Cantidad</th>
                          <th className="text-right py-2 font-semibold text-muted-foreground">Costo Prom</th>
                          <th className="text-right py-2 font-semibold text-muted-foreground">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bin.items.map((item: SaldoBin, idx: number) => (
                          <tr key={idx} className="border-b border-black/5">
                            <td className="py-2">{item.nombre}</td>
                            <td className="py-2 font-mono text-muted-foreground">{item.referencia}</td>
                            <td className="py-2">{item.talla || '—'}</td>
                            <td className="text-right py-2">{item.saldo}</td>
                            <td className="text-right py-2">
                              ${(item.costo_promedio || 0).toLocaleString('es-CO', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="text-right py-2 font-semibold">
                              ${(item.valor_total || 0).toLocaleString('es-CO', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
