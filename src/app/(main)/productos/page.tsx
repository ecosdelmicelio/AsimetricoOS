import { Suspense } from 'react'
import { getProductos } from '@/features/productos/services/producto-actions'
import { getAtributosPT } from '@/features/productos/services/atributo-actions'
import { getSaldosTotalesPorProducto } from '@/features/kardex/services/kardex-actions'
import { getMateriales as getBOMCatalogo, getServiciosOperativos } from '@/features/productos/services/bom-actions'
import { getMateriales } from '@/features/materiales/services/materiales-actions'
import { getMarcas } from '@/features/configuracion/services/marcas-actions'
import { ProductosPanel } from '@/features/productos/components/productos-panel'
import { MaterialesPanel } from '@/features/materiales/components/materiales-panel'
import { ProductosTabs } from '@/features/productos/components/productos-tabs'

async function ProductosContent() {
  const [productos, saldos, marcas, atributosPT, catalogoMateriales, catalogoServicios] = await Promise.all([
    getProductos(),
    getSaldosTotalesPorProducto(),
    getMarcas(),
    getAtributosPT(),
    getBOMCatalogo(),
    getServiciosOperativos(),
  ])
  return (
    <ProductosPanel
      productos={productos}
      marcas={marcas}
      atributosPT={atributosPT}
      saldosPorProducto={saldos}
      catalogoMateriales={catalogoMateriales}
      catalogoServicios={catalogoServicios}
    />
  )
}

async function MaterialesContent() {
  const materiales = await getMateriales()
  return <MaterialesPanel materiales={materiales} />
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
