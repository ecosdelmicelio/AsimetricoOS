'use client'

import React, { useState } from 'react'
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  DollarSign
} from 'lucide-react'
import type { CarteraItem } from '../types'
import { formatCurrency } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'

interface Props {
  data: CarteraItem[]
  onRegistrarPago: (item: CarteraItem) => void
}

export function CarteraPanel({ data, onRegistrarPago }: Props) {
  const [filter, setFilter] = useState('')

  const filtered = data.filter(item => 
    item.codigo.toLowerCase().includes(filter.toLowerCase()) ||
    item.tercero_nombre.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header & Filter */}
      <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Cartera y Obligaciones</h2>
          <p className="text-xs text-slate-500 font-medium">Gestiona cuentas por cobrar y por pagar en un solo lugar</p>
        </div>

        <div className="relative group max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por código o tercero..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:border-primary-200 focus:ring-4 focus:ring-primary-50 transition-all font-medium"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tercero</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Pagado</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((item) => {
              const isIngreso = item.tipo === 'ingreso'
              const vDate = item.fecha_vencimiento ? new Date(item.fecha_vencimiento) : null
              const isVencido = vDate && vDate < new Date() && item.saldo_pendiente > 0

              return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        isIngreso ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {isIngreso ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 leading-none mb-1">{item.codigo}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isIngreso ? 'Cuenta por Cobrar' : 'Cuenta por Pagar'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600 truncate max-w-[200px] block">
                      {item.tercero_nombre}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(item.total_facturado)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-emerald-600">{formatCurrency(item.total_pagado)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-sm font-black",
                      isIngreso ? "text-primary-600" : "text-slate-900"
                    )}>
                      {formatCurrency(item.saldo_pendiente)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                   <div className="flex justify-center">
                    <StatusBadge status={item.estado_pago} />
                   </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className={cn("w-3.5 h-3.5", isVencido ? "text-rose-500" : "text-slate-400")} />
                      <span className={cn(
                        "text-xs font-bold",
                        isVencido ? "text-rose-600" : "text-slate-600"
                      )}>
                        {item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString('es-CO') : 'Sin fecha'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onRegistrarPago(item)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-1.5 ml-auto"
                    >
                      <DollarSign className="w-3 h-3" /> Registrar Pago
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">No se encontraron movimientos pendientes</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; icon: any; color: string }> = {
    pendiente: { label: 'Pendiente', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    parcial: { label: 'Pago Parcial', icon: MoreVertical, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    pagada: { label: 'Pagada', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  }

  const { label, icon: Icon, color } = configs[status] || { label: status, icon: AlertCircle, color: 'bg-slate-50 text-slate-600 border-slate-100' }

  return (
    <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider", color)}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </div>
  )
}
