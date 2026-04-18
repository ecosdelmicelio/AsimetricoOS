import { Suspense } from 'react'
import { TorreOperaciones } from '@/features/torre-control/components/torre-operaciones'

export default function OperacionesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-10 w-64 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <TorreOperaciones />
    </Suspense>
  )
}
