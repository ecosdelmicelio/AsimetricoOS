import Link from 'next/link'
import { ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { getOPsParaInspeccion } from '@/features/calidad/services/calidad-actions'
import { CalidadStatusBadge } from './calidad-status-badge'
import { formatDate } from '@/shared/lib/utils'

const ESTADO_LABEL: Record<string, string> = {
  dupro_pendiente: 'DuPro',
}

export async function CalidadList() {
  const ops = await getOPsParaInspeccion()

  if (ops.length === 0) {
    return (
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-16 text-center">
        <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Todo en Orden</h3>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
          Sin órdenes pendientes de inspección técnica en este momento
        </p>
      </div>
    )
  }

  const pendientes = ops.filter(op => !op.inspeccion_pendiente)
  const enInspeccion = ops.filter(op => op.inspeccion_pendiente)

  return (
    <div className="space-y-12">
      {enInspeccion.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Operaciones en Proceso ({enInspeccion.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {enInspeccion.map(op => (
              <OPInspeccionCard key={op.id} op={op} />
            ))}
          </div>
        </section>
      )}

      {pendientes.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              Nuevas por Inspeccionar ({pendientes.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {pendientes.map(op => (
              <OPInspeccionCard key={op.id} op={op} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function OPInspeccionCard({ op }: { op: Awaited<ReturnType<typeof getOPsParaInspeccion>>[0] }) {
  const tipoLabel = ESTADO_LABEL[op.estado] ?? op.estado

  return (
    <Link
      href={`/calidad/${op.id}`}
      className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 lg:p-8 flex items-center justify-between transition-all hover:shadow-xl hover:border-slate-300 active:scale-[0.99]"
    >
      <div className="flex items-center gap-6 min-w-0">
        {/* Visual Indicator */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
          op.inspeccion_pendiente ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'
        }`}>
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">{op.codigo}</h4>
            <span className="bg-slate-900 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
              {tipoLabel}
            </span>
            {op.inspeccion_pendiente && (
              <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest">REVISIÓN ACTIVA</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
            <span className="truncate max-w-[200px]">{op.taller}</span>
            <span className="text-slate-200">/</span>
            <span className="truncate max-w-[200px]">{op.cliente}</span>
            <span className="text-slate-200">/</span>
            <span className="text-primary-600">P: {formatDate(op.fecha_promesa)}</span>
          </div>
        </div>
      </div>

      <div className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary-500 group-hover:border-primary-200 group-hover:bg-primary-50 transition-all shrink-0">
        <ChevronRight className="w-6 h-6" />
      </div>
    </Link>
  )
}

