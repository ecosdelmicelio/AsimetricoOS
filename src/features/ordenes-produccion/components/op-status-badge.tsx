import { cn } from '@/shared/lib/utils'
import type { EstadoOP } from '@/features/ordenes-produccion/types'

const CONFIG: Record<EstadoOP, { label: string; classes: string }> = {
  programada:      { label: 'Programada',       classes: 'bg-slate-100 text-slate-500 border-slate-200' },
  en_corte:        { label: 'En Corte',          classes: 'bg-orange-50 text-orange-600 border-orange-100' },
  en_confeccion:   { label: 'En Confección',     classes: 'bg-amber-50 text-amber-600 border-amber-100' },
  dupro_pendiente: { label: 'DUPRO',             classes: 'bg-purple-50 text-purple-600 border-purple-100' },
  en_terminado:    { label: 'Terminado',        classes: 'bg-blue-50 text-blue-600 border-blue-100' },
  entregada:       { label: 'Entregada',         classes: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  liquidada:       { label: 'Liquidada',         classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  cancelada:       { label: 'Cancelada',         classes: 'bg-red-50 text-red-600 border-red-100' },
}

export function OPStatusBadge({ estado, labelOverride }: { estado: string; labelOverride?: string }) {
  const cfg = CONFIG[estado as EstadoOP] ?? CONFIG.programada
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border transition-all',
      cfg.classes
    )}>
      {labelOverride ?? cfg.label}
    </span>
  )
}
