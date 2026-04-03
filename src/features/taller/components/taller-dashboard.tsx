import {
  Factory, Package, DollarSign, CheckCircle,
  ShieldCheck, AlertTriangle, TrendingUp, TrendingDown,
  Minus, Clock, Star,
} from 'lucide-react'
import { OPStatusBadge } from '@/features/ordenes-produccion/components/op-status-badge'
import { formatDate } from '@/shared/lib/utils'
import type { TallerDashboardData } from '@/features/taller/types'

interface Props {
  data: TallerDashboardData
}

export function TallerDashboard({ data }: Props) {
  const { taller, mes_actual, mes_anterior, calidad, puntualidad, ops_activas } = data

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center">
              <Factory className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h1 className="text-display-xs font-heading text-foreground font-bold leading-none">
                {taller.nombre}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                  ${taller.estado === 'activo'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'}`}>
                  {taller.estado}
                </span>
                {taller.capacidad_diaria && (
                  <span className="text-muted-foreground text-body-sm">
                    {taller.capacidad_diaria} uds/día
                  </span>
                )}
                {taller.lead_time_dias && (
                  <span className="text-muted-foreground text-body-sm">
                    · Lead time {taller.lead_time_dias}d
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards — mes actual vs anterior ─────────── */}
      <div>
        <h2 className="font-semibold text-foreground text-body-md mb-3">Mes en curso</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MesKPICard
            icon={<Package className="w-4 h-4 text-primary-500" />}
            label="Unidades"
            actual={mes_actual.unidades}
            anterior={mes_anterior.unidades}
            format="number"
          />
          <MesKPICard
            icon={<DollarSign className="w-4 h-4 text-green-500" />}
            label="Valor (COP)"
            actual={mes_actual.valor_cop}
            anterior={mes_anterior.valor_cop}
            format="currency"
          />
          <MesKPICard
            icon={<CheckCircle className="w-4 h-4 text-blue-500" />}
            label="OPs completadas"
            actual={mes_actual.ops_completadas}
            anterior={mes_anterior.ops_completadas}
            format="number"
          />
          <MesKPICard
            icon={<ShieldCheck className="w-4 h-4 text-purple-500" />}
            label="FTT Calidad"
            actual={calidad.ftt}
            anterior={null}
            format="percent"
            suffix="%(90d)"
          />
        </div>
      </div>

      {/* ── Quality strip ───────────────────────────────── */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-500" />
          <h2 className="font-semibold text-foreground text-body-md">Calidad (últimos 90 días)</h2>
          <span className="text-muted-foreground text-body-sm ml-auto">
            {calidad.total_cerradas} inspecciones
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* FTT */}
          <div className="rounded-xl bg-neu-base shadow-neu-inset p-3 text-center">
            <p className={`text-display-xs font-bold ${
              calidad.ftt >= 90 ? 'text-green-600' :
              calidad.ftt >= 75 ? 'text-yellow-600' : 'text-red-600'
            }`}>{calidad.ftt}%</p>
            <p className="text-muted-foreground text-body-sm mt-0.5">FTT</p>
          </div>

          {/* Tasa rechazo */}
          <div className="rounded-xl bg-neu-base shadow-neu-inset p-3 text-center">
            <p className={`text-display-xs font-bold ${
              calidad.tasa_rechazo === 0 ? 'text-green-600' :
              calidad.tasa_rechazo <= 10 ? 'text-yellow-600' : 'text-red-600'
            }`}>{calidad.tasa_rechazo}%</p>
            <p className="text-muted-foreground text-body-sm mt-0.5">Tasa rechazo</p>
          </div>

          {/* Prendas segundas */}
          <div className="rounded-xl bg-neu-base shadow-neu-inset p-3 text-center">
            <p className={`text-display-xs font-bold ${
              calidad.prendas_segundas === 0 ? 'text-green-600' : 'text-purple-600'
            }`}>{calidad.prendas_segundas}</p>
            <p className="text-muted-foreground text-body-sm mt-0.5">Prendas 2ª</p>
          </div>

          {/* Puntualidad */}
          <div className="rounded-xl bg-neu-base shadow-neu-inset p-3 text-center">
            <p className={`text-display-xs font-bold ${
              puntualidad >= 90 ? 'text-green-600' :
              puntualidad >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>{puntualidad}%</p>
            <p className="text-muted-foreground text-body-sm mt-0.5">Puntualidad</p>
          </div>
        </div>

        {/* Puntualidad barra */}
        <div className="space-y-1">
          <div className="flex justify-between text-body-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Entregas a tiempo
            </span>
            <span className={`font-semibold ${
              puntualidad >= 90 ? 'text-green-600' :
              puntualidad >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>{puntualidad}%</span>
          </div>
          <div className="h-2 rounded-full bg-neu-base shadow-neu-inset-sm overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                puntualidad >= 90 ? 'bg-green-400' :
                puntualidad >= 70 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${puntualidad}%` }}
            />
          </div>
        </div>

        {/* Top defectos */}
        {calidad.top_defectos.length > 0 && (
          <div>
            <p className="text-body-sm font-medium text-foreground mb-2">Defectos frecuentes</p>
            <div className="flex flex-wrap gap-2">
              {calidad.top_defectos.map((d, i) => (
                <div
                  key={d.codigo}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                    ${i === 0
                      ? 'bg-red-100 text-red-700'
                      : i === 1
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-yellow-100 text-yellow-700'
                    }`}
                >
                  {i === 0 && <Star className="w-3 h-3" />}
                  <span>{d.codigo}</span>
                  <span className="opacity-75">·</span>
                  <span>{d.veces}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── OPs activas ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-body-md">
            Órdenes en curso
          </h2>
          <span className="text-muted-foreground text-body-sm">{ops_activas.length} activas</span>
        </div>

        {ops_activas.length === 0 ? (
          <div className="rounded-2xl bg-neu-base shadow-neu p-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-3">
              <Factory className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Sin órdenes activas</p>
            <p className="text-muted-foreground text-body-sm mt-1">Las órdenes asignadas aparecerán aquí</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-3 px-4 py-2 border-b border-black/5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">OP</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Uds</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Promesa</span>
            </div>

            {/* Rows */}
            {ops_activas.map(op => {
              const hoy = new Date()
              const promesa = new Date(op.fecha_promesa)
              const diasRestantes = Math.ceil((promesa.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

              return (
                <div
                  key={op.id}
                  className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-3 items-center px-4 py-3 border-b border-black/5 last:border-0"
                >
                  <span className="font-semibold text-foreground text-body-sm">{op.codigo}</span>
                  <span className="text-muted-foreground text-body-sm truncate">{op.cliente}</span>
                  <div>
                    <OPStatusBadge estado={op.estado} />
                  </div>
                  <span className="font-semibold text-foreground text-body-sm text-right">
                    {op.unidades.toLocaleString()}
                  </span>
                  <div className="text-right">
                    <p className="text-body-sm text-foreground">{formatDate(op.fecha_promesa)}</p>
                    <p className={`text-xs font-medium ${
                      diasRestantes < 0 ? 'text-red-600' :
                      diasRestantes <= 3 ? 'text-yellow-600' : 'text-muted-foreground'
                    }`}>
                      {diasRestantes < 0
                        ? `${Math.abs(diasRestantes)}d vencida`
                        : diasRestantes === 0
                        ? 'Hoy'
                        : `${diasRestantes}d`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Mes KPI Card ──────────────────────────────────── */
function MesKPICard({
  icon, label, actual, anterior, format, suffix,
}: {
  icon: React.ReactNode
  label: string
  actual: number
  anterior: number | null
  format: 'number' | 'currency' | 'percent'
  suffix?: string
}) {
  const formatted = (v: number) => {
    if (format === 'currency') {
      if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
      if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
      return `$${v}`
    }
    if (format === 'percent') return `${v}%`
    return v.toLocaleString()
  }

  let delta: 'up' | 'down' | 'same' | null = null
  let deltaPct: number | null = null
  if (anterior !== null && anterior > 0) {
    deltaPct = Math.round(((actual - anterior) / anterior) * 100)
    delta = deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'same'
  }

  const deltaColor = delta === 'up' ? 'text-green-600' : delta === 'down' ? 'text-red-600' : 'text-muted-foreground'

  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-neu-base shadow-neu-inset flex items-center justify-center">
          {icon}
        </div>
        <p className="text-muted-foreground text-body-sm leading-tight">{label}</p>
      </div>

      <p className="text-display-xs font-bold text-foreground leading-none">
        {formatted(actual)}{suffix}
      </p>

      {delta !== null && deltaPct !== null && (
        <div className={`flex items-center gap-1 mt-1.5 ${deltaColor}`}>
          {delta === 'up'   && <TrendingUp   className="w-3.5 h-3.5" />}
          {delta === 'down' && <TrendingDown  className="w-3.5 h-3.5" />}
          {delta === 'same' && <Minus         className="w-3.5 h-3.5" />}
          <span className="text-xs font-medium">
            {delta === 'same' ? 'igual' : `${Math.abs(deltaPct)}% vs mes ant.`}
          </span>
        </div>
      )}

      {anterior !== null && delta === null && (
        <p className="text-muted-foreground text-xs mt-1.5">
          Mes ant.: {formatted(anterior)}
        </p>
      )}
    </div>
  )
}
