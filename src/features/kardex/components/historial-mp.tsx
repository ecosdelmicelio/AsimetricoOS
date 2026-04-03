'use client'

import { useState } from 'react'
import { Download, Calendar } from 'lucide-react'
import { formatDate } from '@/shared/lib/utils'
import type { HistorialMP } from '@/features/kardex/types'

interface Props {
  historial: HistorialMP[]
  materiales: Array<{ id: string; codigo: string; nombre: string }>
  bodegas: Array<{ id: string; nombre: string }>
  tiposMovimiento: Array<{ id: string; nombre: string }>
}

export function HistorialMP({ historial, materiales, bodegas, tiposMovimiento }: Props) {
  const [filtros, setFiltros] = useState({
    material_id: '',
    bodega_id: '',
    tipo_movimiento: '',
  })

  // Aplicar filtros
  const historialFiltrado = historial.filter(h => {
    if (filtros.material_id && h.material_id !== filtros.material_id) return false
    if (filtros.bodega_id && h.bodega_id !== filtros.bodega_id) return false
    if (filtros.tipo_movimiento && h.tipo_movimiento !== filtros.tipo_movimiento) return false
    return true
  })

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Código', 'Material', 'Bodega', 'Tipo Movimiento', 'Cantidad', 'Unidad', 'Costo Unitario', 'Costo Total', 'Usuario']
    const rows = historialFiltrado.map(h => [
      new Date(h.fecha_movimiento).toLocaleString(),
      h.codigo,
      h.nombre,
      h.bodega_nombre,
      h.tipo_movimiento,
      h.cantidad.toFixed(2),
      h.unidad,
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
    a.download = `historial-mp-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Filtros</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Código/Material */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Código/Material</label>
            <select
              value={filtros.material_id}
              onChange={e => setFiltros({ ...filtros, material_id: e.target.value })}
              className="w-full rounded-lg bg-neu-base shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Todos</option>
              {materiales.map(m => (
                <option key={m.id} value={m.id}>
                  {m.codigo} - {m.nombre}
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Material</th>
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
                      <p className="text-body-sm font-mono font-medium text-foreground">{h.codigo}</p>
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
                        {h.cantidad.toFixed(2)} {h.unidad}
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
