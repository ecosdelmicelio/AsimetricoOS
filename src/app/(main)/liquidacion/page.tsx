import { PageHeader } from '@/shared/components/page-header'
import { Calculator } from 'lucide-react'

export default function LiquidacionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidaciones"
        subtitle="Las liquidaciones se gestionan desde el detalle de cada Orden de Producción."
        icon={Calculator}
      />
    </div>
  )
}
