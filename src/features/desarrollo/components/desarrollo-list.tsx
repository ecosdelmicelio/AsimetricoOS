import { FlaskConical } from 'lucide-react'
import { getDesarrollos } from '@/features/desarrollo/services/desarrollo-actions'
import { DesarrolloKanbanBoard } from './desarrollo-kanban'
import { IndicadoresDesarrolloHeader } from './indicadores-desarrollo'
import { PageHeader } from '@/shared/components/page-header'
import type { DesarrolloConRelaciones } from '@/features/desarrollo/types'

export async function DesarrolloList() {
  const result = await getDesarrollos()
  const desarrollos = result.data as DesarrolloConRelaciones[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="I+D y Muestreo (PLM)"
        subtitle="Sprints activos de desarrollo y certificaciones de diseño."
        icon={FlaskConical}
        action={{ label: 'Nuevo Desarrollo', href: '/desarrollo/nuevo' }}
      />

      {/* Analytics Header (Client Component para el cruzamiento de Hooks y tiempos en JS si es necesario) */}
      <IndicadoresDesarrolloHeader desarrollos={desarrollos} />

      {desarrollos.length === 0 ? (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-24 flex flex-col items-center text-center max-w-2xl mx-auto mt-12 group">
          <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <FlaskConical className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-900 font-black text-2xl tracking-tighter uppercase">Laboratorio de I+D Vacío</p>
          <p className="text-slate-400 text-sm mt-3 max-w-sm font-medium leading-relaxed">
            Aún no hay muestras en el pipeline de desarrollo. Sube la primera ficha técnica de alta resolución para arrancar un nuevo sprint creativo.
          </p>
          <Link
            href="/desarrollo/nuevo"
            className="mt-10 flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Plus className="w-5 h-5" />
            Iniciar Nuevo Proyecto (PLM)
          </Link>
        </div>
      ) : (
        <div className="w-full">
          <DesarrolloKanbanBoard desarrollos={desarrollos} />
        </div>
      )}
    </div>
  )
}

