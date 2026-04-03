import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ProductoList } from '@/features/productos/components/producto-list'
import { MaterialesPanel } from '@/features/materiales/components/materiales-panel'
import { getMateriales } from '@/features/materiales/services/materiales-actions'
import { getSchemaByEntidad } from '@/features/codigo-schema/services/schema-actions'
import { ProductosTabs } from '@/features/productos/components/productos-tabs'

async function MaterialesContent() {
  const [materiales, schema] = await Promise.all([
    getMateriales(),
    getSchemaByEntidad('material'),
  ])
  return <MaterialesPanel materiales={materiales} schema={schema} />
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-14 rounded-xl bg-neu-base shadow-neu animate-pulse" />
      ))}
    </div>
  )
}

export default function ProductosPage() {
  return (
    <div className="space-y-6">
      <ProductosTabs
        productosContent={
          <>
            <div className="flex justify-end">
              <Link
                href="/productos/nuevo"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo producto
              </Link>
            </div>
            <Suspense fallback={<Skeleton />}>
              <ProductoList />
            </Suspense>
          </>
        }
        materialesContent={
          <Suspense fallback={<Skeleton />}>
            <MaterialesContent />
          </Suspense>
        }
      />
    </div>
  )
}
