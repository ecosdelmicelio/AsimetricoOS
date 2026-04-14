import { Suspense } from 'react'
import { DesarrolloList } from '@/features/desarrollo/components/desarrollo-list'
import { FlaskConical } from 'lucide-react'

export default function DesarrolloPage() {
  return (
    <Suspense fallback={<DesarrolloListSkeleton />}>
      <DesarrolloList />
    </Suspense>
  )
}

function DesarrolloListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-slate-100 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-5 w-52 rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-3 w-32 rounded-lg bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="h-9 w-36 rounded-xl bg-slate-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
