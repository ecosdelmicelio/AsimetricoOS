'use client'

import { Target, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'

interface BreakEvenData {
  costos_fijos: number
  precio_promedio: number
  cv_unitario: number
  margen_contribucion: number
  punto_equilibrio_unidades: number
  punto_equilibrio_pesos: number
  unidades_vendidas: number
  cobertura_pct: number
}

interface CCEData {
  dso: number
  dio: number
  dpo: number
  cce: number
  interpretacion: string
}

const fmt = (n: number) => `$${Math.abs(n).toLocaleString('es-CO')}`

export function IndicadoresPanel({ breakeven, cce }: { breakeven: BreakEvenData; cce: CCEData }) {
  const colorCobertura = breakeven.cobertura_pct >= 100
    ? 'text-emerald-600' : breakeven.cobertura_pct >= 75
    ? 'text-amber-600' : 'text-red-600'

  const bgCobertura = breakeven.cobertura_pct >= 100
    ? 'bg-emerald-50 border-emerald-200' : breakeven.cobertura_pct >= 75
    ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  const colorCCE = cce.cce <= 60 ? 'text-emerald-600' : cce.cce <= 90 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* BREAK-EVEN */}
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <span className="font-black text-xs uppercase tracking-widest text-foreground">Punto de Equilibrio</span>
          </div>

          <div className="p-6 space-y-5">
            {/* Gauge visual de cobertura */}
            <div className={`rounded-xl p-4 border ${bgCobertura}`}>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cobertura Actual</p>
                  <p className={`text-3xl font-black ${colorCobertura}`}>{breakeven.cobertura_pct.toFixed(0)}%</p>
                </div>
                {breakeven.cobertura_pct >= 100
                  ? <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  : <AlertTriangle className="w-8 h-8 text-amber-500" />
                }
              </div>
              <div className="h-2 w-full bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    breakeven.cobertura_pct >= 100 ? 'bg-emerald-500' :
                    breakeven.cobertura_pct >= 75 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(breakeven.cobertura_pct, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Punto Equilibrio</p>
                <p className="text-title-sm font-black text-foreground">{breakeven.punto_equilibrio_unidades.toLocaleString()} und</p>
                <p className="text-[10px] text-muted-foreground">{fmt(breakeven.punto_equilibrio_pesos)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Vendidas</p>
                <p className="text-title-sm font-black text-foreground">{breakeven.unidades_vendidas.toLocaleString()} und</p>
                <p className="text-[10px] text-muted-foreground">Este mes</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Precio Promedio</p>
                <p className="font-bold text-foreground">{fmt(breakeven.precio_promedio)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Margen Contribución</p>
                <p className="font-bold text-primary-600">{fmt(breakeven.margen_contribucion)} / und</p>
              </div>
            </div>
          </div>
        </div>

        {/* CCE */}
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="font-black text-xs uppercase tracking-widest text-foreground">Ciclo de Conversión de Efectivo</span>
          </div>

          <div className="p-6 space-y-5">
            {/* CCE Total */}
            <div className="text-center p-4 rounded-xl bg-slate-50">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">CCE Total</p>
              <p className={`text-5xl font-black ${colorCCE}`}>{cce.cce}<span className="text-xl ml-1">días</span></p>
              <p className="text-xs text-muted-foreground mt-2">{cce.interpretacion}</p>
            </div>

            {/* Componentes del CCE */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Días de Cobro (DSO)</p>
                  <p className="text-xs text-muted-foreground">Promedio de plazo de clientes</p>
                </div>
                <span className="font-black text-foreground text-lg">+{cce.dso}d</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Días de Inventario (DIO)</p>
                  <p className="text-xs text-muted-foreground">Lead time promedio de producción</p>
                </div>
                <span className="font-black text-foreground text-lg">+{cce.dio}d</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Días de Pago (DPO)</p>
                  <p className="text-xs text-muted-foreground">Crédito que te dan tus proveedores</p>
                </div>
                <span className="font-black text-emerald-600 text-lg">-{cce.dpo}d</span>
              </div>
            </div>

            <div className="bg-primary-50 rounded-xl p-3">
              <p className="text-[10px] text-primary-700 font-bold">
                💡 Reducir el CCE en 10 días libera capital sin necesidad de crédito adicional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
