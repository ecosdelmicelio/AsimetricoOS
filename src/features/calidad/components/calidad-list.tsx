import Link from 'next/link'
import { ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { getOPsParaInspeccion } from '@/features/calidad/services/calidad-actions'
import { CalidadStatusBadge } from './calidad-status-badge'
import { formatDate } from '@/shared/lib/utils'

const ESTADO_LABEL: Record<string, string> = {
  dupro_pendiente: 'DuPro',
}

export async function CalidadList() {
  const ops = await getOPsParaInspeccion()

  if (ops.length === 0) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-7 h-7 text-green-500" />
        </div>
        <p className="font-medium text-foreground">Sin OPs pendientes de inspección</p>
        <p className="text-muted-foreground text-body-sm mt-1">
          Las órdenes en DuPro o FRI aparecerán aquí
        </p>
      </div>
    )
  }

  const pendientes = ops.filter(op => !op.inspeccion_pendiente)
  const enInspeccion = ops.filter(op => op.inspeccion_pendiente)

  return (
    <div className="space-y-6">
      {enInspeccion.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground text-body-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            En inspección ({enInspeccion.length})
          </h2>
          <div className="space-y-2">
            {enInspeccion.map(op => (
              <OPInspeccionCard key={op.id} op={op} />
            ))}
          </div>
        </section>
      )}

      {pendientes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground text-body-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            Pendientes de iniciar ({pendientes.length})
          </h2>
          <div className="space-y-2">
            {pendientes.map(op => (
              <OPInspeccionCard key={op.id} op={op} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function OPInspeccionCard({ op }: { op: Awaited<ReturnType<typeof getOPsParaInspeccion>>[0] }) {
  const tipoLabel = ESTADO_LABEL[op.estado] ?? op.estado

  return (
    <Link
      href={`/calidad/${op.id}`}
      className="flex items-center justify-between rounded-xl bg-neu-base shadow-neu p-4 transition-all hover:shadow-neu-lg active:shadow-neu-inset"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground text-body-sm">{op.codigo}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">
            {tipoLabel}
          </span>
          {op.inspeccion_pendiente && (
            <CalidadStatusBadge resultado="pendiente" />
          )}
        </div>
        <p className="text-muted-foreground text-body-sm mt-0.5 truncate">
          {op.taller} · {op.cliente} · Promesa: {formatDate(op.fecha_promesa)}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
    </Link>
  )
}
