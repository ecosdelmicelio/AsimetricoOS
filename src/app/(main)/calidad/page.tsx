import { Suspense } from 'react'
import { CalidadList } from '@/features/calidad/components/calidad-list'
import { RecepcionesList } from '@/features/calidad/components/recepciones-list'
import { CalidadTabs } from '@/features/calidad/components/calidad-tabs'
import { CalidadConfigForm } from '@/features/calidad/components/calidad-config-form'
import { getCalidadConfig } from '@/features/calidad/services/calidad-config-actions'
import { PageHeader } from '@/shared/components/page-header'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { QualityAnalytics } from '@/features/calidad/components/quality-analytics'

export default async function CalidadPage() {
  const config = await getCalidadConfig()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calidad Inteligente"
        subtitle="Monitoreo estratégico de producción y compras"
        icon={ShieldCheck}
      />

      <CalidadTabs 
        produccion={
          <Suspense fallback={<ListSkeleton />}>
            <CalidadList />
          </Suspense>
        }
        recepciones={
          <Suspense fallback={<ListSkeleton />}>
            <RecepcionesList />
          </Suspense>
        }
        analitica={
          <Suspense fallback={<ListSkeleton />}>
            <QualityAnalytics />
          </Suspense>
        }
        configuracion={
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
            <CalidadConfigForm config={config} />
          </div>
        }
      />
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 rounded-[2.5rem] bg-white border border-slate-100 animate-pulse flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-slate-200 animate-spin" />
        </div>
      ))}
    </div>
  )
}
