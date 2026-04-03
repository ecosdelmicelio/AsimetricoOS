import { Suspense } from 'react'
import { ProductoDetail } from '@/features/productos/components/producto-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductoDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="max-w-2xl mx-auto">
      <Suspense fallback={<ProductoDetailSkeleton />}>
        <ProductoDetail id={id} />
      </Suspense>
    </div>
  )
}

function ProductoDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-neu-base shadow-neu animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-24 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
          <div className="h-7 w-48 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
    </div>
  )
}
