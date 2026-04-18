import { Suspense } from 'react'
import { getGastos, getCategoriasGastos } from '@/features/finanzas/services/gastos-actions'
import { getPresupuestos, getConsolidadoBudget } from '@/features/finanzas/services/presupuestos-actions'
import { getAllTerceros } from '@/features/terceros/services/terceros-actions'
import { getEstadoResultados, getBalanceGeneral, getBreakEven, getCCE } from '@/features/finanzas/services/estados-financieros-actions'
import { getFlujoCaja90Dias } from '@/features/finanzas/services/flujo-caja-actions'
import { GastosPanel } from '@/features/finanzas/components/gastos-panel'
import { PresupuestoMonitor } from '@/features/finanzas/components/presupuesto-monitor'
import { PresupuestoManager } from '@/features/finanzas/components/presupuesto-manager'
import { EstadoResultados } from '@/features/finanzas/components/estado-resultados'
import { FlujoCajaPanel } from '@/features/finanzas/components/flujo-caja-panel'
import { BalanceGeneral } from '@/features/finanzas/components/balance-general'
import { IndicadoresPanel } from '@/features/finanzas/components/indicadores-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

export const dynamic = 'force-dynamic'

export default async function FinanzasPage() {
  const anio = new Date().getFullYear()
  const mes  = new Date().getMonth() + 1

  const [
    gastosRaw,
    categorias,
    terceros,
    presupuestos,
    consolidado,
    estadoResultados,
    balanceGeneral,
    breakeven,
    cce,
    flujoCaja,
  ] = await Promise.all([
    getGastos({ mes, anio }),
    getCategoriasGastos(),
    getAllTerceros(),
    getPresupuestos(anio),
    getConsolidadoBudget(mes, anio),
    getEstadoResultados(mes, anio),
    getBalanceGeneral(anio),
    getBreakEven(mes, anio),
    getCCE(mes, anio),
    getFlujoCaja90Dias(),
  ])

  return (
    <div className="space-y-4">
      <div className="pb-2">
        <h1 className="text-display-xs font-bold text-foreground">Inteligencia Financiera</h1>
        <p className="text-body-sm text-muted-foreground">CFO Digital — Visibilidad completa en tiempo real</p>
      </div>

      <Tabs defaultValue="resultados" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-neu-base shadow-neu p-1 rounded-xl inline-flex gap-1 min-w-max">
            <TabsTrigger value="resultados">Estado de Resultados</TabsTrigger>
            <TabsTrigger value="flujo">Flujo de Caja 90d</TabsTrigger>
            <TabsTrigger value="balance">Balance General</TabsTrigger>
            <TabsTrigger value="indicadores">Break-Even / CCE</TabsTrigger>
            <TabsTrigger value="gastos">Gastos y Egresos</TabsTrigger>
            <TabsTrigger value="presupuesto">Presupuesto Real vs Plan</TabsTrigger>
            <TabsTrigger value="config">Configurar Metas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="resultados">
          <Suspense fallback={<p className="text-muted-foreground text-sm p-8">Calculando P&L...</p>}>
            <EstadoResultados
              lineas={estadoResultados.lineas}
              resumen={estadoResultados.resumen}
              mes={mes}
              anio={anio}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="flujo">
          <Suspense fallback={<p className="text-muted-foreground text-sm p-8">Proyectando flujo de caja...</p>}>
            <FlujoCajaPanel
              lineas={flujoCaja.lineas}
              resumen_30d={flujoCaja.resumen_30d}
              resumen_60d={flujoCaja.resumen_60d}
              resumen_90d={flujoCaja.resumen_90d}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="balance">
          <Suspense fallback={<p className="text-muted-foreground text-sm p-8">Cargando balance...</p>}>
            <BalanceGeneral data={balanceGeneral} anio={anio} />
          </Suspense>
        </TabsContent>

        <TabsContent value="indicadores">
          <Suspense fallback={<p className="text-muted-foreground text-sm p-8">Calculando indicadores...</p>}>
            <IndicadoresPanel breakeven={breakeven} cce={cce} />
          </Suspense>
        </TabsContent>

        <TabsContent value="gastos">
          <Suspense fallback={<p className="text-muted-foreground text-sm p-8">Cargando gastos...</p>}>
            <GastosPanel
              initialGastos={gastosRaw.data || []}
              categorias={categorias}
              terceros={terceros}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="presupuesto">
          <Suspense fallback={<p className="text-muted-foreground text-sm p-8">Cargando monitoreo...</p>}>
            <div className="space-y-6">
              <div className="rounded-2xl bg-neu-base shadow-neu p-6">
                <h2 className="text-title-sm font-bold text-foreground">Ejecución Presupuestal</h2>
                <p className="text-body-sm text-muted-foreground">Comparativa mes actual vs límites establecidos — {anio}</p>
              </div>
              <PresupuestoMonitor data={consolidado} />
            </div>
          </Suspense>
        </TabsContent>

        <TabsContent value="config">
          <Suspense fallback={<p className="text-muted-foreground text-sm p-8">Cargando configuración...</p>}>
            <PresupuestoManager initialPresupuestos={presupuestos.data || []} anioActual={anio} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
