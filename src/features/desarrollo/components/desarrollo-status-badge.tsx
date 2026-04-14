import { cn } from '@/shared/lib/utils'
import { STATUS_LABELS, STATUS_COLORS } from '@/features/desarrollo/types'
import type { StatusDesarrollo } from '@/features/desarrollo/types'

interface Props {
  status: StatusDesarrollo
  className?: string
}

export function DesarrolloStatusBadge({ status, className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
      STATUS_COLORS[status],
      className
    )}>
      {STATUS_LABELS[status]}
    </span>
  )
}
