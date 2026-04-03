import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getOPsCompletadasSinLiquidacion } from '@/features/liquidacion/services/liquidacion-actions'
import { getEntregaById } from '@/features/entregas/services/entregas-actions'
import { LiquidacionForm } from '@/features/liquidacion/components/liquidacion-form'

interface Props {
  searchParams: Promise<{ op?: string; entrega?: string }>
}

export default async function NuevaLiquidacionPage({ searchParams }: Props) {
  const { op, entrega: entregaId } = await searchParams

  const [ops, entregaData] = await Promise.all([
    getOPsCompletadasSinLiquidacion(),
    entregaId ? getEntregaById(entregaId) : Promise.resolve(null),
  ])

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/liquidacion"
          className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-display-xs font-heading font-bold text-foreground">Nueva Liquidación</h1>
          <p className="text-muted-foreground text-body-sm mt-0.5">
            {entregaData
              ? `Entrega #${entregaData.numero_entrega} · ${entregaData.totalUnidades} uds`
              : 'Registra el costo de servicio del taller'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-neu-base shadow-neu p-6">
        <LiquidacionForm
          ops={ops}
          opPreseleccionada={entregaData?.op_id ?? op}
          entregaPreseleccionada={entregaData ?? undefined}
        />
      </div>
    </div>
  )
}
