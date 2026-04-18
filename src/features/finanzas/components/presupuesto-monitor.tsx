'use client'

import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react'

interface ConsolidadoArea {
  area: string
  presupuestado: number
  real: number
  diferencia: number
  porcentaje: number
}

interface Props {
  data: ConsolidadoArea[]
}

export function PresupuestoMonitor({ data }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map(item => {
          const isOver = item.porcentaje > 100
          const isHealthy = item.porcentaje < 80

          return (
            <div key={item.area} className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.area}</span>
                {isOver ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : (
                  <Target className="w-4 h-4 text-primary-500" />
                )}
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <p className="text-title-sm font-bold text-foreground">${item.real.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">de ${item.presupuestado.toLocaleString()}</p>
                </div>
                
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      item.porcentaje > 100 ? 'bg-red-500' : 
                      item.porcentaje > 85 ? 'bg-amber-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min(item.porcentaje, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 text-[10px] font-bold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                  {isOver ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {item.porcentaje.toFixed(1)}%
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">del presupuesto total</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla Detallada */}
      <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Área</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Presupuestado</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Real</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Ejecución</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Desviación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map(item => (
              <tr key={item.area} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-foreground text-body-sm">{item.area}</td>
                <td className="px-6 py-4 text-right text-muted-foreground text-body-sm">${item.presupuestado.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-bold text-foreground text-body-sm">${item.real.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black ${
                    item.porcentaje > 100 ? 'bg-red-100 text-red-700' : 
                    item.porcentaje > 85 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {item.porcentaje.toFixed(1)}%
                  </span>
                </td>
                <td className={`px-6 py-4 text-right font-bold text-body-sm ${item.diferencia < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ${item.diferencia.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
