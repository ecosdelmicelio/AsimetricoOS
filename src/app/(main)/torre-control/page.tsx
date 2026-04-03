import { Suspense } from 'react'
import { TorreControlDashboard } from '@/features/torre-control/components/torre-control-dashboard'

export default function TorreControlPage() {
  return (
    <Suspense fallback={<TorreControlSkeleton />}>
      <TorreControlDashboard />
    </Suspense>
  )
}

function TorreControlSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
        <div className="h-4 w-72 rounded-lg bg-neu-base shadow-neu-inset animate-pulse" />
      </div>

      {/* KPI skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
          ))}
        </div>
        <div className="space-y-6">
          <div className="h-48 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
          <div className="h-48 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
        </div>
      </div>
    </div>
  )
}
