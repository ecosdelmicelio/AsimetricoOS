import Link from 'next/link'
import { ClipboardList, Plus, ChevronRight } from 'lucide-react'
import { getOrdenesVenta } from '@/features/ordenes-venta/services/ov-actions'
import { OVStatusBadge } from './ov-status-badge'
import { formatDate } from '@/shared/lib/utils'
import type { OrdenVenta } from '@/features/ordenes-venta/types'

type OVListItem = OrdenVenta & { terceros: { nombre: string } | null }

export async function OVList() {
  const result = await getOrdenesVenta()
  const ovs = result.data as OVListItem[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-xs font-heading text-foreground font-bold">Órdenes de Venta</h1>
          <p className="text-muted-foreground text-body-sm mt-1">{ovs.length} órdenes registradas</p>
        </div>
        <Link
          href="/ordenes-venta/nueva"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
        >
          <Plus className="w-4 h-4" />
          Nueva OV
        </Link>
      </div>

      {/* Empty state */}
      {ovs.length === 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No hay órdenes de venta</p>
          <p className="text-muted-foreground text-body-sm mt-1">
            Crea tu primera OV para comenzar el flujo de producción
          </p>
          <Link
            href="/ordenes-venta/nueva"
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset"
          >
            <Plus className="w-4 h-4" />
            Crear primera OV
          </Link>
        </div>
      )}

      {/* List */}
      {ovs.length > 0 && (
        <div className="space-y-3">
          {ovs.map((ov) => {
            const cliente = ov.terceros
            return (
              <Link
                key={ov.id}
                href={`/ordenes-venta/${ov.id}`}
                className="block rounded-2xl bg-neu-base shadow-neu p-5 transition-all hover:shadow-neu-lg active:shadow-neu-inset"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-neu-base shadow-neu-inset flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5 text-primary-500" />
                    </div>
                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-body-md">{ov.codigo}</span>
                        <OVStatusBadge estado={ov.estado} />
                      </div>
                      <p className="text-muted-foreground text-body-sm mt-0.5">
                        {cliente?.nombre ?? 'Cliente desconocido'} · Entrega: {formatDate(ov.fecha_entrega)}
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
