import Link from 'next/link'
import { Factory, Plus, ChevronRight } from 'lucide-react'
import { getOrdenesProduccion } from '@/features/ordenes-produccion/services/op-actions'
import { OPStatusBadge } from './op-status-badge'
import { formatDate } from '@/shared/lib/utils'
import type { OrdenProduccion } from '@/features/ordenes-produccion/types'

type OPListItem = OrdenProduccion & {
  terceros: { nombre: string } | null
  ordenes_venta: { codigo: string; terceros: { nombre: string } | null } | null
}

export async function OPList() {
  const result = await getOrdenesProduccion()
  const ops = result.data as OPListItem[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-xs font-heading text-foreground font-bold">Órdenes de Producción</h1>
          <p className="text-muted-foreground text-body-sm mt-1">{ops.length} órdenes registradas</p>
        </div>
        <Link
          href="/ordenes-produccion/nueva"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
        >
          <Plus className="w-4 h-4" />
          Nueva OP
        </Link>
      </div>

      {/* Empty state */}
      {ops.length === 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-4">
            <Factory className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No hay órdenes de producción</p>
          <p className="text-muted-foreground text-body-sm mt-1">
            Crea una OP desde una OV confirmada para enviarla al taller
          </p>
          <Link
            href="/ordenes-produccion/nueva"
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset"
          >
            <Plus className="w-4 h-4" />
            Crear primera OP
          </Link>
        </div>
      )}

      {/* Lista */}
      {ops.length > 0 && (
        <div className="space-y-3">
          {ops.map((op) => {
            const taller = op.terceros
            const ov = op.ordenes_venta
            const cliente = ov?.terceros

            return (
              <Link
                key={op.id}
                href={`/ordenes-produccion/${op.id}`}
                className="block rounded-2xl bg-neu-base shadow-neu p-5 transition-all hover:shadow-neu-lg active:shadow-neu-inset"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neu-base shadow-neu-inset flex items-center justify-center shrink-0">
                      <Factory className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-body-md">{op.codigo}</span>
                        <OPStatusBadge estado={op.estado} />
                        {ov && (
                          <span className="text-xs text-muted-foreground bg-neu-base shadow-neu-inset rounded-full px-2 py-0.5">
                            {ov.codigo}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-body-sm mt-0.5">
                        {taller?.nombre ?? 'Taller desconocido'}
                        {cliente && ` · ${cliente.nombre}`}
                        {` · Promesa: ${formatDate(op.fecha_promesa)}`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
