'use client'

import { Download } from 'lucide-react'
import type { SaldoMP } from '@/features/kardex/types'

interface Props {
  saldos: SaldoMP[]
}

export function SaldosMP({ saldos }: Props) {
  const handleExportCSV = () => {
    const headers = ['Código', 'Material', 'Bodega', 'Unidad', 'Saldo', 'Costo Promedio', 'Valor Total']
    const rows = saldos.map(s => [
      s.codigo,
      s.nombre,
      s.bodega_nombre,
      s.unidad,
      s.saldo.toFixed(2),
      (s.costo_promedio ?? 0).toFixed(2),
      (s.valor_total ?? 0).toFixed(2),
    ])

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `saldos-mp-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (saldos.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin saldos de materias primas</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con botón exportar */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-800 shadow-lg shadow-slate-200"
        >
          <Download className="w-4 h-4" />
          Exportar Inventario (CSV)
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Codificación</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Insumo / Material</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ubicación Bodega</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">U.M.</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Existencias</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CPP (Cost)</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Valorización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {saldos.map(s => (
                <tr key={`${s.material_id}-${s.bodega_id}`} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-xs font-black text-slate-900 group-hover:text-primary-600 transition-colors tracking-tight">{s.codigo}</p>
                  </td>
                  <td className="px-6 py-4 min-w-[200px]">
                    <p className="text-xs font-bold text-slate-700 leading-tight">{s.nombre}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-tighter border border-slate-100">
                      {s.bodega_nombre}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{s.unidad}</p>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <p className="text-xs font-black text-slate-900">{s.saldo.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <p className="text-xs font-bold text-slate-500">${(s.costo_promedio ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</p>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <p className="text-xs font-black text-slate-900">${(s.valor_total ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
