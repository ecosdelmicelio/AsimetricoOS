'use client'

import { useState } from 'react'
import { AlertTriangle, TrendingDown, TrendingUp, Calendar } from 'lucide-react'
import type { DiaCashFlow, FlujoCajaResumen } from '../services/flujo-caja-actions'

interface Props {
  lineas: DiaCashFlow[]
  resumen_30d: FlujoCajaResumen
  resumen_60d: FlujoCajaResumen
  resumen_90d: FlujoCajaResumen
}

const fmt = (n: number) => `$${Math.abs(n).toLocaleString('es-CO')}`

export function FlujoCajaPanel({ lineas, resumen_30d, resumen_60d, resumen_90d }: Props) {
  const [horizonte, setHorizonte] = useState<30 | 60 | 90>(90)
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaCashFlow | null>(null)

  const resumenActual = horizonte === 30 ? resumen_30d : horizonte === 60 ? resumen_60d : resumen_90d
  const lineasFiltradas = lineas.slice(0, horizonte)

  // Calcular escala para barras
  const maxMonto = Math.max(...lineasFiltradas.map(d => Math.max(d.ingresos, d.egresos, 1)))

  return (
    <div className="space-y-6">
      {/* Alerta si hay déficit */}
      {resumenActual.alerta && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm font-bold text-red-700">{resumenActual.alerta}</p>
        </div>
      )}

      {/* Selector de horizonte */}
      <div className="flex gap-2">
        {([30, 60, 90] as const).map(h => (
          <button
            key={h}
            onClick={() => setHorizonte(h)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              horizonte === h
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-neu-base shadow-neu text-muted-foreground'
            }`}
          >
            {h} días
          </button>
        ))}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Ingresos Esperados</span>
          </div>
          <p className="text-title-sm font-bold text-emerald-700">{fmt(resumenActual.total_ingresos)}</p>
        </div>
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Egresos Programados</span>
          </div>
          <p className="text-title-sm font-bold text-red-700">{fmt(resumenActual.total_egresos)}</p>
        </div>
        <div className={`rounded-2xl p-5 ${resumenActual.neto >= 0 ? 'bg-primary-50 border border-primary-100' : 'bg-red-50 border border-red-200'}`}>
          <div className={`flex items-center gap-2 mb-1 ${resumenActual.neto >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Flujo Neto</span>
          </div>
          <p className={`text-title-sm font-bold ${resumenActual.neto >= 0 ? 'text-primary-700' : 'text-red-700'}`}>
            {resumenActual.neto >= 0 ? '' : '-'}{fmt(resumenActual.neto)}
          </p>
        </div>
      </div>

      {/* Gráfica de barras (visualmente compacta) */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6">
        <h3 className="font-bold text-foreground mb-4 text-sm">Flujo Día a Día — Próximos {horizonte} días</h3>
        <div className="flex items-end gap-px h-32 overflow-x-auto pb-2">
          {lineasFiltradas.map((d, i) => {
            const pctIngreso = (d.ingresos / maxMonto) * 100
            const pctEgreso = (d.egresos / maxMonto) * 100
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-px cursor-pointer group min-w-[8px] flex-1"
                onClick={() => setDiaSeleccionado(d)}
              >
                <div className="w-full flex flex-col items-center gap-px">
                  <div
                    className="w-full bg-emerald-400 rounded-t group-hover:bg-emerald-500 transition-colors"
                    style={{ height: `${pctIngreso}%`, minHeight: d.ingresos > 0 ? '4px' : '0' }}
                  />
                  <div
                    className="w-full bg-red-400 rounded-b group-hover:bg-red-500 transition-colors"
                    style={{ height: `${pctEgreso}%`, minHeight: d.egresos > 0 ? '4px' : '0' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded-sm inline-block" /> Ingresos</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm inline-block" /> Egresos</span>
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      {diaSeleccionado && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 border-2 border-primary-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-foreground">{new Date(diaSeleccionado.fecha).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
            <button onClick={() => setDiaSeleccionado(null)} className="text-muted-foreground text-xs hover:text-red-500">Cerrar ×</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Ingresos</p>
              {diaSeleccionado.detalle_ingresos.length === 0
                ? <p className="text-xs text-muted-foreground italic">Sin ingresos este día</p>
                : diaSeleccionado.detalle_ingresos.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-50">
                    <span className="text-muted-foreground">{d.concepto}</span>
                    <span className="font-bold text-emerald-600">{fmt(d.monto)}</span>
                  </div>
                ))
              }
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">Egresos</p>
              {diaSeleccionado.detalle_egresos.length === 0
                ? <p className="text-xs text-muted-foreground italic">Sin egresos este día</p>
                : diaSeleccionado.detalle_egresos.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-50">
                    <span className="text-muted-foreground">{d.concepto}</span>
                    <span className="font-bold text-red-600">{fmt(d.monto)}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
