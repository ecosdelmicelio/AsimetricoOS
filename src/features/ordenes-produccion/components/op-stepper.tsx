'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { SECUENCIA_ESTADOS, type EstadoOP } from '@/features/ordenes-produccion/types'

interface Props {
  currentStatus: string
  // Historial can be used to show dates if needed
  historial?: any[]
}

export function OPStepper({ currentStatus, historial = [] }: Props) {
  const currentIndex = SECUENCIA_ESTADOS.indexOf(currentStatus as EstadoOP)
  
  return (
    <div className="relative flex items-center justify-between w-full">
      {/* Background Line */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100" />
      
      {/* Progress Line */}
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary-500 transition-all duration-700" 
        style={{ width: `${(Math.max(0, currentIndex) / (SECUENCIA_ESTADOS.length - 1)) * 100}%` }}
      />

      {/* Steps */}
      {SECUENCIA_ESTADOS.map((step, i) => {
        const isPast = i < currentIndex
        const isCurrent = i === currentIndex
        const isLast = i === SECUENCIA_ESTADOS.length - 1
        
        // Find date from historial if available
        const hito = historial.find(h => h.estado_nuevo === step)
        const dateStr = hito?.timestamp_cambio ? new Date(hito.timestamp_cambio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : ''

        return (
          <div key={step} className="relative flex flex-col items-center group">
            <div className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10',
              isPast ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-200' :
              isCurrent ? 'bg-white border-primary-500 text-primary-500 shadow-md ring-4 ring-primary-50' :
              'bg-white border-slate-200 text-slate-300'
            )}>
              {isPast ? <CheckCircle2 className="w-5 h-5" /> : <Circle className={cn('w-4 h-4', isCurrent && 'fill-primary-500')} />}
            </div>
            
            <div className="absolute top-10 flex flex-col items-center min-w-[80px]">
              <span className={cn(
                'text-[8px] font-black uppercase tracking-widest text-center whitespace-nowrap mb-0.5',
                isCurrent ? 'text-slate-900' : 'text-slate-400'
              )}>
                {step.replace('_', ' ')}
              </span>
              {dateStr && (
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                  {dateStr}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
