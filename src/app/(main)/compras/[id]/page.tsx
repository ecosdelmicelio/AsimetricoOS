import { Suspense } from 'react'
import { CompraDetail } from '@/features/compras/components/compra-detail'

function CompraDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-20 rounded-lg bg-neu-base shadow-neu-inset animate-pulse" />
        <div className="h-8 w-40 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
        <div className="h-4 w-32 rounded-lg bg-neu-base shadow-neu-inset animate-pulse" />
      </div>
      <div className="h-40 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
      <div className="h-32 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
      <div className="h-64 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
    </div>
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompraDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <Suspense fallback={<CompraDetailSkeleton />}>
      <CompraDetail id={id} />
    </Suspense>
  )
}
