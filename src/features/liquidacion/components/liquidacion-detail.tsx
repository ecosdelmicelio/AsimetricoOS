import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getLiquidacionById } from '@/features/liquidacion/services/liquidacion-actions'
import { LiquidacionActions } from './liquidacion-actions'
import { formatDate, formatCurrency } from '@/shared/lib/utils'

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente de aprobación', className: 'bg-yellow-100 text-yellow-700' },
  aprobada:  { label: 'Aprobada',                className: 'bg-green-100 text-green-700' },
}

interface Props { id: string }

export async function LiquidacionDetail({ id }: Props) {
  const liq = await getLiquidacionById(id)

  if (!liq) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <p className="font-medium text-foreground">Liquidación no encontrada</p>
        <Link href="/liquidacion" className="text-primary-600 text-body-sm mt-2 inline-block">← Volver</Link>
      </div>
    )
  }

  const op = liq.ordenes_produccion
  const estadoConfig = ESTADO_CONFIG[liq.estado] ?? ESTADO_CONFIG.pendiente

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/liquidacion"
            className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-display-xs font-heading font-bold text-foreground">
                {op?.codigo ?? '—'}
              </h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${estadoConfig.className}`}>
                {estadoConfig.label}
              </span>
            </div>
            <p className="text-muted-foreground text-body-sm mt-0.5">
              {op?.terceros?.nombre ?? '—'} · {op?.ordenes_venta?.terceros?.nombre ?? '—'}
            </p>
          </div>
        </div>
        <LiquidacionActions liquidacionId={liq.id} estado={liq.estado} />
      </div>

      {/* Detalle financiero */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-body-md">Detalle financiero</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-black/5">
            <span className="text-muted-foreground text-body-sm">Costo servicio taller</span>
            <span className="font-semibold text-foreground">{formatCurrency(liq.costo_servicio_taller)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-black/5">
            <span className="text-muted-foreground text-body-sm">Penalidades calidad</span>
            <span className="font-semibold text-red-600">- {formatCurrency(liq.penalidades_calidad)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-black/5">
            <span className="font-semibold text-foreground">Costo total</span>
            <span className="font-bold text-display-xs text-foreground">{formatCurrency(liq.costo_total ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-black/5">
            <span className="text-muted-foreground text-body-sm">Unidades aprobadas</span>
            <span className="font-semibold text-foreground">{liq.unidades_aprobadas} uds</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground text-body-sm">Costo unitario final</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(liq.costo_unitario_final ?? 0)} / ud
            </span>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-neu-base shadow-neu p-4">
          <p className="text-muted-foreground text-body-sm mb-1">Creada</p>
          <p className="font-semibold text-foreground text-body-sm">{formatDate(liq.created_at)}</p>
        </div>
        {liq.estado === 'aprobada' && (
          <div className="rounded-2xl bg-neu-base shadow-neu p-4">
            <p className="text-muted-foreground text-body-sm mb-1">Aprobada</p>
            <p className="font-semibold text-foreground text-body-sm">
              {liq.fecha_aprobacion ? formatDate(liq.fecha_aprobacion) : '—'}
            </p>
          </div>
        )}
      </div>

      {/* Notas */}
      {liq.notas && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-5">
          <p className="text-body-sm font-medium text-muted-foreground mb-1">Notas</p>
          <p className="text-body-sm text-foreground">{liq.notas}</p>
        </div>
      )}

      {/* Links */}
      <div className="flex items-center gap-4">
        <Link
          href={`/ordenes-produccion/${liq.op_id}`}
          className="text-primary-600 text-body-sm hover:underline"
        >
          Ver OP →
        </Link>
        {liq.entrega_id && (
          <span className="text-xs text-muted-foreground bg-neu-base shadow-neu-inset px-3 py-1 rounded-full">
            Liquidación parcial por entrega
          </span>
        )}
      </div>
    </div>
  )
}
