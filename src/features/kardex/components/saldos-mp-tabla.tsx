'use client'

import { Download } from 'lucide-react'
import type { SaldoMP } from '../services/kardex-actions'

interface Props {
  saldos: SaldoMP[]
}

export function SaldosMPTabla({ saldos }: Props) {
  const handleExportCSV = () => {
    const headers = ['Código', 'Material', 'Bodega', 'Unidad', 'Saldo', 'CPP', 'Valor Total']
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
      {/* Botón exportar */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-800 shadow-lg shadow-slate-200"
        >
          <Download className="w-4 h-4" />
          Descargar Consolidado (CSV)
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Código</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Material / Insumo</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ubicación</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Unidad</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Saldo Real</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Costo Prom (CPP)</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap pl-6">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {saldos.map(s => (
                <tr key={`${s.material_id}-${s.bodega_id}`} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-xs font-black text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tighter">{s.codigo}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-700 leading-tight">{s.nombre}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-xs font-bold text-slate-400 uppercase">{s.bodega_nombre}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{s.unidad}</span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <p className="text-xs font-black text-slate-900">{s.saldo.toLocaleString('es-CO', { maximumFractionDigits: 2 })} <span className="text-[10px] font-bold text-slate-300 ml-0.5 uppercase">{s.unidad}</span></p>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <p className="text-xs font-bold text-slate-400">${(s.costo_promedio ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap pl-6">
                    <p className="text-xs font-black text-slate-900">${(s.valor_total ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
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
