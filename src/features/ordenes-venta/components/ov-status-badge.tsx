import { cn } from '@/shared/lib/utils'
import type { EstadoOV } from '@/features/ordenes-venta/types'

const CONFIG: Record<EstadoOV, { label: string; classes: string }> = {
  borrador:      { label: 'Borrador',      classes: 'bg-gray-100 text-gray-600' },
  confirmada:    { label: 'Confirmada',    classes: 'bg-blue-100 text-blue-700' },
  en_produccion: { label: 'En Producción', classes: 'bg-yellow-100 text-yellow-700' },
  completada:    { label: 'Completada',    classes: 'bg-green-100 text-green-700' },
  cancelada:     { label: 'Cancelada',     classes: 'bg-red-100 text-red-600' },
}

export function OVStatusBadge({ estado }: { estado: string }) {
  const cfg = CONFIG[estado as EstadoOV] ?? CONFIG.borrador
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.classes)}>
      {cfg.label}
    </span>
  )
}
