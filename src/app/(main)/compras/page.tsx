import { Suspense } from 'react'
import { ComprasList } from '@/features/compras/components/compras-list'

function ComprasListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
          <div className="h-4 w-48 rounded-lg bg-neu-base shadow-neu-inset animate-pulse" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function ComprasPage() {
  return (
    <Suspense fallback={<ComprasListSkeleton />}>
      <ComprasList />
    </Suspense>
  )
}
