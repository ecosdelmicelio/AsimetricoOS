import Link from 'next/link'
import { ArrowLeft, Edit } from 'lucide-react'
import { getProductoById } from '@/features/productos/services/producto-actions'
import { ProductoEstadoToggle } from './producto-estado-toggle'
import { BOMPanel } from './bom-panel'
import { formatCurrency } from '@/shared/lib/utils'

interface Props { id: string }

export async function ProductoDetail({ id }: Props) {
  const producto = await getProductoById(id)

  if (!producto) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <p className="font-medium text-foreground">Producto no encontrado</p>
        <Link href="/productos" className="text-primary-600 text-body-sm mt-2 inline-block">
          ← Volver
        </Link>
      </div>
    )
  }

  const esActivo = producto.estado === 'activo'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/productos"
            className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-xl">
                {producto.referencia}
              </span>
              {!esActivo && (
                <span className="text-xs text-muted-foreground bg-neu-base shadow-neu-inset px-2 py-0.5 rounded-lg">
                  Descontinuado
                </span>
              )}
            </div>
            <h1 className="text-display-xs font-heading font-bold text-foreground mt-1">
              {producto.nombre}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ProductoEstadoToggle productoId={producto.id} estadoActual={producto.estado} />
          <Link
            href={`/productos/${producto.id}/editar`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-muted-foreground font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
          >
            <Edit className="w-3.5 h-3.5" />
            Editar
          </Link>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoCard label="Categoría" value={producto.categoria} />
        <InfoCard label="Color" value={producto.color ?? '—'} />
        <InfoCard
          label="Precio base"
          value={producto.precio_base ? formatCurrency(producto.precio_base) : 'Sin precio'}
        />
        <InfoCard label="Estado" value={esActivo ? 'Activo' : 'Descontinuado'} />
      </div>

      {/* BOM */}
      <BOMPanel productoId={producto.id} precioBase={producto.precio_base} />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-4">
      <p className="text-muted-foreground text-body-sm mb-1 capitalize">{label}</p>
      <p className="font-semibold text-foreground text-body-sm capitalize">{value}</p>
    </div>
  )
}
