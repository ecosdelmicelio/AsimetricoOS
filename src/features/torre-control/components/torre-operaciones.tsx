import Link from 'next/link'
import { 
  Factory, AlertTriangle, CheckCircle, ShieldCheck, 
  Plus, Clock, ShoppingCart, Package, Activity, 
  BarChart3, Layers, Target, Gauge, ChevronRight
} from 'lucide-react'
import { getTorreData } from '@/features/torre-control/services/torre-actions'
import { OPStatusBadge } from '@/features/ordenes-produccion/components/op-status-badge'
import { PageHeader } from '@/shared/components/page-header'
import { formatDate, formatCurrency } from '@/shared/lib/utils'
import { SECUENCIA_ESTADOS } from '@/features/ordenes-produccion/types'

export async function TorreOperaciones() {
  const data = await getTorreData()
  const { kpis, ops_activas, ovs_pendientes, ranking_talleres, wip_etapas, lead_times, calidad } = data

  return (
    <div className="space-y-8">
      <PageHeader
        title="Torre de Control Operativa"
        subtitle="Monitoreo de piso, capacidad y tiempos de respuesta"
        icon={Factory}
      />

      {/* ═══ OPERATIONAL KPIs ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        {/* OTIF */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-blue-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-4">
              <Target className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">OTIF Global</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpis.otif_pct.toFixed(1)}%</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">Meta: 95%</span>
            </div>
          </div>
        </div>

        {/* Eficiencia Programación */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-emerald-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200 mb-4">
              <Gauge className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Desv. Promedio</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{(kpis.eficiencia_programacion || 0).toFixed(1)}d</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpis.eficiencia_programacion <= 2 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {kpis.eficiencia_programacion <= 2 ? 'Excelente' : 'Atraso Crítico'}
              </span>
            </div>
          </div>
        </div>

        {/* Utilización Capacidad */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-amber-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200 mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Talleres</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpis.utilizacion_capacidad.toFixed(1)}%</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">{kpis.ops_activas} OPs vivas</span>
            </div>
          </div>
        </div>

        {/* WIP Valor */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-purple-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-200 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valorización WIP</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(kpis.wip_valor_total)}</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">Venta en piso</span>
            </div>
          </div>
        </div>

        {/* OVs Sin OP (Alerta) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-28 h-28 bg-rose-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200 mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cuello de Botella</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpis.ovs_pendientes}</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">OVs sin programar</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUMNA IZQUIERDA: WIP DETALLADO Y OPS */}
        <div className="lg:col-span-8 space-y-8">
           {/* WIP por Etapa Visualizar */}
           <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Pipeline de Producción (WIP)</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Distribución de carga por proceso</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(kpis.wip_valor_total)}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Valor PISO Total</p>
                </div>
              </div>

              <div className="flex items-end gap-2 h-48 mb-8">
                {wip_etapas.map((etapa) => {
                  const maxVal = Math.max(...wip_etapas.map(e => e.valor)) || 1
                  const height = (etapa.valor / maxVal) * 100
                  return (
                    <div key={etapa.etapa} className="flex-1 flex flex-col items-center group gap-3">
                       <div className="relative w-full flex-1 flex flex-col justify-end px-2">
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatCurrency(etapa.valor)}
                          </div>
                          <div 
                            className="w-full bg-slate-900 rounded-2xl transition-all duration-700 group-hover:bg-blue-600 shadow-lg shadow-slate-100" 
                            style={{ height: `${height}%` }}
                          />
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{etapa.etapa}</p>
                          <p className="text-[9px] font-bold text-slate-400">{etapa.unidades} uds</p>
                       </div>
                    </div>
                  )
                })}
              </div>
           </div>

           {/* Listado de OPs Activas */}
           <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Órdenes de Producción Activas</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Trazabilidad y Riesgos de Entrega</p>
                </div>
                <Link href="/ordenes-produccion/nueva" className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                  Nueva OP
                </Link>
              </div>

              <div className="divide-y divide-slate-50">
                {ops_activas.map((op) => {
                  const idxActual = SECUENCIA_ESTADOS.indexOf(op.estado as any)
                  const progreso = idxActual >= 0 ? Math.round((idxActual / (SECUENCIA_ESTADOS.length - 1)) * 100) : 0
                  
                  return (
                    <Link key={op.id} href={`/ordenes-produccion/${op.id}`} className="py-4 flex items-center gap-4 group hover:bg-slate-50/50 rounded-2xl px-2 transition-colors">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                         op.riesgo === 'critico' ? 'bg-rose-50 text-rose-500' :
                         op.riesgo === 'alerta' ? 'bg-amber-50 text-amber-500' :
                         'bg-emerald-50 text-emerald-500'
                       }`}>
                         <Clock className="w-5 h-5" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-slate-900">{op.codigo}</span>
                            <OPStatusBadge estado={op.estado} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                              op.riesgo === 'critico' ? 'text-rose-500' :
                              op.riesgo === 'alerta' ? 'text-amber-500' :
                              'text-emerald-500'
                            }`}>{op.riesgo === 'critico' ? 'Vencida' : `${op.diasRestantes} Días`}</span>
                         </div>
                         <p className="text-[10px] text-slate-400 font-bold truncate">
                            {op.taller} · {op.cliente} · Promesa: {formatDate(op.fecha_promesa)}
                         </p>
                       </div>
                       <div className="w-32 hidden md:block">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-slate-900 rounded-full shadow-lg transition-all" style={{ width: `${progreso}%` }} />
                          </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )
                })}
              </div>
           </div>
        </div>

        {/* COLUMNA DERECHA: INSIGHTS & RANKINGS */}
        <div className="lg:col-span-4 space-y-8">
           {/* Lead Times Detallados */}
           <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                 <Clock className="w-4 h-4 text-slate-400" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Times Reales (Insight)</span>
              </div>
              <div className="space-y-4">
                 {lead_times.map((lt, i) => (
                   <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                         <div className="flex items-center gap-2">
                            {lt.tipo === 'produccion' ? <Factory className="w-3.5 h-3.5 text-purple-400" /> : <Package className="w-3.5 h-3.5 text-blue-400" />}
                            <span className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[120px]">{lt.categoria}</span>
                         </div>
                         <span className="text-xs font-black text-slate-900">{lt.promedio} días</span>
                      </div>
                      <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                         <div 
                           className={`h-full rounded-full ${lt.tipo === 'produccion' ? 'bg-purple-500' : 'bg-blue-500'}`} 
                           style={{ width: `${Math.min((lt.promedio / 45) * 100, 100)}%` }} 
                         />
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Ranking Talleres con Utilización */}
           <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                 <Gauge className="w-4 h-4 text-slate-400" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Talleres Eficientes</span>
              </div>
              <div className="space-y-5">
                 {ranking_talleres.slice(0, 5).map((t) => (
                   <div key={t.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{t.nombre}</p>
                          <div className="flex gap-2">
                            <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded uppercase">{t.completadas} Liquidadas</span>
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">{formatCurrency(t.wip_value)} WIP</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-black ${t.carga_pct > 90 ? 'text-rose-500' : 'text-slate-900'}`}>{t.carga_pct.toFixed(0)}%</p>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${t.carga_pct > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                           style={{ width: `${Math.min(t.carga_pct, 100)}%` }} 
                         />
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Calidad Summary */}
           <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                 <ShieldCheck className="w-4 h-4 text-slate-400" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen Calidad</span>
              </div>
              <div className="flex items-center justify-between gap-4 mb-6">
                 <div className="flex-1 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aprobación</p>
                    <p className="text-2xl font-black text-emerald-600">{calidad.tasaAprobacion.toFixed(1)}%</p>
                 </div>
                 <div className="w-px h-8 bg-slate-100" />
                 <div className="flex-1 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Defectos</p>
                    <p className="text-2xl font-black text-slate-900">{calidad.novedadesAbiertas}</p>
                 </div>
              </div>
              <div className="space-y-2">
                 {calidad.defectosTop.map((d: any) => (
                   <div key={d.tipo} className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{d.tipo}</span>
                     <span className="text-[10px] font-black text-slate-900">{d.count}</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* OVs sin OP (Acción Sugerida) */}
           {ovs_pendientes.length > 0 && (
             <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100 shadow-sm shadow-rose-50">
                <div className="flex items-center gap-2 mb-4">
                   <AlertTriangle className="w-4 h-4 text-rose-500" />
                   <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest underline decoration-rose-200 decoration-4 underline-offset-4">Acción Inmediata</span>
                </div>
                <p className="text-[11px] font-bold text-rose-800 mb-4 leading-relaxed">Hay {ovs_pendientes.length} órdenes de venta que aún no tienen una orden de producción asignada.</p>
                <Link href="/ordenes-venta" className="bg-rose-500 text-white w-full flex items-center justify-center py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-200">
                  Resolver Cuello de Botella
                </Link>
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
