'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, History, TrendingDown, Package, ExternalLink, Timer, DollarSign, Factory } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/shared/lib/utils'
import { getParetoDefectos } from '@/features/calidad/services/calidad-actions'

interface Props {
  data: any
}

export function WorkshopPortal({ data }: Props) {
  const [pareto, setPareto] = useState<any[]>([])
  
  const { taller, inspecciones, ops, stats } = data

  useEffect(() => {
    async function loadPareto() {
      const p = await getParetoDefectos({ taller_id: taller.id })
      setPareto(p)
    }
    loadPareto()
  }, [taller.id])

  const totalSegundas = inspecciones.reduce((acc: number, curr: any) => acc + (curr.cantidad_segundas || 0), 0)
  const totalInspeccionado = inspecciones.reduce((acc: number, curr: any) => acc + (curr.cantidad_inspeccionada || 0), 0)
  const errorRate = totalInspeccionado > 0 ? (totalSegundas / totalInspeccionado) * 100 : 0

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">Bienvenido, {taller.nombre}</p>
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">Portal de Producción</h2>
            <div className="flex gap-12">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Facturación Proyectada</p>
                <p className="text-3xl font-black tracking-tighter text-emerald-400">{formatCurrency(stats.expectedBilling)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Unidades en WIP</p>
                <p className="text-3xl font-black tracking-tighter">{stats.totalWIPUnits.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all border-l-4 border-l-primary-500">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
              <Timer className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-primary-600 bg-primary-50 px-3 py-1 rounded-full">Activo</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Órdenes Pendientes</p>
            <p className="text-3xl font-black text-slate-900 tabular-nums">{stats.pendingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Calidad</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tasa de Error</p>
            <p className={cn(
              "text-3xl font-black tabular-nums",
              errorRate < 2 ? "text-emerald-600" : "text-rose-600"
            )}>{errorRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Secciones de Producción y Calidad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Lista de OPs en Curso */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Producción en Curso</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Monitoreo de órdenes asignadas</p>
            </div>
            <Factory className="w-6 h-6 text-slate-300" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-50">
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Código / Referencia</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Unidades</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Facturación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ops.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                      No hay órdenes pendientes
                    </td>
                  </tr>
                )}
                {ops.map((op: any) => (
                  <tr key={op.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight">OP-{op.codigo}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">
                          {op.productos?.[0]?.producto?.nombre || 'Producto sin nombre'}
                        </span>
                      </div>
                    </td>
                    <td className="py-6">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                        op.estado === 'en_confeccion' ? "bg-blue-50 text-blue-600" :
                        op.estado === 'programada' ? "bg-slate-100 text-slate-600" :
                        op.estado === 'terminada' ? "bg-emerald-50 text-emerald-600" :
                        "bg-slate-50 text-slate-500"
                      )}>
                        {op.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-6 text-right">
                      <span className="text-sm font-black text-slate-900 tabular-nums">{op.total_unidades}</span>
                    </td>
                    <td className="py-6 text-right">
                      <span className="text-sm font-black text-slate-900 tabular-nums text-emerald-600">
                        {formatCurrency(op.valor_proyectado)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: Calidad y Oportunidades */}
        <div className="space-y-10">
          {/* Tus Defectos más comunes */}
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Oportunidades</h3>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>

            <div className="space-y-6">
              {pareto.slice(0, 3).map((item, idx) => {
                const max = pareto[0].total
                const pct = (item.total / max) * 100
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-700">{item.descripcion}</span>
                      <span className="text-rose-600">{item.total}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Historial rápido de inspecciones */}
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Últimas Calidad</h3>
              <History className="w-5 h-5 text-slate-300" />
            </div>
            <div className="space-y-4">
              {inspecciones.slice(0, 3).map((insp: any) => (
                <div key={insp.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    insp.resultado === 'aceptada' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  )}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase">OP {insp.op?.codigo}</p>
                    <p className="text-[10px] font-bold text-slate-400">{formatDate(insp.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
