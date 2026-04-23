'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, History, TrendingUp, Package, ExternalLink } from 'lucide-react'
import { cn, formatDate } from '@/shared/lib/utils'
import { getParetoDefectos } from '@/features/calidad/services/calidad-actions'

interface Props {
  data: any
}

export function WorkshopPortal({ data }: Props) {
  const [pareto, setPareto] = useState<any[]>([])
  
  const { taller, inspecciones, ops } = data

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
            <TrendingUp className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">Bienvenido al Portal</p>
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">{taller.nombre}</h2>
            <div className="flex gap-12">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Confianza</p>
                <p className="text-3xl font-black tracking-tighter">{Math.round(100 - (errorRate * 5))}%</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Error Promedio</p>
                <p className={cn(
                  "text-3xl font-black tracking-tighter",
                  errorRate < 2 ? "text-emerald-400" : "text-rose-400"
                )}>{errorRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Alerta</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidades Segundas</p>
            <p className="text-3xl font-black text-slate-900 tabular-nums">{totalSegundas}</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">OK</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entregas Mes</p>
            <p className="text-3xl font-black text-slate-900 tabular-nums">{inspecciones.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Historial de Inspecciones */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Reportes de Calidad</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Resultados de las últimas inspecciones</p>
            </div>
            <History className="w-6 h-6 text-slate-300" />
          </div>

          <div className="space-y-4">
            {inspecciones.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay inspecciones recientes</p>
              </div>
            )}
            {inspecciones.map((insp: any) => (
              <div key={insp.id} className="flex items-center justify-between p-6 rounded-3xl border border-slate-50 hover:border-slate-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border",
                    insp.resultado === 'aceptada' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                  )}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">OP {insp.op?.codigo}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatDate(insp.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">-{insp.cantidad_segundas || 0} seg</p>
                  <button className="text-[10px] font-black uppercase text-primary-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                    Ver Reporte <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tus Defectos más comunes */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Tus Oportunidades</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Fallas frecuentes detectadas en planta</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>

          <div className="space-y-8">
            {pareto.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sin defectos registrados</p>
              </div>
            )}
            {pareto.slice(0, 5).map((item, idx) => {
              const max = pareto[0].total
              const pct = (item.total / max) * 100
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-slate-700">{item.descripcion}</span>
                    <span className="text-rose-600">{item.total} incidentes</span>
                  </div>
                  <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-1000 shadow-sm" 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="mt-12 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3">Consejo del Inspector</p>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              "Hemos detectado un incremento en {pareto[0]?.descripcion || 'defectos menores'}. Por favor revisa el ajuste de las máquinas de coser en la línea de producción para reducir el desperdicio."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
