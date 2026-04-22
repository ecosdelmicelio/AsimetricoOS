'use client'

import Link from 'next/link'
import { ChevronDown, Package, Factory } from 'lucide-react'
import { OVMiniStepper } from './ov-mini-stepper'
import { OVStatusBadge } from './ov-status-badge'
import { cn, formatCurrency } from '@/shared/lib/utils'

interface OP {
  id: string
  codigo: string
  estado: string
  unidades: number
}

interface Props {
  id: string
  codigo: string
  clienteNombre: string
  estado: string               // Real DB state
  displayStatus: string        // Smart-derived status
  totalUnidades: number
  totalValor: number
  valorDespachado: number      // New
  unidadesProducidas: number
  unidadesDespachadas: number
  daysSinceConfirm?: number
  fechaConfirmacion?: string
  ops: OP[]
}

// Progress bar colours by OP estado
const OP_STATE_COLOR: Record<string, string> = {
  borrador:      'bg-slate-300',
  confirmada:    'bg-blue-400',
  en_proceso:    'bg-amber-400',
  terminado:     'bg-emerald-500',
  completada:    'bg-emerald-600',
  entregada:     'bg-indigo-500',
  liquidada:     'bg-violet-500',
  cancelada:     'bg-red-400',
}

function pct(val: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((val / total) * 100))
}

function ProgressBar({ value, max, colorClass, label }: { value: number; max: number; colorClass: string; label: string }) {
  const p = pct(value, max)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', colorClass)} style={{ width: `${p}%` }} />
      </div>
      <span className="text-[8px] font-bold text-slate-500 w-12 text-right shrink-0">{value}/{max} · {p}%</span>
    </div>
  )
}

export function OVCard({
  id, codigo, clienteNombre, displayStatus,
  totalUnidades, totalValor, valorDespachado, unidadesProducidas, unidadesDespachadas,
  daysSinceConfirm, fechaConfirmacion, ops, estado,
}: Props) {
  const physicalPct = pct(unidadesDespachadas, totalUnidades)
  const economicPct = pct(valorDespachado, totalValor)
  return (
    <details className="group rounded-[40px] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-500 outline-none overflow-hidden">
      <summary className="flex flex-col px-5 py-4 cursor-pointer list-none outline-none [&::-webkit-details-marker]:hidden">
        {/* Header Line: Code + Status + Aging */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/ordenes-venta/${id}`}
              className="font-black text-[13px] text-slate-900 tracking-tighter hover:text-blue-600 transition-colors truncate"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {codigo}
            </Link>
            <div className={cn(
              'w-2 h-2 rounded-full shrink-0',
              displayStatus === 'entregada'      && 'bg-indigo-500',
              displayStatus === 'completada'     && 'bg-emerald-500',
              displayStatus === 'despachada'     && 'bg-blue-500',
              displayStatus === 'en_produccion'  && 'bg-amber-400',
              displayStatus === 'confirmada'     && 'bg-slate-400',
              displayStatus === 'borrador'       && 'bg-slate-300',
              displayStatus === 'cancelada'      && 'bg-red-400',
            )} />
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
             {daysSinceConfirm !== undefined && (
              <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200/50 uppercase tracking-tighter">
                {daysSinceConfirm} DIAS
              </span>
            )}
            <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center transition-all group-open:bg-blue-50 group-open:border-blue-100">
              <ChevronDown className="w-3 h-3 text-slate-400 transition-transform group-open:rotate-180 group-open:text-blue-500" />
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate leading-tight" title={clienteNombre}>
            {clienteNombre}
          </p>
        </div>

        {/* Ultra-Compact Metrics Matrix */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
              <span>Cump. Físico</span>
              <span>{physicalPct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${physicalPct}%` }} />
            </div>
            <div className="text-[9px] font-black text-slate-800 tracking-tighter">
              {unidadesDespachadas} <span className="text-slate-300 font-bold">/</span> {totalUnidades} <span className="text-slate-400 text-[8px] uppercase">Und</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
              <span>Cump. Eco</span>
              <span>{economicPct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${economicPct}%` }} />
            </div>
            <div className="text-[9px] font-black text-slate-800 tracking-tighter truncate">
              {formatCurrency(valorDespachado)} <span className="text-slate-300 font-bold">/</span> {formatCurrency(totalValor)}
            </div>
          </div>
        </div>

        {/* Stepper Footer */}
        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
           <OVStatusBadge estado={displayStatus} />
           <div className="scale-75 origin-right">
              <OVMiniStepper currentStatus={displayStatus} daysSinceConfirm={daysSinceConfirm} />
           </div>
        </div>
      </summary>

      {/* ─── Expanded: Production Panel ─────────────────────────────── */}
      <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50/50">
        <div className="pt-3 space-y-3">

          {/* Consolidated progress */}
          <div className="space-y-1.5">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-primary-500" />
              Producción Consolidada
            </p>
            <ProgressBar value={unidadesProducidas} max={totalUnidades} colorClass="bg-amber-400" label="Programado" />
            <ProgressBar value={unidadesDespachadas} max={totalUnidades} colorClass="bg-indigo-500" label="Despachado" />
          </div>

          {/* OP list */}
          {ops.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Factory className="w-2.5 h-2.5" />
                Órdenes de Producción
              </p>
              {ops.map(op => (
                <Link
                  key={op.id}
                  href={`/ordenes-produccion/${op.id}`}
                  className="flex items-center gap-2 group/op hover:bg-white rounded-lg px-2 py-1.5 transition-colors -mx-2"
                >
                  <div className={cn('w-2 h-2 rounded-full shrink-0', OP_STATE_COLOR[op.estado] ?? 'bg-slate-300')} />
                  <span className="text-[9px] font-black text-slate-700 whitespace-nowrap">{op.codigo}</span>
                  <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', OP_STATE_COLOR[op.estado] ?? 'bg-slate-300')}
                      style={{ width: op.estado === 'completada' || op.estado === 'entregada' || op.estado === 'liquidada' || op.estado === 'terminado' ? '100%' : '50%' }}
                    />
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider w-16 text-right shrink-0">{op.estado.replace('_', ' ')}</span>
                  <span className="text-[8px] font-black text-slate-600 shrink-0">{op.unidades} u.</span>
                </Link>
              ))}
            </div>
          )}

          {ops.length === 0 && (
            <p className="text-[9px] text-slate-400 italic">Sin órdenes de producción asociadas.</p>
          )}
        </div>
      </div>
    </details>
  )
}
