import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { OPForm } from '@/features/ordenes-produccion/components/op-form'
import { getTalleres, getOVsConfirmadas } from '@/features/ordenes-produccion/services/op-actions'

interface Props {
  searchParams: Promise<{ ov?: string }>
}

export default async function NuevaOPPage({ searchParams }: Props) {
  const { ov: ovPreseleccionada } = await searchParams
  const [talleres, ovs] = await Promise.all([getTalleres(), getOVsConfirmadas()])

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/ordenes-produccion"
          className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-display-xs font-heading font-bold text-foreground">Nueva Orden de Producción</h1>
          <p className="text-muted-foreground text-body-sm mt-0.5">Asigna una OV a un taller y define las cantidades</p>
        </div>
      </div>

      {ovs.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu p-10 text-center">
          <p className="font-medium text-foreground">No hay OVs disponibles</p>
          <p className="text-muted-foreground text-body-sm mt-1">
            Solo se pueden crear OPs desde OVs confirmadas o en producción
          </p>
          <Link
            href="/ordenes-venta"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset"
          >
            Ver Órdenes de Venta
          </Link>
        </div>
      ) : (
        <OPForm talleres={talleres} ovs={ovs} ovPreseleccionada={ovPreseleccionada} />
      )}
    </div>
  )
}
