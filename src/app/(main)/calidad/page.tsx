import { Suspense } from 'react'
import { CalidadList } from '@/features/calidad/components/calidad-list'

export default function CalidadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-xs font-heading text-foreground font-bold">Calidad</h1>
        <p className="text-muted-foreground text-body-sm mt-1">
          Inspecciones DuPro y FRI pendientes
        </p>
      </div>

      <Suspense fallback={<CalidadListSkeleton />}>
        <CalidadList />
      </Suspense>
    </div>
  )
}

function CalidadListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 rounded-xl bg-neu-base shadow-neu animate-pulse" />
      ))}
    </div>
  )
}
