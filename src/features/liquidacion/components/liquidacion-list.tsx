import Link from 'next/link'
import { ChevronRight, DollarSign, Plus } from 'lucide-react'
import { getLiquidaciones } from '@/features/liquidacion/services/liquidacion-actions'
import { formatDate, formatCurrency } from '@/shared/lib/utils'

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700' },
  aprobada:  { label: 'Aprobada',  className: 'bg-green-100 text-green-700' },
}

export async function LiquidacionList() {
  const liquidaciones = await getLiquidaciones()

  if (liquidaciones.length === 0) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mx-auto mb-3">
          <DollarSign className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">Sin liquidaciones aún</p>
        <p className="text-muted-foreground text-body-sm mt-1">
          Las liquidaciones de OPs completadas aparecerán aquí
        </p>
        <Link
          href="/liquidacion/nueva"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm hover:shadow-neu-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva liquidación
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {liquidaciones.map(liq => {
        const estadoConfig = ESTADO_CONFIG[liq.estado] ?? ESTADO_CONFIG.pendiente
        const op = liq.ordenes_produccion
        const cliente = op?.ordenes_venta?.terceros?.nombre ?? '—'
        const taller = op?.terceros?.nombre ?? '—'

        return (
          <Link
            key={liq.id}
            href={`/liquidacion/${liq.id}`}
            className="flex items-center justify-between rounded-2xl bg-neu-base shadow-neu p-4 transition-all hover:shadow-neu-lg active:shadow-neu-inset"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground text-body-sm">
                  {op?.codigo ?? '—'}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${estadoConfig.className}`}>
                  {estadoConfig.label}
                </span>
              </div>
              <p className="text-muted-foreground text-body-sm mt-0.5 truncate">
                {taller} · {cliente} · {formatDate(liq.created_at)}
              </p>
              <p className="text-body-sm font-semibold text-foreground mt-1">
                {formatCurrency(liq.costo_total ?? 0)}
                <span className="text-muted-foreground font-normal ml-1">total</span>
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
          </Link>
        )
      })}
    </div>
  )
}
