'use client'

import { Clock, DollarSign, Target, Package, Layers } from 'lucide-react'
import { formatCurrency, cn } from '@/shared/lib/utils'

interface MetricProps {
  label: string
  value: string | number
  subValue?: string
  icon: React.ReactNode
  color: string
}

function MetricCard({ label, value, subValue, icon, color }: MetricProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2.5 rounded-2xl", color)}>
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900 leading-none mb-1 tracking-tight">{value}</h3>
        {subValue && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{subValue}</p>}
      </div>
    </div>
  )
}

interface Props {
  avgLeadTime: number
  totalProgrammedValue: number
  fpy: number
  totalUnits: number
  uniqueRefs: number
}

export function OPDashboardHeader({ avgLeadTime, totalProgrammedValue, fpy, totalUnits, uniqueRefs }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      <MetricCard
        label="Lead Time Avg"
        value={`${avgLeadTime.toFixed(1)}d`}
        subValue="Días desde creación"
        icon={<Clock className="w-5 h-5 text-amber-600" />}
        color="bg-amber-50"
      />
      <MetricCard
        label="Valor Proyectado"
        value={formatCurrency(totalProgrammedValue)}
        subValue="Costo estándar total"
        icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
        color="bg-emerald-50"
      />
      <MetricCard
        label="First Pass Yield"
        value={`${fpy.toFixed(1)}%`}
        subValue="Unidades aceptadas"
        icon={<Target className="w-5 h-5 text-primary-600" />}
        color="bg-primary-50"
      />
      <MetricCard
        label="Volumen Taller"
        value={totalUnits.toLocaleString()}
        subValue="Unidades programadas"
        icon={<Package className="w-5 h-5 text-indigo-600" />}
        color="bg-indigo-50"
      />
      <MetricCard
        label="Mezcla (Mix)"
        value={uniqueRefs}
        subValue="Referencias únicas"
        icon={<Layers className="w-5 h-5 text-rose-600" />}
        color="bg-rose-50"
      />
    </div>
  )
}
