import { Suspense } from 'react'
import { getCapacidadData } from '@/features/torre-control/services/torre-actions'
import { CapacidadMaestra } from '@/features/torre-control/components/capacidad-maestra'
import { PageHeader } from '@/shared/components/page-header'
import { Calendar } from 'lucide-react'

export default async function CapacidadPage() {
  const data = await getCapacidadData()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Capacidad Maestra"
        subtitle="Planificación de carga y previsión de cuellos de botella"
        icon={Calendar}
      />
      
      <Suspense fallback={<div className="h-[60vh] bg-slate-50 rounded-[40px] animate-pulse" />}>
        <CapacidadMaestra data={data} />
      </Suspense>
    </div>
  )
}
