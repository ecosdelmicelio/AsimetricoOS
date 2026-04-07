'use client'

import { Package, CheckCircle2, Scissors, Info } from 'lucide-react'
import { sortTallas, cn } from '@/shared/lib/utils'
import type { OPProgressLine } from '../types'

interface Props {
  lines: OPProgressLine[]
  opEstado?: string
}

export function OPProgressMatrix({ lines, opEstado }: Props) {
  // Agrupar por referencia + color
  const grouped = lines.reduce<Record<string, OPProgressLine[]>>((acc, line) => {
    const key = `${line.referencia}-${line.color || 'no-color'}`
    if (!acc[key]) acc[key] = []
    acc[key].push(line)
    return acc
  }, {})

  const allTallas = sortTallas([...new Set(lines.map(l => l.talla))])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] uppercase font-bold tracking-tighter">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-300" /> Programado
          </div>
          <div className="flex items-center gap-1.5 text-blue-500">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Cortado
          </div>
          <div className="flex items-center gap-1.5 text-amber-500">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Confección
          </div>
          <div className="flex items-center gap-1.5 text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Entregado
          </div>
        </div>
      </div>

      <div className="rounded-[1.25rem] bg-slate-50/50 overflow-hidden border border-slate-100 shadow-inner">
        <table className="w-full text-[10px] text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-100/30 uppercase text-[8px] font-black tracking-widest text-slate-400">
              <th className="px-3 py-2.5 w-40 min-w-0">Referencia e ID</th>
              <th className="px-3 py-2.5 w-24 border-l border-slate-100 min-w-0">Variante</th>
              {allTallas.map(t => (
                <th key={t} className="text-center px-1.5 py-2.5 min-w-[50px] border-l border-slate-100">{t}</th>
              ))}
              <th className="text-right px-3 py-2.5 border-l border-slate-100 w-24">Estado</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([key, groupLines]) => {
              const first = groupLines[0]
              const totalProgramado = groupLines.reduce((s, l) => s + l.programado, 0)
              const totalEntregado = groupLines.reduce((s, l) => s + l.entregado, 0)
              const isCompleted = totalEntregado >= totalProgramado && totalProgramado > 0

              return (
                <tr key={key} className="border-b border-slate-200/50 last:border-0 hover:bg-white transition-colors group">
                  <td className="px-3 py-2 align-middle">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 leading-none text-[10px] font-mono tracking-tighter truncate">{first.referencia}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase truncate max-w-[100px] mt-0.5">{first.nombre}</span>
                    </div>
                  </td>

                  <td className="px-2 py-2 align-middle border-l border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="w-2.5 h-2.5 rounded-full border border-slate-200 shadow-sm shrink-0" 
                        style={{ backgroundColor: first.color?.toLowerCase() || '#e2e8f0' }} 
                      />
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter truncate max-w-[60px]">
                        {first.color || 'ESTÁNDAR'}
                      </span>
                    </div>
                  </td>
                  
                  {allTallas.map(talla => {
                    const line = groupLines.find(l => l.talla === talla)
                    if (!line) return (
                      <td key={talla} className="px-2 py-3 text-center border-l border-slate-100 text-slate-200">—</td>
                    )
                    
                    const pCortado = line.programado > 0 ? (line.cortado / line.programado) * 100 : 0
                    const pConf = line.programado > 0 ? (line.confeccionado / line.programado) * 100 : 0
                    const pEnt = line.programado > 0 ? (line.entregado / line.programado) * 100 : 0

                    return (
                      <td key={talla} className="px-2 py-2 border-l border-slate-100 transition-colors">
                        <div className="flex flex-col gap-1.5 items-center">
                          <div className="flex items-center gap-1 text-[9px] font-black tracking-tighter leading-none bg-white border border-slate-100 px-1.5 py-0.5 rounded shadow-sm">
                            <span className="text-slate-300">{line.programado}</span>
                            <span className="text-slate-200">/</span>
                            <span className={cn(
                              line.entregado >= line.programado ? "text-emerald-500" : "text-amber-500"
                            )}>
                              {line.entregado}
                            </span>
                          </div>
                          
                          <div className="w-10 h-1.5 bg-slate-200/50 rounded-full overflow-hidden relative shadow-inner">
                            {/* Cortado */}
                            <div 
                              className="absolute left-0 top-0 h-full bg-blue-400 opacity-60 transition-all duration-500" 
                              style={{ width: `${Math.min(100, pCortado)}%` }} 
                            />
                            {/* Confeccionado */}
                            <div 
                              className="absolute left-0 top-0 h-full bg-amber-400 opacity-80 transition-all duration-700 z-10" 
                              style={{ width: `${Math.min(100, pConf)}%` }} 
                            />
                            {/* Entregado */}
                            <div 
                              className="absolute left-0 top-0 h-full bg-emerald-500 transition-all duration-1000 z-20" 
                              style={{ width: `${Math.min(100, pEnt)}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                    )
                  })}

                  <td className="px-3 py-2 text-right border-l border-slate-100 align-middle">
                    {isCompleted ? (
                      <div className="flex items-center justify-end gap-1 text-emerald-600 font-extrabold text-[8px] bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        FIN
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-0">
                        <div className="text-blue-600 font-black text-[9px] tracking-tighter flex items-center gap-1">
                          {Math.round((totalEntregado/totalProgramado)*100)}%
                        </div>
                        <span className="text-[7px] font-bold text-slate-400 leading-none">
                          -{totalProgramado - totalEntregado} UDS
                        </span>
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
