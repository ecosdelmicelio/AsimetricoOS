'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'

interface Props {
  ingresos: number
  egresos: number
  balance: number
}

export function FinanceSummaryCards({ ingresos, egresos, balance }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Ingresos Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos Acumulados</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(ingresos)}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
            <span>Fluidez de Caja</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Egresos Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Egresos Acumulados</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(egresos)}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 w-fit px-2 py-0.5 rounded-full">
            <span>Obligaciones</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-primary-900 rounded-3xl p-6 border border-primary-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-800/50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-950">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-black text-primary-300 uppercase tracking-widest mb-1">Balance Neto</p>
            <h3 className="text-3xl font-black text-white tracking-tighter">{formatCurrency(balance)}</h3>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 text-[10px] font-black w-fit px-2 py-0.5 rounded-full uppercase",
            balance >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
          )}>
            <span>{balance >= 0 ? 'Excedente' : 'Déficit'} Operativo</span>
          </div>
        </div>
      </div>
    </div>
  )
}
