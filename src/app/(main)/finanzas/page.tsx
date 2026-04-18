import { Suspense } from 'react'
import { getGastos, getCategoriasGastos } from '@/features/finanzas/services/gastos-actions'
import { getPresupuestos, getConsolidadoBudget } from '@/features/finanzas/services/presupuestos-actions'
import { getAllTerceros } from '@/features/terceros/services/terceros-actions'
import { GastosPanel } from '@/features/finanzas/components/gastos-panel'
import { PresupuestoMonitor } from '@/features/finanzas/components/presupuesto-monitor'
import { PresupuestoManager } from '@/features/finanzas/components/presupuesto-manager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

export const dynamic = 'force-dynamic'

export default async function FinanzasPage() {
  const anio = new Date().getFullYear()
  const mes = new Date().getMonth() + 1

  // Fetch data in parallel
  const [
    gastosRaw,
    categorias,
    terceros,
    presupuestos,
    consolidado
  ] = await Promise.all([
    getGastos({ mes, anio }),
    getCategoriasGastos(),
    getAllTerceros(),
    getPresupuestos(anio),
    getConsolidadoBudget(mes, anio)
  ])

  const gastos = gastosRaw.data || []

  return (
    <div className="space-y-6">
      <Tabs defaultValue="gastos" className="w-full">
        <div className="flex items-center justify-between mb-2">
          <TabsList className="bg-neu-base shadow-neu p-1 rounded-xl">
            <TabsTrigger value="gastos">Gastos y Egresos</TabsTrigger>
            <TabsTrigger value="monitoreo">Presupuesto Real vs Plan</TabsTrigger>
            <TabsTrigger value="config">Configurar Metas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="gastos">
          <Suspense fallback={<div>Cargando panel de gastos...</div>}>
            <GastosPanel 
              initialGastos={gastos} 
              categorias={categorias} 
              terceros={terceros} 
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="monitoreo">
          <Suspense fallback={<div>Cargando monitoreo financiero...</div>}>
             <div className="space-y-6">
               <div className="rounded-2xl bg-neu-base shadow-neu p-6">
                  <h2 className="text-title-sm font-bold text-foreground">Estado de Ejecución Presupuestal</h2>
                  <p className="text-body-sm text-muted-foreground">Comparativa mes actual ({anio}) vs límites establecidos.</p>
               </div>
               <PresupuestoMonitor data={consolidado} />
             </div>
          </Suspense>
        </TabsContent>

        <TabsContent value="config">
          <Suspense fallback={<div>Cargando configuración...</div>}>
            <PresupuestoManager initialPresupuestos={presupuestos.data || []} anioActual={anio} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
