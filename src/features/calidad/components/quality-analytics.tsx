'use client'

import { useState, useEffect } from 'react'
import { Trophy, TrendingDown, AlertCircle, CheckCircle2, Factory, Package } from 'lucide-react'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { getParetoDefectos, getRankingTalleres } from '../services/calidad-actions'
import { getTallerData } from '@/features/talleres/services/taller-actions'
import { WorkshopPortal } from '@/features/talleres/components/workshop-portal'
import { ChevronLeft, ChevronDown, ChevronRight } from 'lucide-react'

export function QualityAnalytics() {
  const [pareto, setPareto] = useState<any[]>([])
  const [ranking, setRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTallerId, setSelectedTallerId] = useState<string | null>(null)
  const [tallerData, setTallerData] = useState<any>(null)
  const [loadingTaller, setLoadingTaller] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  useEffect(() => {
    async function load() {
      const [p, r] = await Promise.all([
        getParetoDefectos(),
        getRankingTalleres()
      ])
      setPareto(p)
      setRanking(r)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedTallerId) {
      setLoadingTaller(true)
      getTallerData(selectedTallerId).then(data => {
        setTallerData(data)
        setLoadingTaller(false)
      })
    } else {
      setTallerData(null)
    }
  }, [selectedTallerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    )
  }

  const topDefecto = pareto[0]
  const topTaller = ranking[0]

  if (selectedTallerId && tallerData) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedTallerId(null)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Ranking
        </button>
        {loadingTaller ? (
          <div className="flex items-center justify-center h-64">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
          </div>
        ) : (
          <WorkshopPortal data={tallerData} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Cards KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-slate-300 transition-all">
          <div className="w-16 h-16 rounded-[24px] bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 group-hover:scale-110 transition-transform">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taller Líder</p>
            <p className="text-xl font-black text-slate-900 uppercase tracking-tighter mt-1">{topTaller?.nombre || 'N/A'}</p>
            <p className="text-xs font-bold text-emerald-600 mt-1">{topTaller?.score || 0}% de Confianza</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-slate-300 transition-all">
          <div className="w-16 h-16 rounded-[24px] bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Defecto Principal</p>
            <p className="text-xl font-black text-slate-900 uppercase tracking-tighter mt-1">{topDefecto?.descripcion || 'Ninguno'}</p>
            <p className="text-xs font-bold text-rose-600 mt-1">{topDefecto?.total || 0} Incidencias Mes</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:border-slate-300 transition-all">
          <div className="w-16 h-16 rounded-[24px] bg-slate-900 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-xl">
            <Factory className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Talleres Medidos</p>
            <p className="text-xl font-black text-slate-900 uppercase tracking-tighter mt-1">{ranking.length} Activos</p>
            <p className="text-xs font-bold text-slate-500 mt-1">Monitoreo de Calidad</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pareto de Defectos */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Pareto por Producto</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Concentración de defectos por tipo de prenda</p>
            </div>
            <Package className="w-6 h-6 text-slate-300" />
          </div>

          <div className="space-y-4">
            {pareto.slice(0, 8).map((item, idx) => {
              const isExpanded = expandedCategories.has(item.descripcion)
              const max = pareto[0].total
              const pct = (item.total / max) * 100
              
              // Sort subcategories by count
              const subItems = Object.entries(item.subcategories || {})
                .map(([name, info]: [string, any]) => ({ 
                  name, 
                  count: info.count, 
                  gravedad: info.gravedad, 
                  cat: info.categoriaDefecto 
                }))
                .sort((a, b) => b.count - a.count)

              return (
                <div key={idx} className="bg-slate-50/50 rounded-[32px] p-2 transition-all hover:bg-slate-50">
                  <button 
                    onClick={() => toggleCategory(item.descripcion)}
                    className="w-full text-left p-4 rounded-[24px] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                          isExpanded ? "bg-slate-900 text-white rotate-180" : "bg-white text-slate-400 border border-slate-100"
                        )}>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 block">{item.descripcion}</span>
                          <span className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              Principal:
                            </span>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter px-2 py-0.5 bg-white border border-slate-100 rounded-md shadow-sm">
                              {item.topCategory}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-black text-slate-900 block">{item.total} uds</span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Impacto {Math.round(pct)}%</span>
                      </div>
                    </div>
                    
                    <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className="h-full bg-slate-900 rounded-full transition-all duration-1000 shadow-sm" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </button>

                  {/* Sub-lista expandible */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="h-px bg-slate-100 w-full mb-4" />
                      {subItems.map((sub, sIdx) => {
                        const subPct = (sub.count / item.total) * 100
                        const isCritical = sub.gravedad?.toLowerCase().includes('crit') || sub.gravedad?.toLowerCase().includes('alt')
                        
                        return (
                          <div key={sIdx} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 truncate max-w-[200px]">
                                    {sub.name}
                                  </span>
                                  {isCritical && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[8px] font-black uppercase tracking-widest border border-rose-200">
                                      Crítico
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest border border-slate-200">
                                    {sub.cat}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-black text-slate-900">{sub.count} uds</span>
                            </div>
                            <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  isCritical ? "bg-rose-500" : "bg-slate-300"
                                )}
                                style={{ width: `${subPct}%` }} 
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Ranking de Talleres */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Ranking de Confianza</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Desempeño basado en inspecciones aceptadas</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>

          <div className="space-y-4">
            {ranking.map((taller, idx) => (
              <button 
                key={taller.taller_id} 
                onClick={() => setSelectedTallerId(taller.taller_id)}
                className="w-full flex items-center justify-between p-5 rounded-3xl border border-slate-50 hover:border-slate-900 hover:bg-slate-900 transition-all group text-left"
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border transition-colors",
                    idx === 0 ? "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-500 group-hover:text-white" : "bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-slate-800 group-hover:text-white"
                  )}>
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-white transition-colors">
                      {taller.nombre}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 group-hover:text-slate-300">
                      {taller.totalInspeccionado} uds inspeccionadas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900 tabular-nums group-hover:text-white transition-colors">{taller.score}%</p>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-tighter transition-colors",
                    parseFloat(taller.defectRate) < 2 ? "text-emerald-600 group-hover:text-emerald-400" : "text-rose-500 group-hover:text-rose-400"
                  )}>
                    {taller.defectRate}% error
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
