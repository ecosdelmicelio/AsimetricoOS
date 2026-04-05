import { cn } from '@/shared/lib/utils'
import type { EstadoOP } from '@/features/ordenes-produccion/types'

const CONFIG: Record<EstadoOP, { label: string; classes: string }> = {
  programada:      { label: 'Programada',       classes: 'bg-gray-100 text-gray-600' },
  en_corte:        { label: 'En Corte',          classes: 'bg-orange-100 text-orange-700' },
  en_confeccion:   { label: 'En Confección',     classes: 'bg-yellow-100 text-yellow-700' },
  dupro_pendiente: { label: 'DUPRO Pendiente',   classes: 'bg-purple-100 text-purple-700' },
  en_terminado:    { label: 'En Terminado',      classes: 'bg-blue-100 text-blue-700' },
  en_entregas:     { label: 'En Entregas',        classes: 'bg-teal-100 text-teal-700' },
  liquidada:       { label: 'Liquidada',         classes: 'bg-emerald-100 text-emerald-700' },
  completada:      { label: 'Completada',        classes: 'bg-green-100 text-green-700' },
  cancelada:       { label: 'Cancelada',         classes: 'bg-red-100 text-red-600' },
}

export function OPStatusBadge({ estado }: { estado: string }) {
  const cfg = CONFIG[estado as EstadoOP] ?? CONFIG.programada
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.classes)}>
      {cfg.label}
    </span>
  )
}
