import { Suspense } from 'react'
import { GerencialDashboard } from '@/features/torre-control/components/torre-gerencial'

export default function TorreControlPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <GerencialDashboard />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-xl bg-slate-100 animate-pulse" />
        <div className="h-4 w-80 rounded-lg bg-slate-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-36 rounded-3xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="space-y-6">
          <div className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
          <div className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
