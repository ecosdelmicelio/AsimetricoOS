import Link from 'next/link'
import {
  Factory, AlertTriangle, CheckCircle, ShieldCheck,
  ClipboardList, ChevronRight, Plus, Clock, ShoppingCart, Package, Activity
} from 'lucide-react'
import { getTorreData } from '@/features/torre-control/services/torre-actions'
import { OPStatusBadge } from '@/features/ordenes-produccion/components/op-status-badge'
import { PageHeader } from '@/shared/components/page-header'
import { formatDate, formatCurrency } from '@/shared/lib/utils'
import { SECUENCIA_ESTADOS } from '@/features/ordenes-produccion/types'
import type { OPResumen, TallerRanking, OVPendiente } from '@/features/torre-control/services/torre-actions'

export async function TorreControlDashboard() {
  const data = await getTorreData()
  const { kpis, ops_activas, ovs_pendientes, ranking_talleres } = data

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Torre de Control"
        subtitle="Visibilidad en tiempo real de la fábrica"
        icon={LayoutDashboard}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          icon={<Factory className="w-5 h-5 text-primary-500" />}
          label="OPs Activas"
          value={kpis.ops_activas}
          href="/ordenes-produccion"
        />
        <KPICard
          icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />}
          label="En Riesgo"
          value={kpis.ops_en_riesgo}
          alert={kpis.ops_en_riesgo > 0}
        />
        <KPICard
          icon={<ShieldCheck className="w-5 h-5 text-purple-500" />}
          label="En Calidad"
          value={kpis.ops_en_calidad}
        />
        <KPICard
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          label="Completadas (mes)"
          value={kpis.ops_completadas_mes}
        />
        <KPICard
          icon={<ClipboardList className="w-5 h-5 text-blue-500" />}
          label="OVs Activas"
          value={kpis.ovs_activas}
          href="/ordenes-venta"
        />
        <KPICard
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
          label="OVs Sin OP"
          value={kpis.ovs_pendientes}
          alert={kpis.ovs_pendientes > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OPs Activas — columna principal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-body-md">
              Órdenes de Producción Activas
            </h2>
            <Link
              href="/ordenes-produccion/nueva"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva OP
            </Link>
          </div>

          {ops_activas.length === 0 ? (
            <EmptyState
              icon={<Factory className="w-8 h-8 text-muted-foreground" />}
              mensaje="No hay OPs activas"
              sub="Las órdenes aparecerán aquí cuando estén en proceso"
            />
          ) : (
            <div className="space-y-3">
              {ops_activas.map(op => (
                <OPCard key={op.id} op={op} />
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha */}
        <div className="space-y-6">
          {/* Lead Times */}
          <PanelLeadTimes leadTimes={data.lead_times} />

          {/* Calidad Detalle */}
          <PanelCalidad calidad={data.calidad} />

          {/* OVs pendientes de OP */}
          <PanelOVsPendientes ovs={ovs_pendientes} />

          {/* Ranking de talleres */}
          <PanelRanking ranking={ranking_talleres} />
        </div>
      </div>
    </div>
  )
}

function LayoutDashboard(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  )
}

/* ─── KPI Card ─────────────────────────────────── */
function KPICard({
  icon, label, value, href, alert,
}: {
  icon: React.ReactNode
  label: string
  value: number
  href?: string
  alert?: boolean
}) {
  const content = (
    <div className={`rounded-2xl bg-neu-base p-4 transition-all ${
      href ? 'shadow-neu hover:shadow-neu-lg active:shadow-neu-inset cursor-pointer' : 'shadow-neu'
    } ${alert && value > 0 ? 'ring-2 ring-yellow-400/60' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-neu-base shadow-neu-inset flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-display-xs font-bold text-foreground leading-none">{value}</p>
      <p className="text-muted-foreground text-body-sm mt-1 leading-tight">{label}</p>
    </div>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}

/* ─── OP Card ───────────────────────────────────── */
function OPCard({ op }: { op: OPResumen }) {
  const idxActual = SECUENCIA_ESTADOS.indexOf(op.estado as typeof SECUENCIA_ESTADOS[number])
  const progreso = idxActual >= 0 ? Math.round((idxActual / (SECUENCIA_ESTADOS.length - 1)) * 100) : 0

  const riesgoConfig = {
    ok:      { bar: 'bg-green-400',  text: 'text-green-600',  label: `${op.diasRestantes}d` },
    alerta:  { bar: 'bg-yellow-400', text: 'text-yellow-600', label: `${op.diasRestantes}d` },
    critico: { bar: 'bg-red-400',    text: 'text-red-600',    label: op.diasRestantes <= 0 ? 'Vencida' : `${op.diasRestantes}d` },
  }[op.riesgo]

  return (
    <Link
      href={`/ordenes-produccion/${op.id}`}
      className="block rounded-2xl bg-neu-base shadow-neu p-4 transition-all hover:shadow-neu-lg active:shadow-neu-inset"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-body-sm">{op.codigo}</span>
            <OPStatusBadge estado={op.estado} />
            <span className={`text-xs font-bold ${riesgoConfig.text}`}>
              {riesgoConfig.label}
            </span>
          </div>
          <p className="text-muted-foreground text-body-sm mt-0.5 truncate">
            {op.taller} · {op.cliente} · Promesa: {formatDate(op.fecha_promesa)}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>

      {/* Barra de progreso */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-neu-base shadow-neu-inset-sm overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${riesgoConfig.bar}`}
            style={{ width: `${progreso}%` }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-muted-foreground">Programada</span>
          <span className="text-[10px] text-muted-foreground">{progreso}%</span>
          <span className="text-[10px] text-muted-foreground">Completada</span>
        </div>
      </div>
    </Link>
  )
}

/* ─── OVs pendientes ────────────────────────────── */
function PanelOVsPendientes({ ovs }: { ovs: OVPendiente[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-body-md">OVs sin OP</h2>
        <Link
          href="/ordenes-venta"
          className="text-primary-600 text-body-sm hover:underline"
        >
          Ver todas
        </Link>
      </div>

      {ovs.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu px-4 py-6 text-center">
          <p className="text-muted-foreground text-body-sm">Todas las OVs tienen OP asignada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ovs.slice(0, 5).map(ov => (
            <Link
              key={ov.id}
              href={`/ordenes-produccion/nueva?ov=${ov.id}`}
              className="flex items-center justify-between rounded-xl bg-neu-base shadow-neu p-3 transition-all hover:shadow-neu-lg active:shadow-neu-inset"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-body-sm">{ov.codigo}</p>
                <p className="text-muted-foreground text-body-sm truncate">
                  {ov.cliente} · {ov.unidades} uds · {formatDate(ov.fecha_entrega)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Plus className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-primary-600 text-body-sm font-semibold">OP</span>
              </div>
            </Link>
          ))}
          {ovs.length > 5 && (
            <p className="text-muted-foreground text-body-sm text-center pt-1">
              +{ovs.length - 5} más
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Lead Times ────────────────────────────────── */
function PanelLeadTimes({ leadTimes }: { leadTimes: any[] }) {
  const icons: Record<string, React.ReactNode> = {
    produccion: <Factory className="w-3.5 h-3.5 text-purple-500" />,
    materia_prima: <Package className="w-3.5 h-3.5 text-blue-500" />,
    comercializado: <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-body-md">Lead Times Reales</h2>
      </div>
      <div className="rounded-2xl bg-neu-base shadow-neu p-4 space-y-3">
        {leadTimes.map((lt, i) => (
          <div key={`${lt.tipo}-${i}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {icons[lt.tipo]}
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{lt.categoria}</span>
              </div>
              <span className="text-xs font-black text-slate-900">{lt.promedio} días</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div className={`h-full rounded-full ${lt.tipo === 'produccion' ? 'bg-purple-400' : lt.tipo === 'materia_prima' ? 'bg-blue-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min((lt.promedio / 45) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
        {leadTimes.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sin datos de entregas recientes</p>}
      </div>
    </div>
  )
}

/* ─── Calidad Detalle ───────────────────────────── */
function PanelCalidad({ calidad }: { calidad: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-body-md">Calidad & Defectología</h2>
      </div>
      <div className="rounded-2xl bg-neu-base shadow-neu p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1 border-r border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Aprobación</p>
            <p className="text-xl font-black text-emerald-600">{calidad.tasaAprobacion.toFixed(1)}%</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Alertas</p>
            <p className={`text-xl font-black ${calidad.novedadesAbiertas > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{calidad.novedadesAbiertas}</p>
          </div>
        </div>

        <div className="space-y-2">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Top Defectos</p>
           {calidad.defectosTop.map((d: any) => (
             <div key={d.tipo} className="flex items-center justify-between group">
               <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{d.tipo}</span>
               <span className="text-[10px] font-black text-slate-400">{d.count} u</span>
             </div>
           ))}
           {calidad.defectosTop.length === 0 && <p className="text-xs text-center text-slate-300 py-2">0 defectos reportados</p>}
        </div>
      </div>
    </div>
  )
}

function PanelRanking({ ranking }: { ranking: TallerRanking[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-body-md">Utilización de Talleres</h2>
      </div>
      <div className="rounded-2xl bg-neu-base shadow-neu p-4 space-y-4">
        {ranking.map((t) => (
          <div key={t.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">{t.nombre}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded capitalize">{t.activas} OPs</span>
                  <span className="text-[9px] font-black text-emerald-500">{formatCurrency(t.wip_value)} WIP</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-900 leading-none">{t.carga_pct.toFixed(1)}%</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Carga</p>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className={`h-full rounded-full transition-all duration-1000 ${t.carga_pct > 90 ? 'bg-rose-500' : t.carga_pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                 style={{ width: `${Math.min(t.carga_pct, 100)}%` }} 
               />
            </div>
          </div>
        ))}
        {ranking.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sin talleres activos</p>}
      </div>
    </div>
  )
}

/* ─── Empty state ───────────────────────────────── */
function EmptyState({ icon, mensaje, sub }: { icon: React.ReactNode; mensaje: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="font-medium text-foreground">{mensaje}</p>
      <p className="text-muted-foreground text-body-sm mt-1">{sub}</p>
    </div>
  )
}
