import Link from 'next/link'
import { Factory, Plus, ChevronRight } from 'lucide-react'
import { getOrdenesProduccion } from '@/features/ordenes-produccion/services/op-actions'
import { OPStatusBadge } from './op-status-badge'
import { formatDate } from '@/shared/lib/utils'
import type { OrdenProduccion } from '@/features/ordenes-produccion/types'
import { OPCard } from './op-card'
import { OPDashboardHeader } from './op-dashboard-header'
import { PageHeader } from '@/shared/components/page-header'

type OPListItem = OrdenProduccion & {
  terceros: { nombre: string } | null
  ordenes_venta: { 
    codigo: string
    terceros: { nombre: string } | null 
  } | null
  op_detalle: { 
    cantidad_asignada: number
    producto_id: string
    productos: { precio_base: number | null } | null 
  }[]
  entregas: { 
    id: string
    estado: string
    fecha_entrega: string
    entrega_detalle: { cantidad_entregada: number }[] 
  }[]
  liquidaciones: { costo_total: number | null } | null
}

export async function OPList() {
  const result = await getOrdenesProduccion()
  const ops = result.data as OPListItem[]

  // --- CÁLCULO DE MÉTRICAS GLOBALES ---
  let totalProgrammedValue = 0
  let totalUnits = 0
  let totalAcceptedUnits = 0
  let totalProcessedInDeliveries = 0
  const uniqueRefsSet = new Set<string>()
  const leadTimes: number[] = []

  // Debug log for production visibility
  console.log(` [OP_LIST] Processing ${ops.length} orders for KPIs`)

  for (const op of ops) {
    const createdDate = new Date(op.created_at || op.fecha_promesa)
    
    // Unidades y Valor Estandar
    if (op.op_detalle && op.op_detalle.length > 0) {
      for (const d of op.op_detalle) {
        const precioBase = d.productos?.precio_base ?? 0
        const subtotal = (d.cantidad_asignada || 0) * precioBase
        
        totalProgrammedValue += subtotal
        totalUnits += (d.cantidad_asignada || 0)
        if (d.producto_id) uniqueRefsSet.add(d.producto_id)
      }
    }

    // Entregas y FPY
    if (op.entregas && op.entregas.length > 0) {
      for (const e of op.entregas) {
        const deliveryDate = new Date(e.fecha_entrega)
        const unitsInDelivery = (e.entrega_detalle || []).reduce((s, d) => s + (d.cantidad_entregada || 0), 0)
        
        totalProcessedInDeliveries += unitsInDelivery
        if (e.estado === 'aceptada') {
          totalAcceptedUnits += unitsInDelivery
        }

        // Logic for lead time
        if (e.fecha_entrega && createdDate) {
          const diffDays = (deliveryDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)
          leadTimes.push(Math.max(0, diffDays))
        }
      }
    }
  }

  const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((s, l) => s + l, 0) / leadTimes.length : 0
  const fpy = totalProcessedInDeliveries > 0 ? (totalAcceptedUnits / totalProcessedInDeliveries) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Terminal de Producción"
        subtitle={`${ops.length} órdenes en curso`}
        icon={Factory}
        action={{
          label: "Nueva OP",
          href: "/ordenes-produccion/nueva",
          icon: Plus
        }}
      />

      {/* Dashboard Metrics */}
      <OPDashboardHeader 
        avgLeadTime={avgLeadTime}
        totalProgrammedValue={totalProgrammedValue}
        fpy={fpy}
        totalUnits={totalUnits}
        uniqueRefs={uniqueRefsSet.size}
      />

      {/* Empty state */}
      {ops.length === 0 && (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-12 flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
            <Factory className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-900 font-black text-sm uppercase tracking-widest">No hay órdenes de producción</p>
          <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-wider max-w-[240px]">
            Crea una OP desde una OV confirmada para iniciar el flujo de taller
          </p>
          <Link
            href="/ordenes-produccion/nueva"
            className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 transition-all"
          >
            <Plus className="w-4 h-4" />
            Crear primera OP
          </Link>
        </div>
      )}

      {/* Kanban Board for OP */}
      {ops.length > 0 && (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6 mt-4">
          {[
            { id: 'planificacion', title: 'Planificación', color: 'bg-slate-400', states: ['borrador', 'confirmada'] },
            { id: 'taller', title: 'En Taller', color: 'bg-amber-400', states: ['en_corte', 'en_confeccion', 'dupro_pendiente', 'en_terminado', 'terminado'] },
            { id: 'logistica', title: 'Logística Interna', color: 'bg-indigo-500', states: ['en_entregas', 'entregada'] },
            { id: 'cierres', title: 'Cierres Operativos', color: 'bg-emerald-500', states: ['completada', 'liquidada', 'cancelada'] }
          ].map(col => {
            // Process items for this column
            const items = ops.filter(op => col.states.includes(op.estado))

            return (
              <div key={col.id} className="flex flex-col bg-slate-50/50 rounded-[32px] border border-slate-200/60 shadow-sm min-w-0">
                {/* Column Header */}
                <div className="p-5 flex items-center justify-between border-b border-slate-200/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full shadow-inner shrink-0 ${col.color.split(' ')[0]}`} />
                    <h3 className="font-black text-slate-700 text-sm tracking-tight truncate">{col.title}</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-xl shrink-0">
                    {items.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar h-[60vh]">
                  {items.map((op) => {
                    const totalUnidades = op.op_detalle.reduce((s, d) => s + d.cantidad_asignada, 0)
                    const unidadesEntregadas = op.entregas.reduce((s, e) => 
                       s + e.entrega_detalle.reduce((sd, d) => sd + d.cantidad_entregada, 0), 0
                    )
                    const valorOrden = op.liquidaciones?.costo_total || 0
                    const costoEstandar = op.op_detalle.reduce((s, d) => s + (d.cantidad_asignada * (d.productos?.precio_base ?? 0)), 0)

                    return (
                      <OPCard
                        key={op.id}
                        id={op.id}
                        codigo={op.codigo}
                        tallerNombre={op.terceros?.nombre ?? 'Taller no definido'}
                        clienteNombre={op.ordenes_venta?.terceros?.nombre ?? 'Cliente no definido'}
                        ovCodigo={op.ordenes_venta?.codigo ?? 'SIN OV'}
                        estado={op.estado}
                        totalUnidades={totalUnidades}
                        unidadesEntregadas={unidadesEntregadas}
                        valorOrden={valorOrden}
                        costoEstandar={costoEstandar}
                        fechaCreacion={op.created_at || new Date().toISOString()}
                        opPayload={op}
                      />
                    )
                  })}

                  {items.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200/60 rounded-3xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Vacío
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
