import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getProductoById } from '@/features/productos/services/producto-actions'
import { ProductoEditForm } from '@/features/productos/components/producto-edit-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params
  const producto = await getProductoById(id)

  if (!producto) notFound()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/productos/${id}`}
          className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-display-xs font-heading font-bold text-foreground">Editar Producto</h1>
          <p className="text-muted-foreground text-body-sm mt-0.5">{producto.referencia} — {producto.nombre}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-neu-base shadow-neu p-6">
        <ProductoEditForm producto={producto} />
      </div>
    </div>
  )
}
