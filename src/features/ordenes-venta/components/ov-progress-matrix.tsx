'use client'

import { Package, Truck, Factory, AlertCircle } from 'lucide-react'
import { sortTallas, cn } from '@/shared/lib/utils'
import type { OVProgressLine } from '../types'

interface Props {
  lines: OVProgressLine[]
}

export function OVProgressMatrix({ lines }: Props) {
  // Grp por referencia + color
  const grouped = lines.reduce<Record<string, OVProgressLine[]>>((acc, line) => {
    const key = `${line.referencia}-${line.color || 'no-color'}`
    if (!acc[key]) acc[key] = []
    acc[key].push(line)
    return acc
  }, {})

  const allTallas = sortTallas([...new Set(lines.map(l => l.talla))])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-body-md font-bold text-foreground flex items-center gap-2">
          Matriz de Cumplimiento Logístico
        </h3>
        <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-tighter">
          <div className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-slate-300" /> Pedido</div>
          <div className="flex items-center gap-1.5 text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-400" /> Producido</div>
          <div className="flex items-center gap-1.5 text-primary-500"><span className="w-2 h-2 rounded-full bg-primary-500" /> Despachado</div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50/50 overflow-hidden border border-slate-100 overflow-x-auto shadow-inner">
        <table className="w-full text-[10px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-100/30 uppercase text-[9px] font-black tracking-widest text-slate-400">
              <th className="px-3 py-2 w-40 min-w-[120px]">Referencia</th>
              <th className="px-3 py-2 w-32 border-l border-slate-100">Color</th>
              {allTallas.map(t => (
                <th key={t} className="text-center px-1 py-2 min-w-[50px] border-l border-slate-100">{t}</th>
              ))}
              <th className="text-right px-3 py-2 border-l border-slate-100 w-24">Balance</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([key, groupLines]) => {
              const first = groupLines[0]
              const totalPedido = groupLines.reduce((s, l) => s + l.pedido, 0)
              const totalDespachado = groupLines.reduce((s, l) => s + l.despachado, 0)
              const isCompleted = totalDespachado >= totalPedido && totalPedido > 0

              return (
                <tr key={key} className="border-b border-black/5 hover:bg-white/40 transition-colors group">
                  <td className="px-3 py-1.5 align-middle">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 leading-tight text-[11px] font-mono">{first.referencia}</span>
                      <span className="text-[9px] text-slate-400 font-medium truncate max-w-[120px]">{first.nombre}</span>
                    </div>
                  </td>

                  <td className="px-3 py-1.5 align-middle border-l border-slate-100">
                    {first.color ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: '#ccc' }} />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{first.color}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-300">N/A</span>
                    )}
                  </td>
                  
                  {allTallas.map(talla => {
                    const line = groupLines.find(l => l.talla === talla)
                    if (!line) return <td key={talla} className="px-2 py-3 text-center border-l border-black/5 text-slate-300">—</td>
                    
                    const pProd = line.pedido > 0 ? (line.producido / line.pedido) * 100 : 0
                    const pDesp = line.pedido > 0 ? (line.despachado / line.pedido) * 100 : 0

                    return (
                      <td key={talla} className="px-1 py-1.5 border-l border-slate-100 transition-colors">
                        <div className="flex flex-col gap-0.5 items-center">
                          <div className="flex items-center gap-1 text-[10px] font-black tracking-tight leading-none">
                            <span className="text-slate-300">{line.pedido}</span>
                            <span className="text-slate-100">·</span>
                            <span className={cn(line.despachado >= line.pedido ? "text-emerald-500" : "text-primary-600")}>
                              {line.despachado}
                            </span>
                          </div>
                          
                          <div className="w-8 h-1 bg-slate-100 rounded-full overflow-hidden relative">
                            <div 
                              className="absolute left-0 top-0 h-full bg-amber-300 transition-all" 
                              style={{ width: `${Math.min(100, pProd)}%` }} 
                            />
                            <div 
                              className="absolute left-0 top-0 h-full bg-primary-500 transition-all z-10" 
                              style={{ width: `${Math.min(100, pDesp)}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                    )
                  })}

                  <td className="px-4 py-3 text-right border-l border-black/5 align-middle">
                    {isCompleted ? (
                      <div className="flex items-center justify-end gap-1.5 text-emerald-600 font-bold text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        COMPLETA
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-primary-600 font-bold text-[10px]">PENDIENTE</span>
                        <span className="text-[10px] text-muted-foreground">{totalPedido - totalDespachado} uds</span>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
