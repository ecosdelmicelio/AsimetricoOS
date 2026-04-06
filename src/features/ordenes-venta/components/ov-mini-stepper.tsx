import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const STEPS = [
  { id: 'borrador',      label: 'Borr.' },
  { id: 'confirmada',    label: 'Conf.' },
  { id: 'en_produccion', label: 'Prod.' },
  { id: 'despachada',    label: 'Desp.' },
  { id: 'entregada',     label: 'Entr.' },
]

// completada maps to same visual position as despachada (production done, awaiting dispatch)
const STATE_ORDER = ['borrador', 'confirmada', 'en_produccion', 'despachada', 'entregada']

function getStepIndex(status: string): number {
  if (status === 'terminada') return STATE_ORDER.indexOf('en_produccion')
  if (status === 'completada') return STATE_ORDER.indexOf('despachada')
  return STATE_ORDER.indexOf(status)
}

interface Props {
  currentStatus: string
  /** Days elapsed since order was confirmed (T+Xd) */
  daysSinceConfirm?: number
}

export function OVMiniStepper({ currentStatus, daysSinceConfirm }: Props) {
  const currentIndex = getStepIndex(currentStatus)

  return (
    <div className="flex items-center w-full gap-0">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex
        const isActive = i === currentIndex
        const isPending = i > currentIndex
        const isLast = i === STEPS.length - 1

        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center shrink-0">
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center transition-all border',
                isDone   && 'bg-slate-800 border-slate-800',
                isActive && 'bg-primary-600 border-primary-600 ring-2 ring-primary-200',
                isPending && 'bg-white border-slate-200',
              )}>
                {isDone && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                {isPending && <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
              </div>
              {/* Label / T+Xd */}
              <div className="mt-0.5 flex flex-col items-center leading-none">
                <span className={cn(
                  'text-[7px] font-black uppercase tracking-wider',
                  isDone   && 'text-slate-500',
                  isActive && 'text-primary-600',
                  isPending && 'text-slate-300',
                )}>
                  {step.label}
                </span>
                {isActive && daysSinceConfirm !== undefined && (
                  <span className="text-[7px] font-bold text-amber-500 mt-px">
                    T+{daysSinceConfirm}d
                  </span>
                )}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className={cn(
                'flex-1 h-px mx-1 mb-3',
                isDone ? 'bg-slate-800' : 'bg-slate-150'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
