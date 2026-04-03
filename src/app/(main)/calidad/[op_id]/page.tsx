import { Suspense } from 'react'
import { InspeccionPanel } from '@/features/calidad/components/inspeccion-panel'

interface Props {
  params: Promise<{ op_id: string }>
}

export default async function InspeccionPage({ params }: Props) {
  const { op_id } = await params

  return (
    <div className="max-w-2xl mx-auto">
      <Suspense fallback={<InspeccionSkeleton />}>
        <InspeccionPanel op_id={op_id} />
      </Suspense>
    </div>
  )
}

function InspeccionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-neu-base shadow-neu animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-xl bg-neu-base shadow-neu-inset animate-pulse" />
          <div className="h-4 w-52 rounded-lg bg-neu-base shadow-neu-inset animate-pulse" />
        </div>
      </div>
      <div className="h-48 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
      <div className="h-32 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
    </div>
  )
}
