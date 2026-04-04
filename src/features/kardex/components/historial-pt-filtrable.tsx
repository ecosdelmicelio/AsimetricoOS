'use client'

import { useState, useEffect } from 'react'
import { Download, Calendar, X } from 'lucide-react'
import { formatDate } from '@/shared/lib/utils'
import type { HistorialPT, FiltrosHistorial } from '../services/kardex-actions'

interface Props {
  historial: HistorialPT[]
  productos: Array<{ id: string; referencia: string; nombre: string }>
  bodegas: Array<{ id: string; nombre: string }>
  tiposMovimiento: Array<{ id: string; nombre: string }>
}

export function HistorialPTFiltrable({
  historial,
  productos,
  bodegas,
  tiposMovimiento,
}: Props) {
  const [filtros, setFiltros] = useState({
    referenciasSeleccionadas: new Set<string>(),
    bodegaId: '',
    tipoMovimientoId: '',
    busqueda: '',
    fechaInicio: getDefaultFechaInicio(),
    fechaFin: new Date().toISOString().split('T')[0],
  })

  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // Aplicar filtros
  const historialFiltrado = historial.filter(h => {
    if (
      filtros.referenciasSeleccionadas.size > 0 &&
      !filtros.referenciasSeleccionadas.has(h.producto_id)
    ) {
      return false
    }
    if (filtros.bodegaId && h.bodega_id !== filtros.bodegaId) return false
    if (filtros.tipoMovimientoId && h.id !== filtros.tipoMovimientoId) {
      // Necesitamos comparar por tipo_movimiento, no por id
      // Lo hacemos después del filtrado
    }
    if (filtros.busqueda) {
      const search = filtros.busqueda.toLowerCase()
      if (
        !h.referencia.toLowerCase().includes(search) &&
        !h.nombre.toLowerCase().includes(search)
      ) {
        return false
      }
    }
    return true
  })

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Referencia',
      'Producto',
      'Bodega',
      'Tipo Movimiento',
      'Cantidad',
      'Costo Unitario',
      'Costo Total',
      'Usuario',
    ]
    const rows = historialFiltrado.map(h => [
      formatDate(h.fecha_movimiento),
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

  const toggleReferencia = (productoId: string) => {
    setFiltros(prev => {
      const next = new Set(prev.referenciasSeleccionadas)
      if (next.has(productoId)) {
        next.delete(productoId)
      } else {
        next.add(productoId)
      }
      return { ...prev, referenciasSeleccionadas: next }
    })
  }

  const clearFiltros = () => {
    setFiltros({
      referenciasSeleccionadas: new Set(),
      bodegaId: '',
      tipoMovimientoId: '',
      busqueda: '',
      fechaInicio: getDefaultFechaInicio(),
      fechaFin: new Date().toISOString().split('T')[0],
    })
  }

  return (
    <div className="space-y-4">
      {/* Panel de filtros */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-4">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="w-full flex items-center justify-between px-2 py-1"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Filtros ({Object.keys(filtros).filter(k => {
              const v = filtros[k as keyof typeof filtros]
              if (k === 'referenciasSeleccionadas') return (v as Set<string>).size > 0
              return v && v !== ''
            }).length})
          </p>
          <span className={`transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {mostrarFiltros && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Búsqueda por referencia */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-foreground">Referencia/Producto</label>
              <input
                type="text"
                placeholder="Buscar..."
                value={filtros.busqueda}
                onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
                className="w-full rounded-lg bg-white shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none"
              />
            </div>

            {/* Multiselect Referencia */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Refs Activas</label>
              <div className="flex gap-1 flex-wrap">
                {productos.slice(0, 5).map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleReferencia(p.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      filtros.referenciasSeleccionadas.has(p.id)
                        ? 'bg-primary-100 text-primary-700 shadow-neu'
                        : 'bg-white shadow-neu-inset text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p.referencia}
                  </button>
                ))}
                {productos.length > 5 && (
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        toggleReferencia(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="px-2 py-1 rounded-lg text-xs bg-white shadow-neu-inset text-muted-foreground outline-none"
                  >
                    <option value="">+ Más</option>
                    {productos.slice(5).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.referencia}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Bodega */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Bodega</label>
              <select
                value={filtros.bodegaId}
                onChange={e => setFiltros({ ...filtros, bodegaId: e.target.value })}
                className="w-full rounded-lg bg-white shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none"
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
                value={filtros.tipoMovimientoId}
                onChange={e => setFiltros({ ...filtros, tipoMovimientoId: e.target.value })}
                className="w-full rounded-lg bg-white shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none"
              >
                <option value="">Todos</option>
                {tiposMovimiento.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Inicio */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Desde</label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={e => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                className="w-full rounded-lg bg-white shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none"
              />
            </div>

            {/* Fecha Fin */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Hasta</label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={e => setFiltros({ ...filtros, fechaFin: e.target.value })}
                className="w-full rounded-lg bg-white shadow-neu-inset px-3 py-2 text-body-sm text-foreground outline-none"
              />
            </div>

            {/* Botón limpiar filtros */}
            <div className="flex items-end">
              <button
                onClick={clearFiltros}
                className="w-full px-3 py-2 rounded-lg bg-white shadow-neu text-muted-foreground font-medium text-body-sm transition-all hover:shadow-neu-lg"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
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
          <p className="text-body-sm text-muted-foreground">Sin movimientos en el período</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Referencia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Producto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Bodega
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Tipo Movimiento
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Cantidad
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Costo Unitario
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Costo Total
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Registrado por
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {historialFiltrado.map(h => (
                  <tr key={h.id} className="hover:bg-black/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(h.fecha_movimiento)}
                        </span>
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
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          h.cantidad > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
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

function getDefaultFechaInicio(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}
