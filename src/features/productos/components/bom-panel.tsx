import { getBOMProducto, getMateriales, getServiciosOperativos } from '@/features/productos/services/bom-actions'
import { BOMEditor } from './bom-editor'

interface Props {
  productoId: string
  precioBase: number | null
}

export async function BOMPanel({ productoId, precioBase }: Props) {
  const [bom, catalogoMateriales, catalogoServicios] = await Promise.all([
    getBOMProducto(productoId),
    getMateriales(),
    getServiciosOperativos(),
  ])

  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-foreground text-body-md">Lista de Materiales (BOM)</h2>
        <p className="text-muted-foreground text-body-sm mt-0.5">
          Receta de materiales e insumos + ruta de servicios de manufactura
        </p>
      </div>

      <BOMEditor
        productoId={productoId}
        materiales={bom.materiales}
        servicios={bom.servicios}
        catalogoMateriales={catalogoMateriales}
        catalogoServicios={catalogoServicios}
        precioBase={precioBase}
        costoTotal={bom.costo_total}
        costoMateriales={bom.costo_materiales}
        costoServicios={bom.costo_servicios}
      />
    </div>
  )
}
