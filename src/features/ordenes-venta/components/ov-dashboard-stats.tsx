'use client'

import { 
  TrendingUp, 
  Package, 
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react'
import type { OVDashboardStats as StatsType } from '../types'

interface Props {
  stats: StatsType
}

function StatCard({ 
  icon, label, value, sub, bar, barColor, alert 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  bar?: number
  barColor?: string
  alert?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-2 border shadow-sm ${alert ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${alert ? 'bg-red-100' : 'bg-slate-50 border border-slate-100'}`}>
          {icon}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${alert ? 'bg-red-100 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
          {label}
        </span>
      </div>
      <div>
        <h3 className={`text-lg font-black leading-none ${alert ? 'text-red-700' : 'text-slate-900'}`}>{value}</h3>
        <p className={`text-[9px] font-bold mt-1 ${alert ? 'text-red-400' : 'text-slate-400'}`}>{sub}</p>
      </div>
      {bar !== undefined && (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor ?? 'bg-primary-500'}`}
            style={{ width: `${Math.min(100, bar)}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function OVDashboardStats({ stats }: Props) {
  const pctValue = stats.totalSolicitado > 0 
    ? (stats.totalEntregado / stats.totalSolicitado) * 100 
    : 0
    
  const pctUnits = stats.unidadesPedidas > 0 
    ? (stats.unidadesEntregadas / stats.unidadesPedidas) * 100 
    : 0

  const fmt = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
        label="Facturación"
        value={fmt(stats.totalEntregado)}
        sub={`de ${fmt(stats.totalSolicitado)} · ${pctValue.toFixed(1)}%`}
        bar={pctValue}
        barColor="bg-emerald-500"
      />
      <StatCard
        icon={<Package className="w-4 h-4 text-primary-500" />}
        label="Unidades"
        value={`${stats.unidadesEntregadas} / ${stats.unidadesPedidas}`}
        sub={`${pctUnits.toFixed(1)}% despachado`}
        bar={pctUnits}
        barColor="bg-primary-500"
      />
      <StatCard
        icon={<ClipboardCheck className="w-4 h-4 text-amber-500" />}
        label="En Operación"
        value={`${stats.ordenesActivas}`}
        sub="órdenes pendientes de entrega"
      />
      <StatCard
        icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
        label="+30 días"
        value={`${stats.ordenesAgingCount} OVs`}
        sub={`${stats.unidadesAging} prendas con +30d confirmadas`}
        alert={stats.ordenesAgingCount > 0}
      />
    </div>
  )
}
