import { Suspense } from 'react'
import { getProductos } from '@/features/productos/services/producto-actions'
import { getSaldosTotalesPorProducto } from '@/features/kardex/services/kardex-actions'
import { getMateriales, getServiciosOperativos } from '@/features/productos/services/bom-actions'
import { getSchemaByEntidad } from '@/features/codigo-schema/services/schema-actions'
import { getMarcas } from '@/features/configuracion/services/marcas-actions'
import { ProductosPanel } from '@/features/productos/components/productos-panel'
import { MaterialesPanel } from '@/features/materiales/components/materiales-panel'
import { ProductosTabs } from '@/features/productos/components/productos-tabs'

async function ProductosContent() {
  const [productos, saldos, marcas, catalogoMateriales, catalogoServicios] = await Promise.all([
    getProductos(),
    getSaldosTotalesPorProducto(),
    getMarcas(),
    getMateriales(),
    getServiciosOperativos(),
  ])
  return (
    <ProductosPanel
      productos={productos}
      marcas={marcas}
      saldosPorProducto={saldos}
      catalogoMateriales={catalogoMateriales}
      catalogoServicios={catalogoServicios}
    />
  )
}

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
          <Suspense fallback={<Skeleton />}>
            <ProductosContent />
          </Suspense>
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
