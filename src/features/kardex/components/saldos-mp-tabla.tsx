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
      <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
        <p className="text-body-sm text-muted-foreground">Sin saldos de materias primas</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Botón exportar */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all hover:shadow-neu-lg active:shadow-neu-inset"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  Código
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  Material
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  Bodega
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  Unidad
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  Saldo
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  CPP
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                  Valor Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {saldos.map(s => (
                <tr key={`${s.material_id}-${s.bodega_id}`} className="hover:bg-black/2 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-body-sm font-mono font-medium text-foreground">{s.codigo}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-body-sm text-foreground">{s.nombre}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-body-sm text-foreground">{s.bodega_nombre}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-body-sm text-muted-foreground">{s.unidad}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <p className="text-body-sm font-medium text-foreground">{s.saldo.toFixed(2)} {s.unidad}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <p className="text-body-sm font-medium text-foreground">${(s.costo_promedio ?? 0).toFixed(2)}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <p className="text-body-sm font-medium text-foreground">${(s.valor_total ?? 0).toFixed(2)}</p>
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
