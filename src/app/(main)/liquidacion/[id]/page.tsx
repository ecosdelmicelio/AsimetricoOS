import { Suspense } from 'react'
import { LiquidacionDetail } from '@/features/liquidacion/components/liquidacion-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LiquidacionDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="max-w-2xl mx-auto">
      <Suspense fallback={<LiquidacionDetailSkeleton />}>
        <LiquidacionDetail id={id} />
      </Suspense>
    </div>
  )
}

function LiquidacionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-neu-base shadow-neu animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
          <div className="h-4 w-52 rounded-lg bg-neu-base shadow-neu-inset animate-pulse" />
        </div>
      </div>
      <div className="h-56 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
        <div className="h-16 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
      </div>
    </div>
  )
}
