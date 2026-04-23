'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PackageSearch, Search, ArrowRight, TrendingUp } from 'lucide-react'
import type { SegundasTracking } from '@/features/calidad/services/calidad-actions'
import { formatDate } from '@/shared/lib/utils'

interface Props {
  segundas: SegundasTracking[]
}

export function SegundasDashboard({ segundas }: Props) {
  const [search, setSearch] = useState('')

  const filtered = segundas.filter(s => {
    const term = search.toLowerCase()
    return (
      (s.taller_nombre?.toLowerCase() || '').includes(term) ||
      (s.ov_codigo?.toLowerCase() || '').includes(term) ||
      (s.op_codigo?.toLowerCase() || '').includes(term) ||
      (s.producto_referencia?.toLowerCase() || '').includes(term) ||
      (s.producto_nombre?.toLowerCase() || '').includes(term)
    )
  })

  // Calcular métricas
  const totalSegundas = filtered.reduce((acc, s) => acc + s.cantidad, 0)
  const talleresAfectados = new Set(filtered.map(s => s.taller_nombre)).size

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[1.5rem] bg-white border border-slate-100 shadow-sm p-6 flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <PackageSearch className="w-3.5 h-3.5 text-amber-500" /> TOTAL EN SEGUNDAS
          </p>
          <p className="font-black text-slate-900 text-3xl leading-none mt-1">
            {totalSegundas} <span className="text-sm text-slate-400 font-bold">UDS</span>
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-white border border-slate-100 shadow-sm p-6 flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> TALLERES CON SALDOS
          </p>
          <p className="font-black text-slate-900 text-3xl leading-none mt-1">
            {talleresAfectados}
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-[2rem] bg-white border border-slate-100 shadow-xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por taller, OV, OP o producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha / Ref</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Taller / OP</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cantidad</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-sm font-bold text-slate-400">No hay prendas en segundas con estos filtros.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.kardex_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6 align-top">
                      <p className="text-xs font-black text-slate-900">{formatDate(s.fecha_movimiento)}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">MOV: {s.kardex_id.split('-')[0]}</p>
                    </td>
                    <td className="py-4 px-6 align-top">
                      <p className="text-xs font-black text-slate-900 uppercase">{s.taller_nombre ?? 'Sin Taller'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Link href={`/ordenes-produccion/${s.op_id}`} className="text-[10px] font-bold text-primary-600 hover:underline uppercase tracking-widest">
                          {s.op_codigo}
                        </Link>
                        {s.ov_codigo && (
                          <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            {s.ov_codigo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 align-top">
                      <p className="text-xs font-black text-slate-900">{s.producto_referencia}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">{s.producto_nombre}</p>
                    </td>
                    <td className="py-4 px-6 align-top text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-sm">
                        {s.cantidad} <span className="text-[10px] opacity-70">UDS</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 align-top text-center">
                      <Link
                        href={`/ordenes-produccion/${s.op_id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                      >
                        Gestionar
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
