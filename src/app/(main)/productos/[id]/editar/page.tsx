import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getProductoById } from '@/features/productos/services/producto-actions'
import { getAtributosPT, getAtributosProducto } from '@/features/productos/services/atributo-actions'
import { ProductoEditForm } from '@/features/productos/components/producto-edit-form'
import { TIPOS_ATRIBUTO } from '@/features/productos/types/atributos'
import type { TipoAtributo } from '@/features/productos/types/atributos'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params
  const [producto, atributosPT, atributosProducto] = await Promise.all([
    getProductoById(id),
    getAtributosPT(),
    getAtributosProducto(id),
  ])

  if (!producto) notFound()

  // Agrupar atributos por tipo
  const atributosAgrupados: Record<TipoAtributo, typeof atributosPT> = {
    tipo: [],
    fit: [],
    superior: [],
    inferior: [],
    capsula: [],
    diseno: [],
    color: [],
    genero: [],
  }

  atributosPT.forEach(attr => {
    if (TIPOS_ATRIBUTO.includes(attr.tipo as TipoAtributo)) {
      atributosAgrupados[attr.tipo as TipoAtributo].push(attr)
    }
  })

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
        <ProductoEditForm producto={producto} atributos={atributosAgrupados} atributosProducto={atributosProducto} />
      </div>
    </div>
  )
}
