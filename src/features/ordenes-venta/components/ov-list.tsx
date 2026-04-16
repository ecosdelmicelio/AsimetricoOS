import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import { getOrdenesVenta, getOVDashboardStats } from '@/features/ordenes-venta/services/ov-actions'
import { OVDashboardStats } from './ov-dashboard-stats'
import { PageHeader } from '@/shared/components/page-header'
import { OVFilters } from './ov-filters'
import { OVCard } from './ov-card'
import type { OrdenVenta } from '@/features/ordenes-venta/types'

type OVListItem = OrdenVenta & {
  terceros: { nombre: string } | null
  ov_detalle: { producto_id: string; talla: string; cantidad: number; precio_pactado: number }[]
  ordenes_produccion: {
    id: string
    codigo: string
    estado: string
    op_detalle: { producto_id: string; talla: string; cantidad_asignada: number }[]
  }[]
  despachos: {
    id: string
    estado: string
    despacho_detalle: { producto_id: string; talla: string; cantidad: number }[]
  }[]
}

interface Props {
  filters?: {
    estado?: string
    desde?: string
    hasta?: string
  }
}

// Derive smart display status from fulfillment data
function deriveStatus(ov: OVListItem, despachadas: number, producidas: number, total: number): string {
  if (ov.estado === 'cancelada') return 'cancelada'
  if (ov.estado === 'entregada') return 'entregada'

  // 1. Process 100% finished (Dispatched total units)
  if (total > 0 && despachadas >= total) return 'completada'

  // 2. Some (but not all) units dispatched
  if (despachadas > 0) return 'despachada'

  // 3. Production finished but no units dispatched yet
  if (total > 0 && producidas >= total) return 'terminada'
  
  // 4. Production in progress
  if (producidas > 0) return 'en_produccion'
  
  return ov.estado
}

export async function OVList({ filters }: Props) {
  const [result, stats] = await Promise.all([
    getOrdenesVenta({
      estado: filters?.estado,
      fechaInicio: filters?.desde,
      fechaFin: filters?.hasta,
    }),
    getOVDashboardStats()
  ])

  const ovs = result.data as OVListItem[]
  const now = new Date()

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Órdenes de Venta"
        subtitle={`${ovs.length} órdenes en seguimiento`}
        icon={ClipboardList}
      />

      {/* Dashboard Stats */}
      <OVDashboardStats stats={stats} />

      {/* Compact top bar: Filters + Nueva OV */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <OVFilters />
        </div>
        <Link
          href="/ordenes-venta/nueva"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 transition-all shadow-sm shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva OV
        </Link>
      </div>

      {/* Empty state */}
      {ovs.length === 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
            <ClipboardList className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-600 font-black text-sm">No hay órdenes de venta</p>
          <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-wider">
            Crea tu primera OV para comenzar el flujo de producción
          </p>
          <Link
            href="/ordenes-venta/nueva"
            className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear primera OV
          </Link>
        </div>
      )}

      {/* Kanban Board for OV */}
      {ovs.length > 0 && (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6 mt-4">
          {[
            { id: 'comercial', title: 'Por Iniciar', color: 'bg-slate-400', states: ['borrador', 'confirmada'] },
            { id: 'produccion', title: 'En Producción', color: 'bg-amber-400', states: ['en_produccion', 'terminada'] },
            { id: 'logistica', title: 'En Logística', color: 'bg-indigo-500', states: ['despachada'] },
            { id: 'finalizado', title: 'Finalizadas', color: 'bg-emerald-500', states: ['completada', 'entregada', 'cancelada'] }
          ].map(col => {
            // Process the items for this column
            const items = ovs.map(ov => {
              const totalUnidades = ov.ov_detalle.reduce((s, d) => s + d.cantidad, 0)
              const totalValor = ov.ov_detalle.reduce((s, d) => s + d.cantidad * d.precio_pactado, 0)

              const daysSinceConfirm = (ov.estado !== 'borrador' && ov.created_at)
                ? Math.max(0, Math.ceil((now.getTime() - new Date(ov.created_at).getTime()) / (1000 * 3600 * 24)))
                : undefined
              
              const fechaConfirmacion = ov.estado !== 'borrador' ? ov.created_at || undefined : undefined

              const PROD_DONE_STATES = ['terminado', 'completada', 'entregada', 'liquidada']
              const unidadesProducidas = ov.ordenes_produccion
                .filter(op => PROD_DONE_STATES.includes(op.estado))
                .reduce((s, op) => s + op.op_detalle.reduce((ss, d) => ss + d.cantidad_asignada, 0), 0)

              const unidadesDespachadas = ov.despachos?.reduce(
                (sum, desp) => sum + (desp.despacho_detalle?.reduce((s, d) => s + d.cantidad, 0) || 0),
                0
              ) || 0

              const displayStatus = deriveStatus(ov, unidadesDespachadas, unidadesProducidas, totalUnidades)

              return {
                ov, displayStatus, totalUnidades, totalValor, 
                unidadesProducidas, unidadesDespachadas, daysSinceConfirm, 
                fechaConfirmacion
              }
            }).filter(item => col.states.includes(item.displayStatus))

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
                  {items.map(({ ov, displayStatus, totalUnidades, totalValor, unidadesProducidas, unidadesDespachadas, daysSinceConfirm, fechaConfirmacion }) => {
                    const ops = ov.ordenes_produccion.map(op => ({
                      id: op.id,
                      codigo: op.codigo,
                      estado: op.estado,
                      unidades: op.op_detalle.reduce((s, d) => s + d.cantidad_asignada, 0),
                    }))

                    return (
                      <OVCard
                        key={ov.id}
                        id={ov.id}
                        codigo={ov.codigo}
                        clienteNombre={ov.terceros?.nombre ?? 'Cliente no definido'}
                        estado={ov.estado}
                        displayStatus={displayStatus}
                        totalUnidades={totalUnidades}
                        totalValor={totalValor}
                        unidadesProducidas={unidadesProducidas}
                        unidadesDespachadas={unidadesDespachadas}
                        daysSinceConfirm={daysSinceConfirm}
                        fechaConfirmacion={fechaConfirmacion}
                        ops={ops}
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
