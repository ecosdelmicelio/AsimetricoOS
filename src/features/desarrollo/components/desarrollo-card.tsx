import Link from 'next/link'
import { ChevronRight, Calendar, AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { DesarrolloStatusBadge } from './desarrollo-status-badge'
import { CATEGORIA_LABELS, PRIORIDAD_COLORS } from '@/features/desarrollo/types'
import type { DesarrolloConRelaciones, Prioridad } from '@/features/desarrollo/types'

interface Props {
  desarrollo: DesarrolloConRelaciones
}

export function DesarrolloCard({ desarrollo }: Props) {
  const ultimaVersion = desarrollo.desarrollo_versiones?.length
    ? desarrollo.desarrollo_versiones.reduce((a, b) => a.version_n > b.version_n ? a : b)
    : null

  const diasEnStatus = desarrollo.updated_at
    ? Math.floor((Date.now() - new Date(desarrollo.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const agingColor =
    diasEnStatus > 15 ? 'text-red-500' :
    diasEnStatus > 7  ? 'text-amber-500' :
    'text-green-500'

  const vencido = desarrollo.fecha_compromiso
    ? new Date(desarrollo.fecha_compromiso) < new Date()
    : false

  return (
    <Link
      href={`/desarrollo/${desarrollo.id}`}
      className="block rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all p-4 group"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {desarrollo.temp_id}
            </span>
            <DesarrolloStatusBadge status={desarrollo.status as never} />
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
              PRIORIDAD_COLORS[desarrollo.prioridad as Prioridad]
            )}>
              {desarrollo.prioridad}
            </span>
          </div>

          <h3 className="font-black text-slate-900 text-sm leading-snug truncate group-hover:text-primary-600 transition-colors">
            {desarrollo.nombre_proyecto}
          </h3>

          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
            <span>{CATEGORIA_LABELS[desarrollo.categoria_producto as keyof typeof CATEGORIA_LABELS] ?? desarrollo.categoria_producto}</span>
            <span>·</span>
            <span className="capitalize">{desarrollo.tipo_producto}</span>
            {desarrollo.terceros && (
              <>
                <span>·</span>
                <span>{desarrollo.terceros.nombre}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: meta */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-400 transition-colors" />

          {ultimaVersion && (
            <span className="text-[10px] font-bold text-slate-400">
              v{ultimaVersion.version_n}
            </span>
          )}

          <span className={cn('text-[10px] font-semibold', agingColor)}>
            {diasEnStatus}d sin cambios
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          {desarrollo.fecha_compromiso ? (
            <span className={cn(vencido && desarrollo.status !== 'graduated' && desarrollo.status !== 'cancelled' ? 'text-red-500 font-semibold' : '')}>
              {vencido && desarrollo.status !== 'graduated' && desarrollo.status !== 'cancelled' && (
                <AlertTriangle className="inline w-3 h-3 mr-0.5" />
              )}
              {new Date(desarrollo.fecha_compromiso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          ) : (
            <span className="italic">Sin fecha</span>
          )}
        </div>

        {/* Aprobaciones de la última versión */}
        {ultimaVersion && (
          <div className="flex items-center gap-1.5">
            <AprobacionDot label="Ops" aprobado={ultimaVersion.aprobado_ops} />
            <AprobacionDot label="Cli" aprobado={ultimaVersion.aprobado_cliente} />
            <AprobacionDot label="Dir" aprobado={ultimaVersion.aprobado_director} />
          </div>
        )}
      </div>
    </Link>
  )
}

function AprobacionDot({ label, aprobado }: { label: string; aprobado: boolean | null }) {
  return (
    <div className="flex items-center gap-0.5">
      <div className={cn(
        'w-2 h-2 rounded-full',
        aprobado ? 'bg-green-400' : 'bg-slate-200'
      )} />
      <span className="text-[9px] text-slate-400 font-medium">{label}</span>
    </div>
  )
}
