import { DespachosList } from '@/features/ordenes-venta/components/despachos-list'
import { getDespachosList } from '@/features/ordenes-venta/services/despachos-actions'

export default async function DespachosPage() {
  const despachos = await getDespachosList()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display-xs font-heading font-bold text-foreground">Despachos</h1>
        <p className="text-muted-foreground text-body-sm mt-1">
          Historial y seguimiento de todos los despachos a clientes
        </p>
      </div>

      <DespachosList despachos={despachos} />
    </div>
  )
}
