import { Suspense } from 'react'
import { getProductos } from '@/features/productos/services/producto-actions'
import { getAtributosPT } from '@/features/productos/services/atributo-actions'
import { getSaldosTotalesPorProducto } from '@/features/kardex/services/kardex-actions'
import { getMateriales as getBOMCatalogo, getServiciosOperativos as getBOMServicios } from '@/features/productos/services/bom-actions'
import { getMateriales } from '@/features/materiales/services/materiales-actions'
import { getMarcas } from '@/features/configuracion/services/marcas-actions'
import { getTipoServicioAtributos } from '@/features/servicios/services/atributo-servicio-actions'
import { getServiciosOperativos, getServiciosEjecutores } from '@/features/servicios/services/servicios-actions'
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
    getBOMServicios(),
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

async function ServiciosContent() {
  const [servicios, atributosServicio, ejecutoresServicios] = await Promise.all([
    getServiciosOperativos(),
    getTipoServicioAtributos(),
    getServiciosEjecutores(),
  ])

  return {
    servicios,
    tipos: atributosServicio.filter(a => a.atributo_tipo === 'tipo'),
    subtipos: atributosServicio.filter(a => a.atributo_tipo === 'subtipo'),
    detalles: atributosServicio.filter(a => a.atributo_tipo === 'detalle'),
    ejecutores: ejecutoresServicios,
  }
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

export default async function ProductosPage() {
  const serviciosData = await ServiciosContent()

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
        servicios={serviciosData.servicios}
        atributosServicio={serviciosData.tipos.concat(serviciosData.subtipos).concat(serviciosData.detalles)}
        tipos={serviciosData.tipos}
        subtipos={serviciosData.subtipos}
        detalles={serviciosData.detalles}
        ejecutoresServicios={serviciosData.ejecutores}
      />
    </div>
  )
}
