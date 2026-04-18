import Link from 'next/link'
import { ArrowLeft, Package, Calendar, User, FileText, Factory, Globe, Clock, TrendingUp, DollarSign } from 'lucide-react'
import { getOrdenVentaById, getHistorialOV, getOVProgressSummary, getOVMilestones } from '@/features/ordenes-venta/services/ov-actions'
import { getOPsByOV } from '@/features/ordenes-produccion/services/op-actions'
import { getDespachosByOV, getBinesDisponiblesParaOV } from '@/features/ordenes-venta/services/despachos-actions'
import { getPagosPorDocumento } from '@/features/configuracion/services/pagos-actions'
import { OVStatusBadge } from './ov-status-badge'
import { OVActions } from './ov-actions'
import { OVProgressMatrix } from './ov-progress-matrix'
import { OVFinancialPanel } from './ov-financial-panel'
import { OVDespachos } from './ov-despachos'
import { OVStepper } from './ov-stepper'
import { formatDate, formatCurrency, cn } from '@/shared/lib/utils'

interface Props {
  id: string
}

export async function OVDetail({ id }: Props) {
  const { data: ov, error } = await getOrdenVentaById(id)

  if (error || !ov) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <p className="text-foreground font-medium">Orden no encontrada</p>
        <Link href="/ordenes-venta" className="text-primary-600 text-body-sm mt-2 inline-block">
          ← Volver a la lista
        </Link>
      </div>
    )
  }

  const [
    despachos,
    bines,
    progress,
    milestones
  ] = await Promise.all([
    getDespachosByOV(ov.id),
    getBinesDisponiblesParaOV(ov.id),
    getOVProgressSummary(ov.id),
    getOVMilestones(ov.id),
    getPagosPorDocumento(ov.id)
  ])

  const pagosData = pagosRes.data || []

  const cliente = ov.terceros
  const detalles = ov.ov_detalle ?? []
  
  // Metrics Calculation
  const totalUnidades = detalles.reduce((s, d) => s + d.cantidad, 0)
  const totalValor = detalles.reduce((s, d) => s + d.cantidad * (d.precio_pactado || 0), 0)
  
  const unidadesDespachadas = progress.reduce((s, d) => s + d.despachado, 0)
  const valorEntregado = progress.reduce((s, d) => {
    const det = detalles.find(line => line.producto_id === d.producto_id && line.talla === d.talla)
    return s + (d.despachado * (det?.precio_pactado || 0))
  }, 0)

  // Status Derivation (UI Display Status - Reality Check)
  let displayStatus = ov.estado
  
  if (displayStatus !== 'cancelada' && displayStatus !== 'entregada') {
    // 1. Process 100% finished (Dispatched total units)
    if (totalUnidades > 0 && unidadesDespachadas >= totalUnidades) {
      displayStatus = 'completada'
    } else if (unidadesDespachadas > 0) {
      displayStatus = 'despachada' // Parcialmente despachada
    } else if (progress.length > 0 && progress.every(p => p.producido >= p.pedido)) {
      displayStatus = 'terminada' // Producción completa pero no despachada
    } else if (progress.some(p => p.producido > 0)) {
      displayStatus = 'en_produccion'
    }
  }

  // Leadtime & Dates
  const hitoConfirmacion = milestones.find(m => m.id === 'confirmada')
  const confirmationDate = hitoConfirmacion?.date ? new Date(hitoConfirmacion.date) : null
  const deliveryDate = new Date(ov.fecha_entrega)
  const today = new Date()
  
  const leadtimeTotal = confirmationDate ? Math.ceil((deliveryDate.getTime() - confirmationDate.getTime()) / (1000 * 3600 * 24)) : null
  const currentLeadtime = confirmationDate ? Math.max(0, Math.ceil((today.getTime() - confirmationDate.getTime()) / (1000 * 3600 * 24))) : 0

  return (
    <div className="space-y-8 pb-20 max-w-[1400px] mx-auto">
      
      {/* 🏭 INDUSTRIAL COMMAND CENTER HEADER */}
      <div className="rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 lg:px-8 lg:py-6">
                {/* 1. Identification Row & Metrics Stripe */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
            
            {/* Identification & Client */}
            <div className="flex items-center gap-3 bg-slate-50/50 px-4 py-3 rounded-[1.25rem] border border-slate-100 flex-1 min-w-0 self-stretch">
              <Link
                href="/ordenes-venta"
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-all shadow-sm shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1.5 mb-1">
                  <div>
                    <OVStatusBadge estado={displayStatus} />
                  </div>
                  <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none whitespace-nowrap">
                    {ov.codigo}
                  </h1>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[9px] uppercase tracking-widest leading-none">
                  <User className="w-3 h-3 text-primary-500" />
                  <span className="truncate">{cliente?.nombre ?? 'CLIENTE NO DEFINIDO'}</span>
                </div>
              </div>
            </div>

            {/* Metrics Stripe */}
            <div className="grid grid-cols-3 gap-2 flex-[1.5] self-stretch">
              <MetricStripe 
                icon={<Clock className="w-3 h-3 text-amber-500" />}
                label="Timeline / Aging"
                value={`T+${currentLeadtime}d`}
                subValue={confirmationDate ? `Conf: ${confirmationDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : `Δ${leadtimeTotal ?? '—'}d`}
              />
              <MetricStripe 
                icon={<TrendingUp className="w-3 h-3 text-primary-500" />}
                label="Fulfillment"
                value={`${unidadesDespachadas}/${totalUnidades}`}
                subValue={`${Math.round((unidadesDespachadas/totalUnidades)*100 || 0)}% Unidades`}
              />
              <MetricStripe 
                icon={<DollarSign className="w-3 h-3 text-emerald-500" />}
                label="Facturación"
                value={formatCurrency(valorEntregado)}
                subValue={`Total: ${formatCurrency(totalValor)}`}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0 w-full lg:w-auto">
              <OVActions
                ovId={id}
                estadoActual={ov.estado}
                unidadesProducidas={progress.reduce((s, d) => s + d.producido, 0)}
                totalUnidades={totalUnidades}
                editHref={ov.estado === 'borrador' ? `/ordenes-venta/${id}/editar` : undefined}
              />
            </div>
          </div>

          {/* 2. Stepper & Compliance Row (The "Single Look" integration) */}
          <div className="bg-slate-50/30 rounded-[2rem] border border-slate-100/50 p-4 lg:p-6 shadow-inner space-y-6">
            <div className="px-2">
              <OVStepper milestones={milestones} currentStatus={ov.estado} />
            </div>
            
            <div className="border-t border-slate-200/50 pt-6">
               <div className="flex items-center justify-between gap-4 mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance Matrix</h2>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 flex gap-4">
                    <span>Units: {totalUnidades}</span>
                    <span>Total: {formatCurrency(totalValor)}</span>
                  </div>
               </div>
               <OVProgressMatrix lines={progress} />
            </div>
          </div>

        </div>
      </div>

      {/* 📊 LOGISTICS LOGS */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Financial Action Area */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 px-4">
            <div className="w-2 h-8 bg-primary-500 rounded-full shadow-lg shadow-primary-200" />
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Terminal Financiera y Recaudos</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Control de Facturación y Gestión de Cartera</p>
            </div>
          </div>
          <div className="rounded-[2.5rem] bg-white shadow-xl border border-slate-50 p-8 sm:p-10">
            <OVFinancialPanel ov={ov} pagos={pagosData} />
          </div>
        </section>

        {/* Dispatch Action Area */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 px-4">
            <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200" />
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Terminal de Despacho y Logística</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Identificación de Bines y Gestión de Salidas</p>
            </div>
          </div>
          <div className="rounded-[2.5rem] bg-white shadow-xl border border-slate-50 p-8 sm:p-10">
            <OVDespachos 
              ovId={id} 
              despachos={despachos} 
              binesDisponibles={bines} 
              detallesOV={detalles} 
              estado={ov.estado}
            />
          </div>
        </section>

      </div>
    </div>
  )
}

function MetricStripe({ icon, label, value, subValue }: any) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col justify-center shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-sm font-black text-slate-900 leading-none">{value}</span>
        <span className="text-[8px] font-bold text-slate-400 truncate">{subValue}</span>
      </div>
    </div>
  )
}
