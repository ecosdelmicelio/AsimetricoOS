'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LineaPL } from '../services/estados-financieros-actions'

interface Props {
  lineas: LineaPL[]
  resumen: {
    ingresos_brutos: number
    utilidad_bruta: number
    ebitda: number
    utilidad_neta: number
    margen_bruto: number
    margen_neto: number
  }
  mes: number
  anio: number
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const fmt = (n: number) => `$${Math.abs(n).toLocaleString('es-CO')}`

export function EstadoResultados({ lineas, resumen, mes, anio }: Props) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos', valor: resumen.ingresos_brutos, color: 'primary' },
          { label: 'Utilidad Bruta', valor: resumen.utilidad_bruta, color: resumen.utilidad_bruta >= 0 ? 'emerald' : 'red' },
          { label: 'EBITDA', valor: resumen.ebitda, color: resumen.ebitda >= 0 ? 'emerald' : 'red' },
          { label: 'Utilidad Neta', valor: resumen.utilidad_neta, color: resumen.utilidad_neta >= 0 ? 'emerald' : 'red' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl bg-neu-base shadow-neu p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-title-md font-bold ${k.valor >= 0 ? 'text-foreground' : 'text-red-600'}`}>
              {k.valor < 0 ? '-' : ''}{fmt(k.valor)}
            </p>
          </div>
        ))}
      </div>

      {/* Márgenes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-neu-base shadow-neu p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${resumen.margen_bruto >= 30 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            {resumen.margen_bruto >= 30 ? <TrendingUp className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margen Bruto</p>
            <p className="text-xl font-bold text-foreground">{resumen.margen_bruto.toFixed(1)}%</p>
          </div>
        </div>
        <div className="rounded-2xl bg-neu-base shadow-neu p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${resumen.margen_neto >= 10 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {resumen.margen_neto >= 10 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margen Neto</p>
            <p className={`text-xl font-bold ${resumen.margen_neto >= 0 ? 'text-foreground' : 'text-red-600'}`}>
              {resumen.margen_neto.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Tabla P&L */}
      <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-foreground">Estado de Resultados</h3>
          <span className="text-xs text-muted-foreground font-medium">{MESES[mes - 1]} {anio}</span>
        </div>
        <table className="w-full">
          <tbody className="divide-y divide-slate-50">
            {lineas.map((l, i) => (
              <tr
                key={i}
                className={`transition-colors ${
                  l.es_subtotal
                    ? 'bg-slate-50 font-bold border-t-2 border-slate-200'
                    : 'hover:bg-slate-50/50'
                }`}
              >
                <td className={`px-6 py-3 text-body-sm ${
                  l.es_subtotal ? 'text-foreground font-black uppercase tracking-wider text-xs' : 'text-muted-foreground pl-10'
                }`}>
                  {l.concepto}
                </td>
                <td className={`px-6 py-3 text-right text-body-sm font-bold ${
                  l.valor < 0 ? 'text-red-600' : l.es_subtotal ? 'text-foreground' : 'text-slate-600'
                }`}>
                  {l.valor < 0 ? `(${fmt(l.valor)})` : fmt(l.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
