import type { EstadoDocumental, EstadoGreige } from '@/features/compras/types'

const DOC_CONFIG: Record<EstadoDocumental, { label: string; className: string }> = {
  na:                 { label: 'Sin afidávit',       className: 'bg-gray-100 text-gray-500' },
  pendiente_afidavit: { label: 'Afidávit pendiente', className: 'bg-yellow-100 text-yellow-700' },
  cargado:            { label: 'Afidávit cargado',   className: 'bg-green-100 text-green-700' },
  en_proceso:         { label: 'En proceso',         className: 'bg-blue-100 text-blue-700' },
  completada:         { label: 'Completada',         className: 'bg-teal-100 text-teal-700' },
  finalizada:         { label: 'Finalizada',         className: 'bg-slate-800 text-slate-100' },
}

const GREIGE_CONFIG: Record<EstadoGreige, { label: string; icon: string }> = {
  en_crudo:    { label: 'En crudo (15d)',  icon: '⚡' },
  para_tejer:  { label: 'Por tejer (30d)', icon: '🕐' },
  otros:       { label: 'Otros',           icon: '📦' },
}

export function OCDocBadge({ estado }: { estado: EstadoDocumental }) {
  const cfg = DOC_CONFIG[estado]
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

export function OCGreigeBadge({ estado }: { estado: EstadoGreige }) {
  const cfg = GREIGE_CONFIG[estado]
  return (
    <span className="text-xs font-medium text-muted-foreground">
      {cfg.icon} {cfg.label}
    </span>
  )
}
