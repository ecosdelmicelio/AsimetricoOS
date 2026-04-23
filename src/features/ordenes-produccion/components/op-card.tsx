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

  return (    <details className="group rounded-[32px] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-500 outline-none overflow-hidden">
      <summary className="flex flex-col px-4 py-3 cursor-pointer list-none outline-none [&::-webkit-details-marker]:hidden">
        {/* Header Line: Code + OV + Aging */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              href={`/ordenes-produccion/${id}`}
              className="font-black text-[12px] text-slate-900 tracking-tighter hover:text-primary-600 transition-colors whitespace-nowrap"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {codigo}
            </Link>
            <div className={cn(
              'w-2 h-2 rounded-full shrink-0',
              estado === 'completada' || estado === 'liquidada' ? 'bg-emerald-500' : 
              estado === 'en_entregas' ? 'bg-indigo-500' :
              estado === 'en_terminado' ? 'bg-blue-600' :
              estado === 'en_corte' || estado === 'en_confeccion' || estado === 'dupro_pendiente' ? 'bg-amber-400' : 'bg-slate-300'
            )} />
            {opPayload?.es_muestra && (
              <span className="text-[7px] font-black bg-violet-100 text-violet-700 px-1 py-0.5 rounded border border-violet-200 uppercase tracking-tighter shrink-0">
                MUESTRA
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
             <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-200/50 uppercase tracking-tighter">
                {ovCodigo}
              </span>
             <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-200/50 uppercase tracking-tighter">
                {daysPast}d
              </span>
            <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center transition-all group-open:bg-primary-50 group-open:border-primary-100">
              <ChevronDown className="w-3 h-3 text-slate-400 transition-transform group-open:rotate-180 group-open:text-primary-500" />
            </div>
          </div>
        </div>

        {/* Taller / Client Info */}
        <div className="mb-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate leading-tight" title={tallerNombre}>
            {tallerNombre} <span className="text-slate-200 mx-1">|</span> <span className="text-slate-300 font-bold">{clienteNombre}</span>
          </p>
        </div>

        {/* Triple Track Pipeline Matrix - Compacted */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[7px] font-black text-slate-400 uppercase tracking-tighter">
              <span>UNID</span>
              <span className="text-amber-500">{completionPct}%</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
            </div>
            <div className="text-[8px] font-black text-slate-700 tracking-tighter truncate">
              {unidadesEntregadas}<span className="text-slate-300 font-bold mx-0.5">/</span>{totalUnidades}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[7px] font-black text-slate-400 uppercase tracking-tighter">
              <span>COST</span>
              <span className={cn(valorOrden > costoEstandar ? "text-rose-500" : "text-emerald-500")}>
                {valorOrden > 0 ? `${Math.round((valorOrden/costoEstandar)*100)}%` : '0%'}
              </span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", valorOrden > costoEstandar ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${valorOrden > 0 ? Math.min(100, (valorOrden/costoEstandar)*100) : 0}%` }} />
            </div>
            <div className="text-[8px] font-black text-slate-700 tracking-tighter truncate">
              {formatCurrency(valorOrden)}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[7px] font-black text-slate-400 uppercase tracking-tighter">
              <span>EST</span>
              <span className="text-slate-500">100%</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-400 rounded-full transition-all duration-500" style={{ width: '100%' }} />
            </div>
            <div className="text-[8px] font-black text-slate-700 tracking-tighter truncate">
              {formatCurrency(costoEstandar)}
            </div>
          </div>
        </div>

        {/* Stepper Footer - Slimmed */}
        <div className="pt-2 border-t border-slate-50">
           <OPMiniStepper currentStatus={estado} />
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
