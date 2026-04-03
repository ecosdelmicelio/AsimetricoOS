'use client'

import { useState } from 'react'
import { Download, Calendar } from 'lucide-react'
import { formatDate } from '@/shared/lib/utils'
import type { HistorialPT } from '@/features/kardex/types'

interface Props {
  historial: HistorialPT[]
  productos: Array<{ id: string; referencia: string; nombre: string }>
  bodegas: Array<{ id: string; nombre: string }>
  tiposMovimiento: Array<{ id: string; nombre: string }>
}

export function HistorialPT({ historial, productos, bodegas, tiposMovimiento }: Props) {
  const [filtros, setFiltros] = useState({
    producto_id: '',
    bodega_id: '',
    tipo_movimiento: '',
  })

  // Aplicar filtros
  const historialFiltrado = historial.filter(h => {
    if (filtros.producto_id && h.producto_id !== filtros.producto_id) return false
    if (filtros.bodega_id && h.bodega_id !== filtros.bodega_id) return false
    if (filtros.tipo_movimiento && h.tipo_movimiento !== filtros.tipo_movimiento) return false
    return true
  })

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Referencia', 'Producto', 'Bodega', 'Tipo Movimiento', 'Cantidad', 'Costo Unitario', 'Costo Total', 'Usuario']
    const rows = historialFiltrado.map(h => [
      new Date(h.fecha_movimiento).toLocaleString(),
      h.referencia,
      h.nombre,
      h.bodega_nombre,
      h.tipo_movimiento,
      h.cantidad.toFixed(0),
      (h.costo_unitario ?? 0).toFixed(2),
      (h.costo_total ?? 0).toFixed(2),
      h.usuario ?? 'Sistema',
    ])

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historial-pt-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Filtros</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Referencia/Producto */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Referencia/Producto</label>
            <select
              value={filtros.producto_id}
              onChange={e => setFiltros({ ...filtros, producto_id: e.target.value })}
              className="w-full rounded-lg bg-neu-base shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Todos</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.referencia} - {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Bodega */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Bodega</label>
            <select
              value={filtros.bodega_id}
              onChange={e => setFiltros({ ...filtros, bodega_id: e.target.value })}
              className="w-full rounded-lg bg-neu-base shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Todas</option>
              {bodegas.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo Movimiento */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Tipo Movimiento</label>
            <select
              value={filtros.tipo_movimiento}
              onChange={e => setFiltros({ ...filtros, tipo_movimiento: e.target.value })}
              className="w-full rounded-lg bg-neu-base shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Todos</option>
              {tiposMovimiento.map(t => (
                <option key={t.id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
      {historialFiltrado.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
          <p className="text-body-sm text-muted-foreground">Sin movimientos en los últimos 30 días</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Referencia</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Bodega</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo Movimiento</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cantidad</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Costo Unitario</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Costo Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {historialFiltrado.map(h => (
                  <tr key={h.id} className="hover:bg-black/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{formatDate(h.fecha_movimiento)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body-sm font-mono font-medium text-foreground">{h.referencia}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body-sm text-foreground">{h.nombre}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body-sm text-foreground">{h.bodega_nombre}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        h.cantidad > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {h.tipo_movimiento}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className={`text-body-sm font-medium ${h.cantidad > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {h.cantidad.toFixed(0)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-body-sm text-foreground">${(h.costo_unitario ?? 0).toFixed(2)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-body-sm font-medium text-foreground">${(h.costo_total ?? 0).toFixed(2)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{h.usuario ?? 'Sistema'}</p>
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
