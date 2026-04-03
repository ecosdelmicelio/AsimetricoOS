import { Suspense } from 'react'
import { OVList } from '@/features/ordenes-venta/components/ov-list'

export default function OrdenesVentaPage() {
  return (
    <Suspense fallback={<OVListSkeleton />}>
      <OVList />
    </Suspense>
  )
}

function OVListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
          <div className="h-4 w-32 rounded-lg bg-neu-base shadow-neu-inset animate-pulse" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-neu-base shadow-neu animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
        ))}
      </div>
    </div>
  )
}
