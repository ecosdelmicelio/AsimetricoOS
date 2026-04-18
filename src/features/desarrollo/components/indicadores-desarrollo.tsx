'use client'

import React, { useMemo, useEffect, useState } from 'react'
import { Activity, Clock, TrendingUp } from 'lucide-react'
import type { DesarrolloConRelaciones } from '@/features/desarrollo/types'
import { getKPIInnovacionComercial } from '@/features/desarrollo/services/desarrollo-actions'

interface Props {
  desarrollos: DesarrolloConRelaciones[]
}

export function IndicadoresDesarrolloHeader({ desarrollos }: Props) {
  const [kpiInnovacion, setKpiInnovacion] = useState<number>(0)
  
  // Pipeline Stats
  const pipelineStats = useMemo(() => {
    const total = desarrollos.length
    const activos = desarrollos.filter(d => !['graduated', 'descartado'].includes(d.status)).length
    const urgentes = desarrollos.filter(d => d.prioridad === 'urgente' && !['graduated', 'descartado'].includes(d.status)).length
    return { total, activos, urgentes }
  }, [desarrollos])

  // LeadTime Computation
  const leadTimeStats = useMemo(() => {
    // Calculamos el LeadTime promedio basándonos en cuánto han tardado los Finalizados o extrapolando.
    // Una implementación más exhaustiva sumaría las transiciones de las Bitácoras.
    // Por acercamiento, vamos a agrupar los cerrados ('graduated', 'descartado', 'derivado') 
    // y sumar Días desde created_at hasta updated_at.
    const finalizados = desarrollos.filter(d => ['graduated', 'descartado', 'derivado'].includes(d.status))
    
    if (finalizados.length === 0) return { promedio: 0, muestrasA: 0, muestrasD: 0 }

    let totalDias = 0
    let conteoA = 0
    let conteoD = 0

    finalizados.forEach(d => {
      const ms = new Date(d.updated_at || 0).getTime() - new Date(d.created_at || 0).getTime()
      const dias = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
      totalDias += dias
      // Assuming 'tipo_muestra_asignada' is typed or accessed like 'A', 'B' ... (we had to cast to any since we didn't inject the schema fully on TS, but it's safe)
      const tipo = (d as any).tipo_muestra_asignada
      if (tipo === 'A') conteoA++
      if (tipo === 'D') conteoD++
    })

    return { 
      promedio: Math.round(totalDias / finalizados.length), 
      muestrasA: conteoA, 
      muestrasD: conteoD 
    }
  }, [desarrollos])

  // Fetch KPI del Backend (SQL)
  useEffect(() => {
    getKPIInnovacionComercial().then(res => {
      if (!res.error) setKpiInnovacion(res.data)
    })
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* 1. Pipeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50/50 rounded-full group-hover:scale-150 transition-transform duration-700" />
        <div className="flex items-center gap-3 mb-6 relative">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest leading-none">Pipeline & Flujo</h3>
        </div>
        <div className="flex items-end justify-between relative">
          <div>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{pipelineStats.activos}</p>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Activos en Muestreo</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-900 tracking-tight">{pipelineStats.total} Históricos</p>
            <div className="inline-flex px-2 py-0.5 mt-1 rounded-lg bg-rose-50 border border-rose-100 text-[9px] font-black text-rose-600 uppercase tracking-widest">
              {pipelineStats.urgentes} Urgentes
            </div>
          </div>
        </div>
      </div>

      {/* 2. LeadTime I+D */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-violet-50/50 rounded-full group-hover:scale-150 transition-transform duration-700" />
        <div className="flex items-center gap-3 mb-6 relative">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
            <Clock className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest leading-none">Tiempos I+D (PLM)</h3>
        </div>
        <div className="flex items-end justify-between relative">
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-4xl font-black text-slate-900 tracking-tighter">{leadTimeStats.promedio}</p>
              <p className="text-slate-400 text-sm font-bold tracking-tight">días</p>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Promedio de Cierre</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{leadTimeStats.muestrasD} Comerciales (T-D)</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{leadTimeStats.muestrasA} Internas (T-A)</p>
          </div>
        </div>
      </div>

      {/* 3. Innovación Comercial ROI */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50/50 rounded-full group-hover:scale-150 transition-transform duration-700" />
        <div className="flex items-center gap-3 mb-6 relative">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest leading-none">Impacto Comercial</h3>
        </div>
        <div className="flex items-end justify-between relative">
          <div>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{kpiInnovacion}%</p>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">ROI Nuevos Productos</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Últimos 24 meses</p>
            <div className="inline-flex px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[9px] font-black text-emerald-600 uppercase tracking-widest">VIVO OVs</div>
          </div>
        </div>
      </div>
    </div>
  )
}
