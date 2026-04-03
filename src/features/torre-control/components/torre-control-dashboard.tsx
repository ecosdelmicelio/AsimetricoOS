import Link from 'next/link'
import {
  Factory, AlertTriangle, CheckCircle, ShieldCheck,
  ClipboardList, ChevronRight, Plus, Trophy, TrendingUp,
} from 'lucide-react'
import { getTorreData } from '@/features/torre-control/services/torre-actions'
import { OPStatusBadge } from '@/features/ordenes-produccion/components/op-status-badge'
import { formatDate } from '@/shared/lib/utils'
import { SECUENCIA_ESTADOS } from '@/features/ordenes-produccion/types'
import type { OPResumen, TallerRanking, OVPendiente } from '@/features/torre-control/services/torre-actions'

export async function TorreControlDashboard() {
  const data = await getTorreData()
  const { kpis, ops_activas, ovs_pendientes, ranking_talleres } = data

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-display-xs font-heading text-foreground font-bold">Torre de Control</h1>
        <p className="text-muted-foreground text-body-sm mt-1">
          Visibilidad en tiempo real de todas las órdenes
        </p>
      </div>

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
          {/* OVs pendientes de OP */}
          <PanelOVsPendientes ovs={ovs_pendientes} />

          {/* Ranking de talleres */}
          <PanelRanking ranking={ranking_talleres} />
        </div>
      </div>
    </div>
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

/* ─── Ranking talleres ──────────────────────────── */
function PanelRanking({ ranking }: { ranking: TallerRanking[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-body-md">Ranking Talleres</h2>
      </div>

      {ranking.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu px-4 py-6 text-center">
          <p className="text-muted-foreground text-body-sm">Sin datos aún</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          {ranking.map((taller, i) => (
            <div
              key={taller.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-black/5 last:border-0"
            >
              {/* Posición */}
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold
                ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                  i === 1 ? 'bg-gray-100 text-gray-600' :
                  i === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-neu-base shadow-neu-inset text-muted-foreground'}`}>
                {i === 0 ? <Trophy className="w-3.5 h-3.5" /> : i + 1}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-body-sm truncate">{taller.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-green-600 font-medium">{taller.completadas} ✓</span>
                  {taller.activas > 0 && (
                    <span className="text-xs text-muted-foreground">{taller.activas} activas</span>
                  )}
                  {taller.enRiesgo > 0 && (
                    <span className="text-xs text-yellow-600 font-medium">{taller.enRiesgo} riesgo</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
