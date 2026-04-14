import { FlaskConical, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { getDesarrollos } from '@/features/desarrollo/services/desarrollo-actions'
import { DesarrolloCard } from './desarrollo-card'
import { PageHeader } from '@/shared/components/page-header'
import type { DesarrolloConRelaciones } from '@/features/desarrollo/types'

export async function DesarrolloList() {
  const result = await getDesarrollos()
  const desarrollos = result.data as DesarrolloConRelaciones[]

  // KPIs rápidos
  const activos    = desarrollos.filter(d => !['graduated','cancelled'].includes(d.status)).length
  const enOpsRev   = desarrollos.filter(d => d.status === 'ops_review').length
  const graduados  = desarrollos.filter(d => d.status === 'graduated').length
  const cancelados = desarrollos.filter(d => d.status === 'cancelled').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Desarrollo de Muestras"
        subtitle={`${activos} activos · ${graduados} graduados`}
        icon={FlaskConical}
        action={{ label: 'Nuevo Desarrollo', href: '/desarrollo/nuevo' }}
      />

      {/* Dashboard link */}
      <div className="flex justify-end">
        <Link href="/desarrollo/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition-colors">
          <BarChart2 className="w-3.5 h-3.5" /> Ver Dashboard
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Activos" value={activos} color="text-blue-600" />
        <KpiCard label="En Revisión Ops" value={enOpsRev} color="text-amber-600" />
        <KpiCard label="Graduados" value={graduados} color="text-emerald-600" />
        <KpiCard label="Cancelados" value={cancelados} color="text-red-500" />
      </div>

      {/* Lista */}
      {desarrollos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay desarrollos aún</p>
          <p className="text-sm mt-1">Crea el primer desarrollo para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {desarrollos.map(d => (
            <DesarrolloCard key={d.id} desarrollo={d} />
          ))}
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  )
}
