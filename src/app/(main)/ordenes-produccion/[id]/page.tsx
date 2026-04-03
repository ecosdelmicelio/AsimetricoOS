import { Suspense } from 'react'
import { OPDetail } from '@/features/ordenes-produccion/components/op-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OPDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="max-w-3xl mx-auto">
      <Suspense fallback={<OPDetailSkeleton />}>
        <OPDetail id={id} />
      </Suspense>
    </div>
  )
}

function OPDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-neu-base shadow-neu animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
          <div className="h-4 w-28 rounded-lg bg-neu-base shadow-neu-inset animate-pulse" />
        </div>
      </div>
      <div className="h-28 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
    </div>
  )
}
