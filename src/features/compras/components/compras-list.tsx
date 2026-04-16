import Link from 'next/link'
import { ShoppingCart, Plus, ChevronRight } from 'lucide-react'
import { getOrdenesCompra } from '@/features/compras/services/compras-actions'
import { OCDocBadge, OCGreigeBadge } from './oc-status-badge'
import { PageHeader } from '@/shared/components/page-header'
import { formatDate } from '@/shared/lib/utils'

export async function ComprasList() {
  const ocs = await getOrdenesCompra()

  // Agrupamiento Kanban
  const cols = [
    {
      id: 'CREADA',
      title: 'Creada / Pendiente',
      states: ['na', 'pendiente_afidavit'],
      color: 'bg-slate-200'
    },
    {
      id: 'TRANSITO',
      title: 'En Tránsito (Afidávit)',
      states: ['cargado'],
      color: 'bg-amber-100 ring-amber-400'
    },
    {
      id: 'RECEPCION',
      title: 'Recepción WMS',
      states: ['en_proceso'],
      color: 'bg-primary-100 ring-primary-500'
    },
    {
      id: 'FINALIZADA',
      title: 'Finalizada',
      states: ['completada', 'finalizada'],
      color: 'bg-emerald-100 ring-emerald-500'
    }
  ]

  const getColItems = (states: string[]) => ocs.filter(oc => states.includes(oc.estado_documental))

  // 1. Cálculos Gerenciales (Metricas de Dashboard)
  const formatMoney = (val: number) => `$${val.toLocaleString()}`
  
  let totalValueAll = 0
  let totalMP = 0
  let totalPT = 0
  let totalPendingWMS = 0 // Órdenes En Tránsito y En Recepción
  
  ocs.forEach(oc => {
    const isPT = oc.tipo === 'producto_terminado'
    const detalles = isPT ? (oc.oc_detalle || []) : (oc.oc_detalle_mp || [])
    const ocTotal = detalles.reduce((sum, d: any) => sum + (d.cantidad * (d.precio_pactado || d.precio_unitario || 0)), 0)
    
    totalValueAll += ocTotal
    if (isPT) totalPT += ocTotal
    else totalMP += ocTotal
    
    if (['cargado', 'en_proceso'].includes(oc.estado_documental)) {
      totalPendingWMS += ocTotal
    }
  })

  return (
    <div className="space-y-8 flex flex-col h-full min-h-[85vh]">
      <PageHeader
        title="Terminal de Compras"
        subtitle={`Kanban de ${ocs.length} órdenes`}
        icon={ShoppingCart}
        action={{
          label: "Nueva OC",
          href: "/compras/nueva",
          icon: Plus
        }}
      />

      {/* Tarjetas Gerenciales (KPIs) */}
      {ocs.length > 0 && (
        <div className="grid grid-cols-4 gap-6 shrink-0">
          <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 relative z-10">Valor Comprometido Total</span>
            <span className="text-2xl font-black text-slate-800 tracking-tighter relative z-10">{formatMoney(totalValueAll)}</span>
          </div>
          
          <div className="bg-white rounded-[24px] p-5 border border-emerald-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 relative z-10">Inversión Mat. Prima (MP)</span>
            <span className="text-2xl font-black text-emerald-950 tracking-tighter relative z-10">{formatMoney(totalMP)}</span>
          </div>

          <div className="bg-white rounded-[24px] p-5 border border-indigo-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 relative z-10">Inversión Terminado (PT)</span>
            <span className="text-2xl font-black text-indigo-950 tracking-tighter relative z-10">{formatMoney(totalPT)}</span>
          </div>

          <div className="bg-white rounded-[24px] p-5 border border-amber-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 relative z-10">Compromiso por Recibir</span>
            <span className="text-2xl font-black text-amber-950 tracking-tighter relative z-10">{formatMoney(totalPendingWMS)}</span>
          </div>
        </div>
      )}

      {ocs.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-black text-xl">Tablero Vacío</p>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            Tus órdenes fluirán por este tablero. Comienza registrando la primera a tu proveedor.
          </p>
          <Link
            href="/compras/nueva"
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-600 text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary-500/30"
          >
            <Plus className="w-4 h-4" />
            Crear primera OC
          </Link>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-4 gap-6 pb-6">
          {cols.map(col => {
            const items = getColItems(col.states)
            return (
              <div key={col.id} className="flex flex-col bg-slate-50/50 rounded-[32px] border border-slate-200/60 shadow-sm min-w-0">
                {/* Header de la columna */}
                <div className="p-5 flex items-center justify-between border-b border-slate-200/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full shadow-inner shrink-0 ${col.color}`} />
                    <h3 className="font-black text-slate-700 text-sm tracking-tight truncate">{col.title}</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-xl shrink-0">
                    {items.length}
                  </span>
                </div>

                {/* Lista de Tarjetas */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar h-[60vh]">
                  {items.map(oc => {
                    const isPT = oc.tipo === 'producto_terminado'
                    const detalles = isPT ? (oc.oc_detalle || []) : (oc.oc_detalle_mp || [])
                    
                    // Calcular Total
                    const totalValue = detalles.reduce((sum, d: any) => sum + (d.cantidad * (d.precio_pactado || d.precio_unitario || 0)), 0)
                    
                    // Preview de Items (Máximo 2)
                    const previewStr = detalles.slice(0, 2).map((d: any) => {
                      if (isPT) return d.productos?.nombre || 'Producto'
                      return d.materiales?.nombre || 'Material'
                    }).join(' + ') + (detalles.length > 2 ? '...' : '')
                    
                    return (
                    <Link
                      key={oc.id}
                      href={`/compras/${oc.id}`}
                      className="block group rounded-3xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                    >
                      {/* Glow de muestra si aplica */}
                      {(oc as unknown as { es_muestra?: boolean }).es_muestra && (
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                      )}

                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <span className="font-black text-slate-800 text-lg tracking-tighter group-hover:text-primary-600 transition-colors truncate block">{oc.codigo}</span>
                            <p className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider truncate">
                              {oc.terceros?.nombre ?? 'Sin proveedor'}
                            </p>
                          </div>
                          
                          <span className={`text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest shrink-0 ${isPT ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                            {isPT ? 'PT' : 'MP'}
                          </span>
                        </div>

                        {/* Preview y Valor */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col gap-2">
                           <p className="text-[10px] font-bold text-slate-500 uppercase leading-snug line-clamp-2">
                             {previewStr || 'Sin ítems cargados'}
                           </p>
                           <span className="text-sm font-black text-slate-800">${totalValue.toLocaleString()}</span>
                        </div>

                        {/* Footer Card */}
                        <div className="mt-1 pt-3 flex items-center justify-between border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <OCGreigeBadge estado={oc.estado_greige} />
                          </div>
                          <div className="flex gap-1 items-center bg-slate-100 px-2 py-1 rounded-lg">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ENT: {formatDate(oc.fecha_entrega_est).substring(0,5)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                    )
                  })}
                  
                  {items.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Sin Órdenes
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
