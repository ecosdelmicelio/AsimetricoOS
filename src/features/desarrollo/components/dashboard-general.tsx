import { BarChart2, Clock, TrendingUp, AlertTriangle, Users, FlaskConical, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/shared/lib/utils'
import type { DashboardGeneralData } from '@/features/desarrollo/services/dashboard-actions'
import { STATUS_LABELS } from '@/features/desarrollo/types'

const FUNNEL_COLORS: Record<string, string> = {
  draft:         'bg-slate-200',
  ops_review:    'bg-amber-300',
  sampling:      'bg-blue-400',
  fitting:       'bg-indigo-400',
  client_review: 'bg-purple-400',
  approved:      'bg-emerald-400',
  graduated:     'bg-emerald-600',
}

interface Props {
  data: DashboardGeneralData
}

export function DashboardGeneral({ data }: Props) {
  const total = data.funnel.reduce((acc, f) => acc + f.count, 0) + data.cancelados
  const maxFunnel = Math.max(...data.funnel.map(f => f.count), 1)

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard icon={<FlaskConical className="w-4 h-4 text-blue-500" />} label="Activos" value={data.totalActivos} />
        <KPICard icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Graduados" value={data.totalGraduados} />
        <KPICard icon={<XCircle className="w-4 h-4 text-red-400" />} label="Cancelados" value={data.totalCancelados} />
        <KPICard icon={<Clock className="w-4 h-4 text-amber-500" />} label="Lead Time Prom." value={data.avgLeadtimeDias != null ? `${data.avgLeadtimeDias}d` : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Funnel de Conversión */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-slate-500" />
            <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Funnel de Conversión</h3>
          </div>
          <div className="space-y-2.5">
            {data.funnel.map(f => (
              <div key={f.status} className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {STATUS_LABELS[f.status as keyof typeof STATUS_LABELS] ?? f.status}
                  </span>
                </div>
                <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', FUNNEL_COLORS[f.status] ?? 'bg-slate-300')}
                    style={{ width: `${maxFunnel > 0 ? (f.count / maxFunnel) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[11px] font-black text-slate-700 w-6 text-right shrink-0">{f.count}</span>
              </div>
            ))}
            {data.cancelados > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Cancelados</span>
                </div>
                <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-red-200 transition-all"
                    style={{ width: `${(data.cancelados / maxFunnel) * 100}%` }} />
                </div>
                <span className="text-[11px] font-black text-slate-700 w-6 text-right shrink-0">{data.cancelados}</span>
              </div>
            )}
          </div>
          {total > 0 && (
            <p className="text-[10px] text-slate-400 mt-3 text-right">{total} total iniciados</p>
          )}
        </div>

        {/* Hit Rate por Cliente */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Hit Rate por Cliente</h3>
          </div>
          {data.hitRateByCliente.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {data.hitRateByCliente.map(c => (
                <div key={c.clienteNombre} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{c.clienteNombre}</p>
                    <p className="text-[10px] text-slate-400">{c.graduados}/{c.total} graduados</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={cn('h-full rounded-full', c.pct >= 60 ? 'bg-emerald-400' : c.pct >= 30 ? 'bg-amber-400' : 'bg-red-400')}
                        style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className={cn('text-[11px] font-black w-8 text-right', c.pct >= 60 ? 'text-emerald-600' : c.pct >= 30 ? 'text-amber-600' : 'text-red-500')}>
                      {c.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.versionesPromedio && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Iteraciones promedio</span>
              <span className="text-sm font-black text-slate-700">{data.versionesPromedio} versiones</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alertas de Aging */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Estancados (sin movimiento)</h3>
            {data.agingItems.length > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">
                {data.agingItems.length}
              </span>
            )}
          </div>
          {data.agingItems.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sin muestras estancadas</span>
            </div>
          ) : (
            <div className="space-y-2">
              {data.agingItems.slice(0, 5).map(item => (
                <Link key={item.temp_id} href={`/desarrollo/${item.temp_id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50 transition-colors">
                  <div className={cn('w-2 h-2 rounded-full shrink-0',
                    item.diasSinMovimiento > 15 ? 'bg-red-500' : 'bg-amber-400')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{item.nombre_proyecto}</p>
                    <p className="text-[10px] text-slate-400">{item.temp_id} · {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]}</p>
                  </div>
                  <span className={cn('text-[11px] font-black shrink-0',
                    item.diasSinMovimiento > 15 ? 'text-red-500' : 'text-amber-500')}>
                    {item.diasSinMovimiento}d
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Próximos a vencer */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Próximos a Vencer</h3>
          </div>
          {data.proximosVencer.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Sin compromisos en los próximos 14 días</p>
          ) : (
            <div className="space-y-2">
              {data.proximosVencer.map(item => (
                <Link key={item.temp_id} href={`/desarrollo/${item.temp_id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{item.nombre_proyecto}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(item.fecha_compromiso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className={cn('text-[11px] font-black shrink-0',
                    item.diasRestantes < 0 ? 'text-red-600' : item.diasRestantes <= 3 ? 'text-red-500' : item.diasRestantes <= 7 ? 'text-amber-500' : 'text-slate-500')}>
                    {item.diasRestantes < 0 ? `${Math.abs(item.diasRestantes)}d vencido` : `${item.diasRestantes}d`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  )
}
