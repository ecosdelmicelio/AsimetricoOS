import { Package } from 'lucide-react'
import { getBodegasActivas } from '@/features/wms/services/bodegas-actions'
import { WMSPanel } from '@/features/wms/components/wms-panel'
import { PageHeader } from '@/shared/components/page-header'

export default async function WMSPage() {
  return (
    <div className="space-y-6 h-full">
      <PageHeader
        title="Gestión de Bodegas"
        subtitle="Gestión de bodegas, bines y traslados de inventario"
        icon={Package}
      />

      <div className="flex-1 overflow-hidden">
        <WMSPanel />
      </div>
    </div>
  )
}
