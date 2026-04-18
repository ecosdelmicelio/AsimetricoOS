import Link from 'next/link'
import {
  ShoppingCart, Users, DollarSign, TrendingUp,
  Package, AlertTriangle, ChevronRight, BarChart3,
  FlaskConical, CheckCircle2, Clock
} from 'lucide-react'
import { getComercialData } from '@/features/torre-control/services/comercial-actions'
import { PageHeader } from '@/shared/components/page-header'
import { formatCurrency, formatDate } from '@/shared/lib/utils'

export async function TorreComercial() {
  const data = await getComercialData()
  const { kpis, pipeline, top_clientes, ovs_recientes, desarrollo } = data

  return (
    <div className="space-y-8">
      <PageHeader
        title="Torre Comercial"
        subtitle="Pipeline de ventas, rendimiento comercial e innovación"
        icon={ShoppingCart}
      />

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard icon={<ShoppingCart className="w-4 h-4" />} label="OVs del Mes" value={String(kpis.ovs_mes)} />
        <KPICard icon={<DollarSign className="w-4 h-4" />} label="Revenue Mes" value={formatCurrency(kpis.revenue_mes)} accent />
        <KPICard icon={<TrendingUp className="w-4 h-4" />} label="Ticket Promedio" value={formatCurrency(kpis.ticket_promedio)} />
        <KPICard icon={<Package className="w-4 h-4" />} label="Uds Vendidas" value={String(kpis.unidades_vendidas_mes)} />
        <KPICard icon={<Users className="w-4 h-4" />} label="Tasa Retención" value={`${kpis.retention_rate.toFixed(1)}%`} />
        <KPICard 
          icon={<BarChart3 className="w-4 h-4" />} 
          label="LTV Promedio" 
          value={formatCurrency(top_clientes.reduce((acc, c) => acc + c.ltv, 0) / (top_clientes.length || 1))} 
        />
      </div>

      {/* ═══ INNOVACIÓN & DESARROLLO ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1 bg-gradient-to-br from-indigo-600 to-primary-700 rounded-3xl p-6 shadow-lg shadow-indigo-200 relative overflow-hidden group">
          <FlaskConical className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <h3 className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-3">Fábrica de Innovación</h3>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-5xl font-black text-white leading-none">{desarrollo.activos}</span>
              <span className="text-xs font-bold text-white/70 pb-1">Proyectos Activos</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-white/90 bg-white/10 px-3 py-2 rounded-xl">
                 <div className="flex items-center gap-2"><Clock className="w-3 h-3" /><span>En Muestreo</span></div>
                 <span className="font-black">{desarrollo.en_sampling}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-white/90 bg-white/10 px-3 py-2 rounded-xl">
                 <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /><span>Esperando Cliente</span></div>
                 <span className="font-black">{desarrollo.pendientes_cliente}</span>
              </div>
            </div>
            <Link href="/desarrollo" className="mt-6 block text-center py-2 bg-white text-primary-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-50 transition-colors">
              Ver Pipeline PLM
            </Link>
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-900 mb-1">Concentración de Innovación</h2>
          <p className="text-[10px] text-slate-400 font-medium mb-6">Nuevos desarrollos por categoría</p>
          <div className="flex items-center gap-8 h-32">
            {desarrollo.top_categorias.map(cat => {
              const pct = (cat.count / desarrollo.activos) * 100
              return (
                <div key={cat.categoria} className="flex-1 flex flex-col items-center">
                  <div className="relative w-16 h-16 mb-2">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path className="text-slate-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      <path className="text-primary-500" strokeDasharray={`${pct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-slate-900">{cat.count}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-tight">{cat.categoria}</span>
                </div>
              )
            })}
            {desarrollo.top_categorias.length === 0 && <p className="text-xs text-slate-400 text-center w-full">Sin proyectos recientes</p>}
          </div>
        </div>
      </div>

      {/* ═══ PIPELINE VISUAL ═══ */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-black text-slate-900 mb-1">Pipeline de Ventas</h2>
        <p className="text-[10px] text-slate-400 font-medium mb-6">Estado de todas las órdenes de venta</p>

        <div className="flex items-center gap-2">
          {pipeline.map((stage, i) => {
            const totalCount = pipeline.reduce((s, p) => s + p.count, 0) || 1
            const widthPct = Math.max((stage.count / totalCount) * 100, 8)
            const colors = [
              'bg-slate-200 text-slate-700',
              'bg-blue-400 text-white',
              'bg-purple-500 text-white',
              'bg-amber-400 text-amber-900',
              'bg-emerald-500 text-white',
            ]
            return (
              <div key={stage.estado} className="flex flex-col items-center gap-2" style={{ flex: widthPct }}>
                <div className={`w-full py-3 rounded-xl text-center transition-all ${colors[i] || 'bg-slate-100 text-slate-500'}`}>
                  <p className="text-lg font-black leading-none">{stage.count}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">{stage.label}</p>
                </div>
                <span className="text-[9px] font-bold text-slate-400">{formatCurrency(stage.valor)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ TOP CLIENTES ═══ */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Top Clientes del Mes</h3>
          </div>
          <div className="space-y-4">
            {top_clientes.map((c, i) => {
              const maxRev = top_clientes[0]?.revenue || 1
              const pct = (c.revenue / maxRev) * 100
              return (
                <div key={c.nombre}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400'
                      }`}>{i + 1}</span>
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{c.nombre}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{formatCurrency(c.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[9px] text-slate-400 font-medium">{c.ovs} OVs</span>
                    <span className="text-[9px] text-slate-400 font-medium">Uds: {c.unidades}</span>
                    <span className="text-[9px] font-black text-emerald-600 ml-auto">LTV: {formatCurrency(c.ltv)}</span>
                  </div>
                </div>
              )
            })}
            {top_clientes.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Sin datos aún</p>
            )}
          </div>
        </div>

        {/* ═══ ÚLTIMAS OVs ═══ */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Órdenes de Venta Recientes</h3>
            <Link href="/ordenes-venta" className="text-[10px] font-black text-primary-600 uppercase hover:text-primary-700">
              Ver todas →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-2">Código</th>
                  <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-2">Cliente</th>
                  <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-2">Valor</th>
                  <th className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-2">Estado</th>
                  <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 px-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ovs_recientes.map(ov => (
                  <tr key={ov.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3 px-2">
                      <Link href={`/ordenes-venta/${ov.id}`} className="text-xs font-black text-primary-600 group-hover:text-primary-700">{ov.codigo}</Link>
                    </td>
                    <td className="py-3 px-2 text-xs font-medium text-slate-600 truncate max-w-[160px]">{ov.cliente}</td>
                    <td className="py-3 px-2 text-right text-xs font-bold text-slate-900">{ov.total > 0 ? formatCurrency(ov.total) : '—'}</td>
                    <td className="py-3 px-2 text-center">
                      <EstadoBadge estado={ov.estado} />
                    </td>
                    <td className="py-3 px-2 text-right text-xs text-slate-400">{ov.fecha ? formatDate(ov.fecha) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon, label, value, accent, alert }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; alert?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border shadow-sm ${alert ? 'bg-rose-50 border-rose-100' : accent ? 'bg-primary-900 border-primary-800' : 'bg-white border-slate-100'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${accent ? 'bg-primary-700 text-primary-300' : alert ? 'bg-rose-100 text-rose-500' : 'bg-slate-50 text-slate-500'}`}>
        {icon}
      </div>
      <p className={`text-lg font-black leading-none ${accent ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${accent ? 'text-primary-300' : 'text-slate-400'}`}>{label}</p>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    borrador: 'bg-slate-100 text-slate-600',
    confirmada: 'bg-blue-50 text-blue-700',
    en_produccion: 'bg-purple-50 text-purple-700',
    despachada: 'bg-amber-50 text-amber-700',
    entregada: 'bg-emerald-50 text-emerald-700',
    cancelada: 'bg-rose-50 text-rose-600',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${map[estado] || 'bg-slate-100 text-slate-500'}`}>
      {estado.replace('_', ' ')}
    </span>
  )
}
