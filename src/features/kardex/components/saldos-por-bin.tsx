'use client'

import { useState } from 'react'
import { Download, ChevronDown, Package } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Controles de Filtrado */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4 group">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-primary-50 transition-colors">
               <Package className="w-4 h-4 text-slate-400 group-hover:text-primary-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Filtrar Existencias</p>
              <div className="relative">
                <select
                  value={bodegaSeleccionada || ''}
                  onChange={e => setBodegaSeleccionada(e.target.value || null)}
                  className="appearance-none bg-transparent font-black text-sm text-slate-900 pr-8 outline-none cursor-pointer"
                >
                  <option value="">Todas las bodegas</option>
                  {bodegas.map(bodega => (
                    <option key={bodega.id} value={bodega.id}>{bodega.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-800 shadow-lg shadow-slate-200"
          >
            <Download className="w-4 h-4" />
            Reporte por Ubicación (CSV)
          </button>
        </div>
      </div>

      {binsList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay existencias configuradas en ubicaciones</p>
        </div>
      ) : (
        <div className="space-y-4">
          {binsList.map(bin => {
            const isExpanded = expandedBins.has(bin.bin_id)
            const binTotalSaldo = bin.items.reduce((sum: number, item: SaldoBin) => sum + item.saldo, 0)
            const binTotalValor = bin.items.reduce((sum: number, item: SaldoBin) => sum + (item.valor_total || 0), 0)

            return (
              <div key={bin.bin_id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:border-slate-300">
                {/* Header Bin */}
                <button
                  onClick={() => toggleBin(bin.bin_id)}
                  className="w-full px-6 py-5 flex items-center justify-between group transition-colors hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-1.5 rounded-lg bg-slate-50 border border-slate-100 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900 text-sm tracking-tight">{bin.bin_codigo}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bin.bodega_nombre}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 text-right">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Items</p>
                      <p className="text-sm font-black text-slate-900">{binTotalSaldo.toLocaleString()} <span className="text-[10px] text-slate-300">uts</span></p>
                    </div>
                    <div className="border-l border-slate-100 pl-8">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Valorización</p>
                       <p className="text-sm font-black text-slate-900">${(binTotalValor || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </button>

                {/* Contenido Detallado */}
                {isExpanded && (
                  <div className="px-6 pb-6 bg-slate-50/20 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="overflow-x-auto mt-6">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="text-left pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Referencia / Producto</th>
                            <th className="text-left pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Talla</th>
                            <th className="text-right pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo</th>
                            <th className="text-right pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Costo CPP</th>
                            <th className="text-right pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bin.items.map((item: SaldoBin, idx: number) => (
                            <tr key={idx} className="group/row">
                              <td className="py-3">
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tighter group-hover/row:text-primary-600 transition-colors">{item.referencia}</p>
                                <p className="text-[10px] font-bold text-slate-500 leading-tight">{item.nombre}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase bg-white border border-slate-100 px-2 py-0.5 rounded-md">{item.talla || 'N/A'}</span>
                              </td>
                              <td className="py-3 text-right">
                                <p className="text-[11px] font-black text-slate-900">{item.saldo} <span className="text-[9px] text-slate-300 font-bold uppercase">uts</span></p>
                              </td>
                              <td className="py-3 text-right px-4">
                                <p className="text-[11px] font-bold text-slate-400">${(item.costo_promedio || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                              </td>
                              <td className="py-3 text-right">
                                <p className="text-[11px] font-black text-slate-900">${(item.valor_total || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
