import { BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { getDashboardGeneral } from '@/features/desarrollo/services/dashboard-actions'
import { DashboardGeneral } from '@/features/desarrollo/components/dashboard-general'
import { PageHeader } from '@/shared/components/page-header'

export default async function DesarrolloDashboardPage() {
  const { data, error } = await getDashboardGeneral()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard — Desarrollo de Muestras"
        subtitle="Métricas del ciclo de vida de productos"
        icon={BarChart2}
        action={{ label: 'Ver Lista', href: '/desarrollo', icon: BarChart2 }}
      />

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          Error cargando dashboard: {error}
        </div>
      )}

      {!data && !error && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-400">Sin datos para mostrar</p>
        </div>
      )}

      {data && <DashboardGeneral data={data} />}

      {/* Links a otros dashboards */}
      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Otros Dashboards</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/desarrollo" className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-primary-300 transition-colors">
            ← Volver a Lista
          </Link>
        </div>
      </div>
    </div>
  )
}
