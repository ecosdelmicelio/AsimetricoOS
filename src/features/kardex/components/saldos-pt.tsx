'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import type { SaldoPT } from '@/features/kardex/types'

interface Props {
  saldos: SaldoPT[]
}

export function SaldosPT({ saldos }: Props) {
  const [bodegarSeleccionada, setBodegaSeleccionada] = useState<string>('')

  // Obtener bodegas únicas
  const bodegas = Array.from(new Set(saldos.map(s => s.bodega_id))).map(bid => {
    const bodega = saldos.find(s => s.bodega_id === bid)
    return { id: bid, nombre: bodega?.bodega_nombre || bid }
  })

  // Usar primera bodega por defecto
  const bodegaActual = bodegarSeleccionada || bodegas[0]?.id || ''
  const saldosBodega = saldos.filter(s => s.bodega_id === bodegaActual)

  // Agrupar por referencia
  const referenciasMap: Record<string, SaldoPT[]> = {}
  for (const s of saldosBodega) {
    if (!referenciasMap[s.producto_id]) {
      referenciasMap[s.producto_id] = []
    }
    referenciasMap[s.producto_id].push(s)
  }

  const referencias = Object.values(referenciasMap)

  const handleExportCSV = () => {
    const headers = ['Referencia', 'Producto', 'Bodega', 'Saldo', 'Costo Promedio', 'Valor Total']
    const rows = saldosBodega.map(s => [
      s.referencia,
      s.nombre,
      s.bodega_nombre,
      s.saldo.toFixed(0),
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
    a.download = `saldos-pt-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (saldos.length === 0) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
        <p className="text-body-sm text-muted-foreground">Sin saldos de productos terminados</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-foreground">Bodega:</label>
          <select
            value={bodegaActual}
            onChange={e => setBodegaSeleccionada(e.target.value)}
            className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none appearance-none"
          >
            {bodegas.map(b => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all hover:shadow-neu-lg active:shadow-neu-inset"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      {referencias.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
          <p className="text-body-sm text-muted-foreground">Sin productos en esta bodega</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Referencia</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Saldo</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">CPP</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {saldosBodega.map(s => (
                  <tr key={`${s.producto_id}`} className="hover:bg-black/2 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-body-sm font-mono font-medium text-foreground">{s.referencia}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-body-sm text-foreground">{s.nombre}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="text-body-sm font-medium text-foreground">{s.saldo.toFixed(0)} un.</p>
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
      )}
    </div>
  )
}
