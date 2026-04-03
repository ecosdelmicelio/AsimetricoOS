import { Suspense } from 'react'
import { OPList } from '@/features/ordenes-produccion/components/op-list'

export default function OrdenesProduccionPage() {
  return (
    <Suspense fallback={<OPListSkeleton />}>
      <OPList />
    </Suspense>
  )
}

function OPListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
          <div className="h-4 w-36 rounded-lg bg-neu-base shadow-neu-inset animate-pulse" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-neu-base shadow-neu animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
        ))}
      </div>
    </div>
  )
}
