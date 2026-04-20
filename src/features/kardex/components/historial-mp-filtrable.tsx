'use client'

import { useState } from 'react'
import { Download, Calendar, BarChart3, ChevronDown } from 'lucide-react'
import { formatDate } from '@/shared/lib/utils'
import type { HistorialMP } from '../services/kardex-actions'

interface Props {
  historial: HistorialMP[]
  materiales: Array<{ id: string; codigo: string; nombre: string }>
  bodegas: Array<{ id: string; nombre: string }>
  tiposMovimiento: Array<{ id: string; nombre: string }>
}

export function HistorialMPFiltrable({
  historial,
  materiales,
  bodegas,
  tiposMovimiento,
}: Props) {
  const [filtros, setFiltros] = useState({
    materialesSeleccionados: new Set<string>(),
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
      filtros.materialesSeleccionados.size > 0 &&
      !filtros.materialesSeleccionados.has(h.material_id)
    ) {
      return false
    }
    if (filtros.bodegaId && h.bodega_id !== filtros.bodegaId) return false
    if (filtros.busqueda) {
      const search = filtros.busqueda.toLowerCase()
      if (
        !h.codigo.toLowerCase().includes(search) &&
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
      'Código',
      'Material',
      'Bodega',
      'Tipo Movimiento',
      'Cantidad',
      'Unidad',
      'Costo Unitario',
      'Costo Total',
      'Usuario',
    ]
    const rows = historialFiltrado.map(h => [
      formatDate(h.fecha_movimiento),
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

  const toggleMaterial = (materialId: string) => {
    setFiltros(prev => {
      const next = new Set(prev.materialesSeleccionados)
      if (next.has(materialId)) {
        next.delete(materialId)
      } else {
        next.add(materialId)
      }
      return { ...prev, materialesSeleccionados: next }
    })
  }

  const clearFiltros = () => {
    setFiltros({
      materialesSeleccionados: new Set(),
      bodegaId: '',
      tipoMovimientoId: '',
      busqueda: '',
      fechaInicio: getDefaultFechaInicio(),
      fechaFin: new Date().toISOString().split('T')[0],
    })
  }

  return (
    <div className="space-y-6">
      {/* Panel de filtros */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                <BarChart3 className="w-4 h-4 text-slate-400" />
             </div>
             <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                Parámetros de Búsqueda ({Object.keys(filtros).filter(k => {
                  const v = filtros[k as keyof typeof filtros]
                  if (k === 'materialesSeleccionados') return (v as Set<string>).size > 0
                  return v && v !== '' && v !== getDefaultFechaInicio() && v !== new Date().toISOString().split('T')[0]
                }).length})
             </p>
          </div>
          <span className={`transition-transform duration-300 ${mostrarFiltros ? 'rotate-180' : ''}`}>
             <ChevronDown className="w-5 h-5 text-slate-400" />
          </span>
        </button>

        {mostrarFiltros && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Búsqueda por código/nombre */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referencia / Insumo</label>
              <input
                type="text"
                placeholder="Ej: TEL-001..."
                value={filtros.busqueda}
                onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
                className="w-full rounded-2xl bg-slate-50 border-none px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Bodega */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ubicación (Bodega)</label>
              <select
                value={filtros.bodegaId}
                onChange={e => setFiltros({ ...filtros, bodegaId: e.target.value })}
                className="w-full rounded-2xl bg-slate-50 border-none px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none"
              >
                <option value="">Todas las bodegas</option>
                {bodegas.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>

            {/* Fecha Inicio */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={e => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                className="w-full rounded-2xl bg-slate-50 border-none px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>

            {/* Fecha Fin */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={e => setFiltros({ ...filtros, fechaFin: e.target.value })}
                className="w-full rounded-2xl bg-slate-50 border-none px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>

            {/* Botón limpiar filtros */}
            <div className="lg:col-span-4 flex justify-end gap-3 mt-4">
              <button
                onClick={clearFiltros}
                className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Resetear Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botón exportar */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-800 shadow-lg shadow-slate-200"
        >
          <Download className="w-4 h-4" />
          Descargar Reporte (CSV)
        </button>
      </div>

      {/* Tabla */}
      {historialFiltrado.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin movimientos en el período seleccionado</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Fecha / Registro</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Referencia</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Material</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Origen / Bodega</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tipo OPE</th>
                  <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Cantidad</th>
                  <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Costo Total</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historialFiltrado.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                        <span className="text-xs font-bold text-slate-500 tracking-tight">
                          {formatDate(h.fecha_movimiento)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-black text-slate-900 group-hover:text-primary-600 transition-colors">{h.codigo}</p>
                    </td>
                    <td className="px-6 py-4 min-w-[150px]">
                      <p className="text-xs font-bold text-slate-700 leading-tight">{h.nombre}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400">
                      {h.bodega_nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          h.cantidad > 0 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}
                      >
                        {h.tipo_movimiento}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className={`text-xs font-black ${h.cantidad > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {h.cantidad > 0 ? '+' : ''}{h.cantidad.toFixed(2)} <span className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">{h.unit_of_measure || h.unidad}</span>
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className="text-xs font-black text-slate-900">${(h.costo_total ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{h.usuario || 'Sistema'}</p>
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
