import { Suspense } from 'react'
import { TorreComercial } from '@/features/torre-control/components/torre-comercial'

export default function ComercialPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <TorreComercial />
    </Suspense>
  )
}
