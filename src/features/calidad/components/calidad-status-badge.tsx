import type { ResultadoInspeccion } from '@/features/calidad/types'

const CONFIG: Record<ResultadoInspeccion, { label: string; className: string }> = {
  pendiente: { label: 'En inspección', className: 'bg-yellow-100 text-yellow-700' },
  aceptada:  { label: 'Aceptada',      className: 'bg-green-100 text-green-700' },
  rechazada: { label: 'Rechazada',     className: 'bg-red-100 text-red-700' },
  segundas:  { label: 'Segundas',      className: 'bg-purple-100 text-purple-700' },
}

export function CalidadStatusBadge({ resultado }: { resultado: ResultadoInspeccion }) {
  const { label, className } = CONFIG[resultado]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}
