'use client'

import { Check, ClipboardList, CheckCircle2, Factory, Truck, Home, Clock, Package } from 'lucide-react'
import { cn, formatDate } from '@/shared/lib/utils'
import type { OVMilestone } from '@/features/ordenes-venta/types'

interface Props {
  milestones: OVMilestone[]
  currentStatus: string
}

export function OVStepper({ milestones, currentStatus }: Props) {
  if (currentStatus === 'cancelada') {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-3 flex items-center gap-3 text-red-700">
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
          <Check className="w-4 h-4" />
        </div>
        <p className="text-xs font-bold uppercase tracking-tight">Orden Cancelada</p>
      </div>
    )
  }

  return (
    <div className="w-full py-2">
      <div className="flex items-start justify-between gap-2 overflow-x-auto no-scrollbar pb-2">
        {milestones.map((step, idx) => {
          const Icon = getIcon(step.id)
          const isLast = idx === milestones.length - 1
          const isCurrent = step.id === currentStatus || (currentStatus === 'completada' && step.id === 'en_produccion')
          const isFuture = !step.completed && !isCurrent

          return (
            <div key={step.id} className="flex flex-col items-center flex-1 min-w-[80px] relative group">
              {/* Connector */}
              {!isLast && (
                <div className="absolute top-3 left-[50%] w-full h-[1.5px] bg-slate-100 -z-0">
                  <div 
                    className={cn(
                      "h-full bg-primary-500 transition-all duration-1000",
                      step.completed ? "w-full" : "w-0"
                    )} 
                  />
                </div>
              )}

              {/* Icon Circle */}
              <div 
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300 relative z-10 shadow-sm",
                  step.completed ? "bg-primary-500 text-white shadow-primary-100" : 
                  isCurrent ? "bg-white border-[1.5px] border-primary-500 text-primary-600 animate-pulse ring-2 ring-primary-50" : 
                  "bg-slate-50 border border-slate-200 text-slate-300"
                )}
              >
                {step.completed ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              </div>

              {/* Label & Date */}
              <div className="mt-1.5 text-center px-0.5">
                <p 
                  className={cn(
                    "text-[8px] font-black uppercase tracking-tight leading-none mb-0.5",
                    step.completed || isCurrent ? "text-slate-900" : "text-slate-300"
                  )}
                >
                  {step.label}
                </p>
                
                {step.completed && step.date && (
                  <p className="text-[7px] font-bold text-slate-400 leading-none">
                    {new Date(step.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                  </p>
                )}

                {/* Days Elapsed Badges */}
                {step.completed && step.daysSinceStart !== undefined && step.id !== 'borrador' && (
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="text-[6px] font-black px-1 py-0.25 rounded-sm bg-blue-50 text-blue-600 border border-blue-100">
                      T+{step.daysSinceStart}d
                    </span>
                    {step.daysBetweenSteps !== undefined && step.daysBetweenSteps > 0 && (
                      <span className="text-[6px] font-bold text-slate-400">
                        Δ{step.daysBetweenSteps}d
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Sub-states (Production zoom) */}
              {isCurrent && step.subStates && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-40 bg-white border border-slate-100 shadow-xl rounded-lg p-2 z-50 pointer-events-none group-hover:pointer-events-auto transition-all scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5 border-b border-slate-50 pb-0.5 flex items-center gap-1">
                     <Clock className="w-2 h-2" /> Producción
                   </p>
                   <div className="space-y-1">
                     {step.subStates.map((ss, sidx) => (
                       <div key={sidx} className="flex items-center justify-between gap-2 leading-none">
                         <span className="text-[7px] font-bold text-slate-700">{ss.estado}</span>
                         <span className="text-[6px] font-medium text-slate-400">{new Date(ss.timestamp).toLocaleDateString()}</span>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getIcon(id: string) {
  switch (id) {
    case 'borrador': return ClipboardList
    case 'confirmada': return CheckCircle2
    case 'en_produccion': return Factory
    case 'despachada': return Truck
    case 'entregada': return Home
    default: return Package
  }
}
