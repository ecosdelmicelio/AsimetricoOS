import Link from 'next/link'
import { getOrdenProduccionById, getHistorialOP, getOPProgressSummary } from '@/features/ordenes-produccion/services/op-actions'
import { getReporteCortePorOP } from '@/features/reporte-corte/services/reporte-corte-actions'
import { getEntregasByOP } from '@/features/entregas/services/entregas-actions'
import { getLiquidacionesByOP, getInsumosParaReporte, calcularResumenLiquidacion, getLiquidacionOP, getServiciosRef, getServiciosBOMParaOP } from '@/features/liquidacion/services/liquidacion-actions'
import { createClient } from '@/shared/lib/supabase/server'
import { OPDetailClient } from './op-detail-client'
import type { EstadoOP, OPConDetalle } from '@/features/ordenes-produccion/types'
import type { ReporteCorteCompleto } from '@/features/reporte-corte/types'

interface Props {
  id: string
}

export async function OPDetail({ id }: Props) {
  const ESTADOS_CON_INSUMOS: EstadoOP[] = ['en_terminado', 'entregada', 'liquidada']
  const ESTADOS_CON_LIQUIDACION: EstadoOP[] = ['entregada', 'liquidada']

  const supabase = await createClient()

  // Fetch paralelo base
  const [opRes, historialRes, reporteDataRes, entregasRes, liquidacionesOPRes, progressDataRes] = await Promise.all([
    getOrdenProduccionById(id),
    getHistorialOP(id),
    getReporteCortePorOP(id),
    getEntregasByOP(id),
    getLiquidacionesByOP(id),
    getOPProgressSummary(id),
  ])

  if (opRes.error || !opRes.data) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <p className="text-foreground font-medium">Orden no encontrada</p>
        <Link href="/ordenes-produccion" className="text-primary-600 text-body-sm mt-2 inline-block">
          ← Volver a la lista
        </Link>
      </div>
    )
  }

  const op = opRes.data as OPConDetalle
  const historial = historialRes.data
  const reporteData = {
    data: (reporteDataRes as any).data as ReporteCorteCompleto | null,
    dataAll: (reporteDataRes as any).dataAll as ReporteCorteCompleto[] | null
  }
  const entregas = entregasRes.data
  const liquidacionesOP = liquidacionesOPRes
  const progressData = progressDataRes

  const estadoOP = op.estado as EstadoOP
  const detalles = op.op_detalle ?? []
  const productoIdsOP = [...new Set(detalles.map(d => d.producto_id))]

  // Fetch condicionales
  const [insumosParaReporte, resumenLiquidacion, liquidacionAprobada, bodegasData, serviciosRef, serviciosBOM] = await Promise.all([
    ESTADOS_CON_INSUMOS.includes(estadoOP) ? getInsumosParaReporte(id) : Promise.resolve([]),
    ESTADOS_CON_LIQUIDACION.includes(estadoOP) ? calcularResumenLiquidacion(id) : Promise.resolve(null),
    ESTADOS_CON_LIQUIDACION.includes(estadoOP) ? getLiquidacionOP(id) : Promise.resolve(null),
    ['en_terminado', 'entregada', 'liquidada'].includes(estadoOP)
      ? supabase.from('bodegas').select('id, nombre').eq('activo', true).order('nombre')
      : Promise.resolve({ data: [] }),
    ESTADOS_CON_LIQUIDACION.includes(estadoOP) ? getServiciosRef(id) : Promise.resolve([]),
    ESTADOS_CON_LIQUIDACION.includes(estadoOP) ? getServiciosBOMParaOP(productoIdsOP) : Promise.resolve([]),
  ])

  const bodegas = (bodegasData?.data ?? []) as { id: string; nombre: string }[]
  const bodegaDestino = (op as any).bodega_destino_id ?? null

  return (
    <OPDetailClient 
      op={op}
      historial={historial}
      reporteData={reporteData}
      entregas={entregas ?? []}
      liquidacionesOP={liquidacionesOP}
      progressData={progressData}
      insumosParaReporte={insumosParaReporte}
      resumenLiquidacion={resumenLiquidacion}
      liquidacionAprobada={liquidacionAprobada}
      bodegas={bodegas}
      bodegaDestino={bodegaDestino}
      serviciosRef={serviciosRef}
      serviciosBOM={serviciosBOM}
      bodegaTallerId={op.bodega_taller_id}
    />
  )
}
