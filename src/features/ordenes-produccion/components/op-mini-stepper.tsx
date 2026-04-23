'use client'

import { cn } from '@/shared/lib/utils'

const STEPS = [
  { id: 'programada',    label: 'Prog' },
  { id: 'en_corte',      label: 'Corte' },
  { id: 'en_confeccion', label: 'Conf' },
  { id: 'en_terminado',  label: 'Term' },
  { id: 'en_entregas',   label: 'Entr' },
  { id: 'completada',    label: 'Done' },
  { id: 'liquidada',     label: 'Liq' }
]

interface Props {
  currentStatus: string
}

export function OPMiniStepper({ currentStatus }: Props) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStatus)
  
  return (
    <div className="flex items-center gap-1.5 w-full">
      {STEPS.map((step, i) => {
        const isPast = i < currentIndex
        const isCurrent = i === currentIndex
        const isFuture = i > currentIndex
        
        return (
          <div key={step.id} className="flex-1 flex flex-col gap-1">
            <div className={cn(
              'h-1.5 rounded-full transition-all duration-500',
              isPast && 'bg-emerald-500',
              isCurrent && 'bg-amber-400 animate-pulse',
              isFuture && 'bg-slate-100'
            )} />
            <span className={cn(
              'text-[8px] font-black uppercase tracking-tighter text-center',
              isCurrent ? 'text-slate-900' : 'text-slate-300'
            )}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
