import Link from 'next/link'
import { ShoppingCart, Plus, ChevronRight } from 'lucide-react'
import { getOrdenesCompra } from '@/features/compras/services/compras-actions'
import { OCDocBadge, OCGreigeBadge } from './oc-status-badge'
import { PageHeader } from '@/shared/components/page-header'
import { formatDate } from '@/shared/lib/utils'

export async function ComprasList() {
  const ocs = await getOrdenesCompra()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terminal de Compras"
        subtitle={`${ocs.length} órdenes registradas`}
        icon={ShoppingCart}
        action={{
          label: "Nueva OC",
          href: "/compras/nueva",
          icon: Plus
        }}
      />

      {ocs.length === 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No hay órdenes de compra</p>
          <p className="text-muted-foreground text-body-sm mt-1">
            Registra las compras de tela e insumos a tus proveedores
          </p>
          <Link
            href="/compras/nueva"
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset"
          >
            <Plus className="w-4 h-4" />
            Crear primera OC
          </Link>
        </div>
      )}

      {ocs.length > 0 && (
        <div className="space-y-3">
          {ocs.map(oc => (
            <Link
              key={oc.id}
              href={`/compras/${oc.id}`}
              className="block rounded-2xl bg-neu-base shadow-neu p-5 transition-all hover:shadow-neu-lg active:shadow-neu-inset"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-neu-base shadow-neu-inset flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-body-md">{oc.codigo}</span>
                      <OCDocBadge estado={oc.estado_documental} />
                    </div>
                    <p className="text-muted-foreground text-body-sm mt-0.5">
                      {oc.terceros?.nombre ?? 'Sin proveedor'}
                      {' · '}
                      <OCGreigeBadge estado={oc.estado_greige} />
                      {' · Entrega: '}
                      {formatDate(oc.fecha_entrega_est)}
                      {' · '}
                      {oc.rollos?.length ?? 0} rollo{(oc.rollos?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
