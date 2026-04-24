import { Suspense } from 'react'
import { OPDetail } from '@/features/ordenes-produccion/components/op-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OPDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="w-full">
      <Suspense fallback={<OPDetailSkeleton />}>
        <OPDetail id={id} />
      </Suspense>
    </div>
  )
}

function OPDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse p-4 lg:p-0">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex flex-col lg:flex-row gap-6 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-48 bg-slate-50 rounded-lg" />
          <div className="h-3 w-32 bg-slate-50/50 rounded-md" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-slate-50 rounded-xl" />
          <div className="h-10 w-24 bg-slate-50 rounded-xl" />
        </div>
      </div>

      <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 p-10 h-64" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 h-32 shadow-sm" />
        ))}
      </div>
    </div>
  )
}
