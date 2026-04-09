import { Package } from 'lucide-react'
import { getBodegasActivas } from '@/features/wms/services/bodegas-actions'
import { WMSPanel } from '@/features/wms/components/wms-panel'
import { PageHeader } from '@/shared/components/page-header'

export default async function WMSPage() {
  const bodegas = await getBodegasActivas()

  return (
    <div className="space-y-6 h-full">
      <PageHeader
        title="Warehouse Management"
        subtitle="Gestión de bodegas, bines y traslados de inventario"
        icon={Package}
      />

      <div className="flex-1 overflow-hidden">
        <WMSPanel bodegas={bodegas} />
      </div>
    </div>
  )
}
