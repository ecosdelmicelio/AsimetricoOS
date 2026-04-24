'use client'

import { Factory, Calendar, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface Props {
  data: any[]
}

export function CapacidadMaestra({ data }: Props) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.map((taller) => (
          <div key={taller.taller_id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Factory className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Capacidad Diaria</p>
                <p className="text-xl font-black text-slate-900">{taller.capacidad_diaria} <span className="text-[10px] text-slate-400">unds</span></p>
              </div>
            </div>

            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-1 truncate">{taller.nombre}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Carga Total: {taller.totalWIP.toLocaleString()} unds</p>

            <div className="space-y-6">
              {taller.semanas.map((sem: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                    <span className="text-slate-400">{sem.semana}</span>
                    <span className={cn(
                      sem.pct > 100 ? "text-rose-500" : 
                      sem.pct > 80 ? "text-amber-500" : "text-emerald-500"
                    )}>
                      {sem.carga.toLocaleString()} / {sem.capacidad.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        sem.pct > 100 ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" : 
                        sem.pct > 80 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(sem.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {taller.semanas.some((s: any) => s.pct > 100) && (
              <div className="mt-8 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <p className="text-[10px] font-bold text-rose-700 leading-tight">SOBRECAPACIDAD DETECTADA EN PRÓXIMAS SEMANAS</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
