import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { LiquidacionList } from '@/features/liquidacion/components/liquidacion-list'

export default function LiquidacionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-xs font-heading text-foreground font-bold">Liquidaciones</h1>
          <p className="text-muted-foreground text-body-sm mt-1">
            Costos de servicio y pagos a talleres
          </p>
        </div>
        <Link
          href="/liquidacion/nueva"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva
        </Link>
      </div>

      <Suspense fallback={<LiquidacionListSkeleton />}>
        <LiquidacionList />
      </Suspense>
    </div>
  )
}

function LiquidacionListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 rounded-2xl bg-neu-base shadow-neu animate-pulse" />
      ))}
    </div>
  )
}
