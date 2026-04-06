import { cn } from '@/shared/lib/utils'
import type { EstadoOV } from '@/features/ordenes-venta/types'

const CONFIG: Record<string, { label: string; classes: string }> = {
  borrador:      { label: 'Borrador',      classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  confirmada:    { label: 'Confirmada',    classes: 'bg-blue-50 text-blue-700 border-blue-100' },
  en_produccion: { label: 'En Producción', classes: 'bg-amber-50 text-amber-700 border-amber-100' },
  terminada:     { label: 'Prod. Terminada', classes: 'bg-teal-50 text-teal-700 border-teal-100' },
  completada:    { label: 'Completada',    classes: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  despachada:    { label: 'Despachada',    classes: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  entregada:     { label: 'Entregada',     classes: 'bg-violet-50 text-violet-700 border-violet-100' },
  cancelada:     { label: 'Cancelada',     classes: 'bg-red-50 text-red-700 border-red-100' },
}

export function OVStatusBadge({ estado }: { estado: string }) {
  const cfg = CONFIG[estado] ?? CONFIG.borrador
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border shadow-sm', 
      cfg.classes
    )}>
      {cfg.label}
    </span>
  )
}
