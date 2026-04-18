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

      {/* Kanban Board (Client Component para tooltips y visual data handling) */}
      {desarrollos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-neu-base/30 rounded-2xl border-2 border-dashed border-border/40">
          <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay muestras en laboratorio aún</p>
          <p className="text-sm mt-1">Sube la primera Ficha de Alta Resolución para arrancar un sprint.</p>
        </div>
      ) : (
        <div className="w-full">
          <DesarrolloKanbanBoard desarrollos={desarrollos} />
        </div>
      )}
    </div>
  )
}

