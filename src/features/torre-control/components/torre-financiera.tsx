import {
  DollarSign, TrendingUp, TrendingDown, Wallet,
  Clock, BarChart3, ArrowDownLeft, ArrowUpRight,
  PieChart
} from 'lucide-react'
import { getFinancieraData } from '@/features/torre-control/services/financiera-actions'
import { PageHeader } from '@/shared/components/page-header'
import { formatCurrency } from '@/shared/lib/utils'

export async function TorreFinanciera() {
  const data = await getFinancieraData()
  const { kpis, aging_cobrar, aging_pagar, flujo_mensual, top_clientes_revenue } = data

  return (
    <div className="space-y-8">
      <PageHeader
        title="Torre Financiera"
        subtitle="Estado de resultados, flujo de caja y cartera por antigüedad"
        icon={BarChart3}
      />

      {/* ═══ P&L KPIs ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Revenue Mes" value={formatCurrency(kpis.revenue_mes)} color="emerald" />
        <MetricCard icon={<TrendingDown className="w-4 h-4" />} label="COGS Mes" value={formatCurrency(kpis.cogs_mes)} color="slate" />
        <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Margen Bruto" value={`${kpis.margen_bruto_pct.toFixed(1)}%`} color={kpis.margen_bruto_pct >= 25 ? 'emerald' : kpis.margen_bruto_pct >= 10 ? 'amber' : 'rose'} />
        <MetricCard icon={<BarChart3 className="w-4 h-4" />} label="EBITDA Aprox" value={formatCurrency(kpis.ebitda_aprox)} color="blue" />
        <MetricCard icon={<ArrowDownLeft className="w-4 h-4" />} label="CxC Total" value={formatCurrency(kpis.cuentas_por_cobrar)} color="primary" />
        <MetricCard icon={<ArrowUpRight className="w-4 h-4" />} label="CxP Total" value={formatCurrency(kpis.cuentas_por_pagar)} color="rose" />
      </div>

      {/* ═══ INDICADORES DE LIQUIDEZ ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <p className="text-4xl font-black text-white tracking-tighter z-10">{kpis.runway_meses === Infinity ? '∞' : kpis.runway_meses.toFixed(1)}<span className="text-base font-bold text-slate-500 ml-1">meses</span></p>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 z-10">Runway (Supervivencia)</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mb-2">
            <TrendingDown className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(kpis.burn_rate)}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Avg Monthly Burn</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(kpis.flujo_neto_mes)}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Flujo Neto Mes</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">{kpis.dias_promedio_cobro}<span className="text-xs font-bold text-slate-400 ml-1">d</span></p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Promedio Cobro</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">{kpis.dias_promedio_pago}<span className="text-xs font-bold text-slate-400 ml-1">d</span></p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Promedio Pago</p>
        </div>
      </div>

      {/* ═══ FLUJO MENSUAL ═══ */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-black text-slate-900 mb-1">Flujo de Caja · Últimos 6 Meses</h2>
        <p className="text-[10px] text-slate-400 font-medium mb-6">Ingresos vs Egresos registrados en el sistema</p>
        
        <div className="flex items-end gap-4 h-52">
          {flujo_mensual.map(m => {
            const maxVal = Math.max(...flujo_mensual.flatMap(x => [x.ingresos, x.egresos]), 1)
            const ingH = (m.ingresos / maxVal) * 100
            const egrH = (m.egresos / maxVal) * 100
            const neto = m.ingresos - m.egresos
            const mesLabel = new Date(m.mes + '-01').toLocaleDateString('es-CO', { month: 'short' })
            return (
              <div key={m.mes} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="text-[9px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatCurrency(neto)}
                </div>
                <div className="flex gap-1.5 items-end h-44 w-full justify-center">
                  <div className="w-[38%] bg-emerald-400 rounded-t-xl transition-all group-hover:bg-emerald-500" style={{ height: `${Math.max(ingH, 3)}%` }} />
                  <div className="w-[38%] bg-slate-300 rounded-t-xl transition-all group-hover:bg-slate-400" style={{ height: `${Math.max(egrH, 3)}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{mesLabel}</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-400 rounded" /><span className="text-[10px] font-bold text-slate-500">Ingresos</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300 rounded" /><span className="text-[10px] font-bold text-slate-500">Egresos</span></div>
        </div>
      </div>

      {/* ═══ CARTERA AGING ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgingPanel title="Cuentas por Cobrar" subtitle="Antigüedad de la cartera de clientes" data={aging_cobrar} color="emerald" />
        <AgingPanel title="Cuentas por Pagar" subtitle="Antigüedad de las obligaciones con proveedores" data={aging_pagar} color="rose" />
      </div>

      {/* ═══ TOP CLIENTES ═══ */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-black text-slate-900 mb-1">Top Clientes por Revenue (6 meses)</h2>
        <p className="text-[10px] text-slate-400 font-medium mb-6">Concentración del ingreso por cliente</p>
        <div className="space-y-3">
          {top_clientes_revenue.map((c, i) => {
            const maxRev = top_clientes_revenue[0]?.revenue || 1
            const pct = (c.revenue / maxRev) * 100
            return (
              <div key={c.nombre} className="flex items-center gap-4">
                <span className="w-6 text-center text-xs font-black text-slate-400">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-800">{c.nombre}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(c.revenue)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Metric Card ─── */
function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
    primary: 'bg-primary-50 text-primary-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${colorMap[color] || colorMap.slate}`}>
        {icon}
      </div>
      <p className="text-lg font-black text-slate-900 leading-none">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

/* ─── Aging Panel ─── */
function AgingPanel({ title, subtitle, data, color }: { title: string; subtitle: string; data: { rango: string; monto: number; count: number }[]; color: string }) {
  const total = data.reduce((s, d) => s + d.monto, 0)
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-sm font-black text-slate-900 mb-0.5">{title}</h3>
      <p className="text-[10px] text-slate-400 font-medium mb-5">{subtitle}</p>
      <div className="space-y-3">
        {data.map(d => {
          const pct = total > 0 ? (d.monto / total) * 100 : 0
          const isHighRisk = d.rango === '61-90d' || d.rango === '>90d'
          return (
            <div key={d.rango} className="flex items-center gap-4">
              <span className={`text-xs font-black w-14 ${isHighRisk ? 'text-rose-600' : 'text-slate-500'}`}>{d.rango}</span>
              <div className="flex-1">
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isHighRisk ? 'bg-rose-400' : color === 'emerald' ? 'bg-emerald-400' : 'bg-slate-400'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-900">{formatCurrency(d.monto)}</span>
                <span className="text-[9px] text-slate-400 ml-1">({d.count})</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
        <span className="text-sm font-black text-slate-900">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
