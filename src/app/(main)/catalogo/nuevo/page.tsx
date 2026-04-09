import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProductoForm } from '@/features/productos/components/producto-form'
import { getAtributosPT } from '@/features/productos/services/atributo-actions'
import { getMarcas } from '@/features/configuracion/services/marcas-actions'
import { TIPOS_ATRIBUTO } from '@/features/productos/types/atributos'
import type { TipoAtributo } from '@/features/productos/types/atributos'

export default async function NuevoProductoPage() {
  const [atributosList, marcas] = await Promise.all([
    getAtributosPT(),
    getMarcas(),
  ])

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/catalogo"
          className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-display-xs font-heading font-bold text-foreground">Nuevo Item en Catálogo</h1>
          <p className="text-muted-foreground text-body-sm mt-0.5">
            Agrega una referencia al catálogo
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-neu-base shadow-neu p-6">
        <ProductoForm atributosPT={atributosList} marcas={marcas} />
      </div>
    </div>
  )
}
