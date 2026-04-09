import { Suspense } from 'react'
import { CalidadList } from '@/features/calidad/components/calidad-list'
import { PageHeader } from '@/shared/components/page-header'
import { ShieldCheck } from 'lucide-react'

export default function CalidadPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Control de Calidad"
        subtitle="Inspecciones DuPro y FRI"
        icon={ShieldCheck}
      />

      <Suspense fallback={<CalidadListSkeleton />}>
        <CalidadList />
      </Suspense>
    </div>
  )
}

function CalidadListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 rounded-xl bg-neu-base shadow-neu animate-pulse" />
      ))}
    </div>
  )
}
