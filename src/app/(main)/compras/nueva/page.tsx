import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CompraForm } from '@/features/compras/components/compra-form'
import { getProveedores } from '@/features/compras/services/compras-actions'

export default async function NuevaCompraPage() {
  const proveedores = await getProveedores()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/compras"
          className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Compras
        </Link>
        <h1 className="text-display-xs font-heading font-bold text-foreground">Nueva Orden de Compra</h1>
        <p className="text-muted-foreground text-body-sm mt-1">Registra la compra y luego ingresa los rollos recibidos</p>
      </div>

      <CompraForm proveedores={proveedores} />
    </div>
  )
}
