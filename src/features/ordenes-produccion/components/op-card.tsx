'use client'

import Link from 'next/link'
import { ChevronDown, Factory, Clock, Package, DollarSign } from 'lucide-react'
import { OPMiniStepper } from './op-mini-stepper'
import { OPStatusBadge } from './op-status-badge'
import { getOPStatusLabel } from '@/features/ordenes-produccion/lib/op-utils'
import { cn, formatCurrency } from '@/shared/lib/utils'

interface Props {
  id: string
  codigo: string
  tallerNombre: string
  clienteNombre: string
  ovCodigo: string
  estado: string
  totalUnidades: number
  unidadesEntregadas: number
  valorOrden: number // Este es el valor liquidado (Real)
  costoEstandar: number // Este es el valor proyectado (Estándar)
  fechaCreacion: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opPayload: any 
}

export function OPCard({
  id, codigo, tallerNombre, clienteNombre, ovCodigo,
  estado, totalUnidades, unidadesEntregadas, valorOrden, costoEstandar, fechaCreacion,
  opPayload
}: Props) {
  const now = new Date()
  const createdDate = new Date(fechaCreacion)
  const daysPast = Math.max(0, Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)))
  const completionPct = totalUnidades > 0 ? Math.round((unidadesEntregadas / totalUnidades) * 100) : 0

  return (
    <details className="group rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow outline-none overflow-hidden">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none outline-none [&::-webkit-details-marker]:hidden">
        {/* Status indicator dot */}
        <div className={cn(
          'w-2 h-2 rounded-full shrink-0',
          estado === 'completada' || estado === 'liquidada' ? 'bg-emerald-500' : 
          estado === 'en_entregas' ? 'bg-indigo-500' :
          estado === 'en_terminado' ? 'bg-blue-600' :
          estado === 'en_corte' || estado === 'en_confeccion' || estado === 'dupro_pendiente' ? 'bg-amber-400' : 'bg-slate-300'
        )} />

        {/* Core info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/ordenes-produccion/${id}`}
              className="font-black text-[12px] text-slate-900 whitespace-nowrap hover:text-primary-600 transition-colors"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {codigo}
            </Link>
            <OPStatusBadge estado={estado} labelOverride={getOPStatusLabel(opPayload)} />

            {opPayload?.es_muestra && (
              <Link
                href={opPayload?.desarrollo_id ? `/desarrollo/${opPayload.desarrollo_id}` : '#'}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="text-[8px] font-black bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded border border-violet-200 uppercase tracking-tighter hover:bg-violet-200 transition-colors"
              >
                MUESTRA
              </Link>
            )}

            <span className="text-[8px] font-black bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
              {ovCodigo}
            </span>

            <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{tallerNombre}</span>
            
            <div className="flex items-center gap-4 ml-auto shrink-0 text-right">
               <div className="flex flex-col items-end">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Avance</span>
                <span className="text-[11px] font-black text-slate-700 leading-none">
                  {unidadesEntregadas}/{totalUnidades}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Real/Estándar</span>
                <span className={cn(
                  "text-[11px] font-black leading-none",
                  valorOrden > costoEstandar ? "text-rose-600" : "text-slate-900"
                )}>
                  {formatCurrency(valorOrden)}
                </span>
              </div>
            </div>
          </div>

          {/* Mini Stepper */}
          <div className="mt-2">
            <OPMiniStepper currentStatus={estado} />
          </div>
        </div>

        {/* Expand chevron */}
        <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 transition-all group-open:bg-primary-50 group-open:border-primary-100">
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform group-open:rotate-180 group-open:text-primary-500" />
        </div>
      </summary>

      {/* Expanded Panel */}
      <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50/50">
        <div className="grid grid-cols-2 gap-4 pt-4">
          {/* Metrics Column 1 */}
          <div className="space-y-3">
            <MetricLine 
              icon={<Clock className="w-3 h-3 text-amber-500" />} 
              label="Días cursados" 
              value={`${daysPast} días`} 
              subValue={`Desde: ${createdDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`}
            />
            <MetricLine 
              icon={<Factory className="w-3 h-3 text-primary-500" />} 
              label="Taller" 
              value={tallerNombre} 
              subValue="Sede Principal"
            />
          </div>

          {/* Metrics Column 2 */}
          <div className="space-y-3">
            <MetricLine 
              icon={<Package className="w-3 h-3 text-indigo-500" />} 
              label="Fulfillment" 
              value={`${completionPct}%`} 
              subValue={`${unidadesEntregadas} de ${totalUnidades} uds.`}
            />
             <MetricLine 
              icon={<DollarSign className="w-3 h-3 text-emerald-500" />} 
              label="Variación Costo" 
              value={`${formatCurrency(valorOrden)} / ${formatCurrency(costoEstandar)}`} 
              subValue={valorOrden > 0 ? `Desvío: ${(((valorOrden - costoEstandar) / costoEstandar) * 100).toFixed(1)}%` : "Sin liquidación"}
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cliente: {clienteNombre}</span>
          <Link 
            href={`/ordenes-produccion/${id}`}
            className="text-[9px] font-black text-primary-600 uppercase tracking-widest hover:underline"
          >
            Ver detalle completo →
          </Link>
        </div>
      </div>
    </details>
  )
}

function MetricLine({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xs font-black text-slate-900 leading-none">{value}</p>
        <p className="text-[9px] font-bold text-slate-400 leading-tight mt-1">{subValue}</p>
      </div>
    </div>
  )
}
