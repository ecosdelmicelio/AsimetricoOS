import Link from 'next/link'
import { Factory, Calendar, Package, ArrowRight } from 'lucide-react'
import { OPStatusBadge } from '@/features/ordenes-produccion/components/op-status-badge'
import { formatDate } from '@/shared/lib/utils'

interface OPMinimal {
  id: string
  codigo: string
  estado: string
  fecha_promesa: string
  terceros: { nombre: string } | null
  op_detalle: { cantidad_asignada: number }[]
}

interface Props {
  ops: OPMinimal[]
  totalOV: number
}

export function OVProduccion({ ops, totalOV }: Props) {
  const totalAsignado = ops.reduce((acc, op) => 
    acc + op.op_detalle.reduce((sum, d) => sum + d.cantidad_asignada, 0), 0
  )
  
  const porcentajeAsignado = Math.min(100, Math.round((totalAsignado / totalOV) * 100))

  return (
    <div className="space-y-6">
      {/* Resumen de Asignación */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Progreso de Producción</h3>
            <p className="text-body-sm text-muted-foreground">
              {totalAsignado} de {totalOV} unidades asignadas a taller
            </p>
          </div>
          <div className="text-right">
            <span className="text-display-xs font-bold text-primary-600">{porcentajeAsignado}%</span>
          </div>
        </div>
        
        <div className="w-full h-3 bg-black/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-500" 
            style={{ width: `${porcentajeAsignado}%` }}
          />
        </div>
      </div>

      {/* Lista de OPs */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-body-md px-1">Órdenes de Producción Vinculadas</h3>
        
        {ops.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-black/5 p-8 text-center">
            <Factory className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-body-sm">No hay órdenes de producción para esta OV</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {ops.map((op) => {
              const udsOP = op.op_detalle.reduce((s, d) => s + d.cantidad_asignada, 0)
              
              return (
                <Link 
                  key={op.id}
                  href={`/ordenes-produccion/${op.id}`}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-neu-base shadow-neu hover:shadow-neu-lg transition-all active:shadow-neu-inset"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <Factory className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{op.codigo}</span>
                        <OPStatusBadge estado={op.estado as any} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {op.terceros?.nombre ?? 'Taller desconocido'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="hidden sm:block text-right">
                      <div className="flex items-center gap-1.5 justify-end text-muted-foreground mb-0.5">
                        <Package className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Unidades</span>
                      </div>
                      <p className="text-body-sm font-semibold text-foreground">{udsOP}</p>
                    </div>

                    <div className="hidden sm:block text-right">
                      <div className="flex items-center gap-1.5 justify-end text-muted-foreground mb-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Promesa</span>
                      </div>
                      <p className="text-body-sm font-semibold text-foreground">{formatDate(op.fecha_promesa)}</p>
                    </div>

                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
