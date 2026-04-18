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
      const ms = new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 1. Pipeline */}
      <div className="bg-neu-base rounded-2xl shadow-neu p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-foreground text-body-sm">Pipeline & Flujo</h3>
        </div>
        <div className="flex items-end justify-between mt-4">
          <div>
            <p className="text-display-sm font-bold text-foreground">{pipelineStats.activos}</p>
            <p className="text-muted-foreground text-xs font-medium">Activos en Muestreo</p>
          </div>
          <div className="text-right">
            <p className="text-body-sm font-semibold text-foreground">{pipelineStats.total} Históricos</p>
            <p className="text-xs text-red-600 font-bold">{pipelineStats.urgentes} Urgentes</p>
          </div>
        </div>
      </div>

      {/* 2. LeadTime I+D */}
      <div className="bg-neu-base rounded-2xl shadow-neu p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-foreground text-body-sm">Tiempos Muestreo (I+D)</h3>
        </div>
        <div className="flex items-end justify-between mt-4">
          <div>
            <p className="text-display-sm font-bold text-foreground">{leadTimeStats.promedio} <span className="text-body-sm text-muted-foreground font-normal">días</span></p>
            <p className="text-muted-foreground text-xs font-medium">Promedio Global (Recientes)</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground mb-1">{leadTimeStats.muestrasD} Comerciales (Tipo D)</p>
            <p className="text-xs font-semibold text-muted-foreground">{leadTimeStats.muestrasA} Internas (Tipo A)</p>
          </div>
        </div>
      </div>

      {/* 3. Innovación Comercial ROI */}
      <div className="bg-neu-base rounded-2xl shadow-neu p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-green-100 text-green-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-foreground text-body-sm">Retorno de Innovación (ROI)</h3>
        </div>
        <div className="flex items-end justify-between mt-4">
          <div>
            {/* The format should be x.x% */}
            <p className="text-display-sm font-bold text-foreground">{kpiInnovacion}%</p>
            <p className="text-muted-foreground text-xs font-medium">% Ventas sobre Nvos Productos</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Últimos 24 meses</p>
            <p className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full inline-block">VIVO OVs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
