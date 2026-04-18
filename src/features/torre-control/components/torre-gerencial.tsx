import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  DollarSign, Factory, Package, FlaskConical,
  Clock, FileWarning, ShieldAlert, ChevronRight,
  LayoutDashboard, Users, BarChart3, Activity
} from 'lucide-react'
import Link from 'next/link'
import { getTorreData } from '@/features/torre-control/services/torre-actions'
import { getFinancieraData } from '@/features/torre-control/services/financiera-actions'
import { getComercialData } from '@/features/torre-control/services/comercial-actions'
import { PageHeader } from '@/shared/components/page-header'
import { formatCurrency, formatDate } from '@/shared/lib/utils'

export async function GerencialDashboard() {
  const [torre, fin, com] = await Promise.all([
    getTorreData(),
    getFinancieraData(),
    getComercialData(),
  ])

  const alertas = [
    torre.kpis.ops_en_riesgo > 0 && { tipo: 'critico' as const, msg: `${torre.kpis.ops_en_riesgo} OPs en riesgo de vencimiento`, href: '/torre-control/operaciones' },
    torre.kpis.ovs_pendientes > 0 && { tipo: 'alerta' as const, msg: `${torre.kpis.ovs_pendientes} OVs confirmadas sin OP asignada`, href: '/ordenes-venta' },
    fin.kpis.cuentas_por_cobrar > 0 && { tipo: 'info' as const, msg: `${formatCurrency(fin.kpis.cuentas_por_cobrar)} en cuentas por cobrar`, href: '/torre-control/financiera' },
    fin.kpis.cuentas_por_pagar > 0 && { tipo: 'info' as const, msg: `${formatCurrency(fin.kpis.cuentas_por_pagar)} en cuentas por pagar`, href: '/torre-control/financiera' },
  ].filter(Boolean) as { tipo: 'critico' | 'alerta' | 'info'; msg: string; href: string }[]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Gerencial"
        subtitle={`Visión ejecutiva 360° · ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        icon={LayoutDashboard}
      /      {/* ═══ MEGA KPIs ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        {/* Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-emerald-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200 mb-4">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Revenue del Mes</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(fin.kpis.revenue_mes)}</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">{com.kpis.ovs_mes} OVs</span>
            </div>
          </div>
        </div>

        {/* Calidad */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-rose-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200 mb-4">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Calidad (Niv. Aprob)</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{torre.calidad.tasaAprobacion.toFixed(1)}%</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{torre.calidad.novedadesAbiertas} novedades open</span>
            </div>
          </div>
        </div>

        {/* Lead Times Promedio */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-amber-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200 mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">LeadTime Prod Prom</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {torre.lead_times.filter(l => l.tipo === 'produccion').reduce((acc, curr) => acc + curr.promedio, 0) / (torre.lead_times.filter(l => l.tipo === 'produccion').length || 1) | 0} días
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">Insumos: {torre.lead_times.find(l => l.tipo === 'materia_prima')?.promedio || '—'} d</span>
            </div>
          </div>
        </div>

        {/* Producción */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-purple-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200 mb-4">
              <Factory className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Operativa</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
               {(torre.ranking_talleres.reduce((acc: number, t: any) => acc + (t.carga_pct || 0), 0) / (torre.ranking_talleres.filter((t: any) => t.capacidad > 0).length || 1)).toFixed(1)}%
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">{torre.kpis.ops_activas} OPs activas</span>
            </div>
          </div>
        </div>

        {/* Innovation Mix */}
        <div className="bg-indigo-900 rounded-3xl p-6 border border-indigo-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-indigo-700 rounded-full opacity-30 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-950 mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Innovation Mix</p>
            <h3 className="text-2xl font-black text-white tracking-tighter">{torre.innovation_mix.pct.toFixed(1)}%</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-800 px-2 py-0.5 rounded-full">New designs rev</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTINUIDAD & RETENCIÓN ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Liquidez (Burn Rate & Runway) */}
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden group col-span-1">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-slate-800 rounded-full opacity-30 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">Financial Runway</p>
               <h3 className="text-6xl font-black text-white tracking-tighter mb-1 leading-none">
                 {fin.kpis.runway_meses === Infinity ? '∞' : fin.kpis.runway_meses.toFixed(1)} <span className="text-2xl font-bold text-slate-500">m</span>
               </h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Capacidad de supervivencia</p>
            </div>
            <div className="hidden md:block w-px h-20 bg-slate-800" />
            <div className="flex flex-row md:flex-col gap-8 md:gap-4 w-full md:w-auto justify-center">
               <div>
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Burn Rate</p>
                 <p className="text-xl font-black text-rose-400">{formatCurrency(fin.kpis.burn_rate)}</p>
               </div>
               <div>
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Caja Mes</p>
                 <p className="text-xl font-black text-emerald-400">{formatCurrency(fin.kpis.flujo_neto_mes)}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Retención de Clientes */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group col-span-1">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
             <div className="flex-1 text-center md:text-left">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tasa de Retención</p>
               <h3 className="text-6xl font-black text-slate-900 tracking-tighter mb-1 leading-none">
                 {com.kpis.retention_rate.toFixed(1)}%
               </h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Lealtad Clientes Mes v Mes</p>
             </div>
             <div className="w-full md:w-1/3 space-y-3">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 rounded-full shadow-lg shadow-emerald-200 transition-all duration-1000" style={{ width: `${com.kpis.retention_rate}%` }} />
                </div>
                <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest">Base recurrente activa</p>
             </div>
          </div>
        </div>
      </div>


      {/* ═══ ALERTAS ═══ */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas del Sistema</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alertas.map((a, i) => (
              <Link key={i} href={a.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all hover:scale-[1.01] ${
                a.tipo === 'critico' ? 'bg-rose-50 border border-rose-100' :
                a.tipo === 'alerta' ? 'bg-amber-50 border border-amber-100' :
                'bg-slate-50 border border-slate-100'
              }`}>
                <AlertTriangle className={`w-4 h-4 shrink-0 ${
                  a.tipo === 'critico' ? 'text-rose-500' : a.tipo === 'alerta' ? 'text-amber-500' : 'text-slate-400'
                }`} />
                <span className="text-xs font-bold text-slate-700 flex-1">{a.msg}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══ GRID 2/3 + 1/3 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* FLUJO MENSUAL */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-black text-slate-900">Flujo de Caja · Últimos 6 Meses</h2>
              <p className="text-[10px] text-slate-400 font-medium">Ingresos vs Egresos registrados</p>
            </div>
            <Link href="/torre-control/financiera" className="text-[10px] font-black text-primary-600 uppercase tracking-wider hover:text-primary-700">
              Ver más →
            </Link>
          </div>
          
          {/* Bar chart visual */}
          <div className="flex items-end gap-3 h-40">
            {fin.flujo_mensual.map(m => {
              const maxVal = Math.max(...fin.flujo_mensual.flatMap(x => [x.ingresos, x.egresos]), 1)
              const ingH = (m.ingresos / maxVal) * 100
              const egrH = (m.egresos / maxVal) * 100
              const mesLabel = new Date(m.mes + '-01').toLocaleDateString('es-CO', { month: 'short' })
              return (
                <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-1 items-end h-32 w-full justify-center">
                    <div className="w-[40%] bg-emerald-400 rounded-t-lg transition-all" style={{ height: `${Math.max(ingH, 2)}%` }} title={`Ingresos: ${formatCurrency(m.ingresos)}`} />
                    <div className="w-[40%] bg-slate-300 rounded-t-lg transition-all" style={{ height: `${Math.max(egrH, 2)}%` }} title={`Egresos: ${formatCurrency(m.egresos)}`} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{mesLabel}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-4 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-400 rounded" /><span className="text-[10px] font-bold text-slate-500">Ingresos</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300 rounded" /><span className="text-[10px] font-bold text-slate-500">Egresos</span></div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">
          {/* Top Clientes */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Top Clientes</h3>
            </div>
            <div className="space-y-2.5">
              {fin.top_clientes_revenue.slice(0, 5).map((c, i) => (
                <div key={c.nombre} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.nombre}</p>
                  </div>
                  <span className="text-xs font-black text-slate-900">{formatCurrency(c.revenue)}</span>
                </div>
              ))}
              {fin.top_clientes_revenue.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Sin datos aún</p>
              )}
            </div>
          </div>

          {/* Pipeline Rápido */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Pipeline Comercial</h3>
              <Link href="/torre-control/comercial" className="text-[10px] font-black text-primary-600 uppercase hover:text-primary-700">
                Detalle →
              </Link>
            </div>
            <div className="space-y-2">
              {com.pipeline.filter(p => p.count > 0).map(p => (
                <div key={p.estado} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-600">{p.label}</span>
                      <span className="text-[10px] font-black text-slate-900">{p.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${Math.min((p.count / Math.max(com.kpis.ovs_mes, 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ QUICK LINKS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/torre-control/operaciones" className="group flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-purple-200 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
            <Factory className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-slate-900">Torre Operaciones</p>
            <p className="text-[10px] text-slate-400 font-medium">OPs, talleres, calidad</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </Link>
        <Link href="/torre-control/comercial" className="group flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-slate-900">Torre Comercial</p>
            <p className="text-[10px] text-slate-400 font-medium">Pipeline, clientes, OVs</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </Link>
        <Link href="/torre-control/financiera" className="group flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-emerald-200 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-slate-900">Torre Financiera</p>
            <p className="text-[10px] text-slate-400 font-medium">P&L, flujo, cartera</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </Link>
      </div>
    </div>
  )
}
