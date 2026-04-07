'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Globe, Clock, TrendingUp, DollarSign, Factory } from 'lucide-react'
import { OPStatusBadge } from './op-status-badge'
import { OPActions } from './op-actions'
import { OPStepper } from './op-stepper'
import { OPProgressMatrix } from './op-progress-matrix'
import { HistorialEstados } from '@/shared/components/historial-estados'
import { ReporteCortePanelClient } from '@/features/reporte-corte/components/reporte-corte-panel-client'
import { EntregasPanel } from '@/features/entregas/components/entregas-panel'
import { ReporteInsumosPanel } from '@/features/liquidacion/components/reporte-insumos-panel'
import { LiquidacionPanel } from '@/features/liquidacion/components/liquidacion-panel'
import type { EstadoOP, OPConDetalle, OPProgressLine } from '@/features/ordenes-produccion/types'
import type { ReporteCorteCompleto } from '@/features/reporte-corte/types'
import type { InsumoParaReporte, ResumenLiquidacion, ServicioRef } from '@/features/liquidacion/types'
import type { HistorialEstado } from '@/features/ordenes-venta/types'
import { formatDate, formatCurrency } from '@/shared/lib/utils'

interface OPDetailClientProps {
  op: OPConDetalle
  historial: HistorialEstado[]
  reporteData: { data: ReporteCorteCompleto | null; dataAll: ReporteCorteCompleto[] | null }
  entregas: any[]
  liquidacionesOP: any[]
  progressData: OPProgressLine[]
  insumosParaReporte: InsumoParaReporte[]
  resumenLiquidacion: ResumenLiquidacion | null
  liquidacionAprobada: any
  bodegas: { id: string; nombre: string }[]
  bodegaDestino: string | null
  serviciosRef: ServicioRef[]
  serviciosBOM: any[]
  bodegaTallerId: string | null
}

export function OPDetailClient({
  op,
  historial,
  reporteData,
  entregas,
  liquidacionesOP,
  progressData,
  insumosParaReporte,
  resumenLiquidacion,
  liquidacionAprobada,
  bodegas,
  bodegaDestino,
  serviciosRef,
  serviciosBOM,
  bodegaTallerId,
}: OPDetailClientProps) {
  const [activeOverlay, setActiveOverlay] = useState<'corte' | 'insumos' | 'entregas' | null>(null)
  const [reporteEditandoId, setReporteEditandoId] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveOverlay(null)
        setReporteEditandoId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const id = op.id
  const estadoOP = op.estado as EstadoOP
  const ESTADOS_CON_INSUMOS: EstadoOP[] = ['en_terminado', 'entregada', 'liquidada']
  const ESTADOS_CON_LIQUIDACION: EstadoOP[] = ['entregada', 'liquidada']
  
  const reportes = reporteData.dataAll ?? []
  const progressLines = progressData ?? []
  const taller = op.terceros
  const ov = op.ordenes_venta
  const detalles = op.op_detalle ?? []
  
  const hayReporteInsumos = insumosParaReporte.length > 0 && insumosParaReporte.every(i => i.ya_reportado)
  const totalUnidades = detalles.reduce((s, d) => s + d.cantidad_asignada, 0)

  const lineasOP = detalles.map(d => ({
    producto_id: d.producto_id,
    referencia: d.productos?.referencia ?? '',
    nombre: d.productos?.nombre ?? '',
    color: d.productos?.color ?? null,
    talla: d.talla,
    cantidad_asignada: d.cantidad_asignada,
  }))

  const now = new Date()
  const createdDate = new Date(op.created_at || op.fecha_promesa)
  const daysPast = Math.max(0, Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)))
  const entregasTotales = (entregas ?? []).reduce((s, e) => s + (e.entrega_detalle?.reduce((sd: number, d: any) => sd + d.cantidad_entregada, 0) || 0), 0)
  const costoTotal = liquidacionAprobada?.costo_total ?? resumenLiquidacion?.costo_total ?? 0
  const cpp = liquidacionAprobada?.cpp ?? resumenLiquidacion?.cpp ?? 0

  const reporteEnEdicion = reporteEditandoId 
    ? reportes.find(r => r.id === reporteEditandoId) 
    : null

  return (
    <div className="space-y-8 pb-20 max-w-[1400px] mx-auto">

      {/* 🏭 INDUSTRIAL PRODUCTION COMMAND CENTER HEADER */}
      <div className="rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 lg:px-8 lg:py-6">

          {/* Row 1: Identification & Metrics */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">

            {/* Identification & Workshop */}
            <div className="flex items-center gap-3 bg-slate-50/50 px-4 py-3 rounded-[1.25rem] border border-slate-100 flex-1 min-w-0 self-stretch">
              <Link
                href="/ordenes-produccion"
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-all shadow-sm shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1.5 mb-1">
                  <div className="flex items-center gap-2">
                    <OPStatusBadge estado={estadoOP} />
                    {ov && (
                      <Link
                        href={`/ordenes-venta/${op.ov_id}`}
                        className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase tracking-widest hover:bg-primary-600 transition-all"
                      >
                        {ov.codigo}
                      </Link>
                    )}
                  </div>
                  <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none whitespace-nowrap">
                    {op.codigo}
                  </h1>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[9px] uppercase tracking-widest leading-none">
                  <Factory className="w-3 h-3 text-primary-500" />
                  <span className="truncate">{taller?.nombre ?? 'TALLER NO DEFINIDO'}</span>
                </div>
              </div>
            </div>

            {/* Metrics Stripe */}
            <div className="grid grid-cols-3 gap-2 flex-[1.5] self-stretch">
              <MetricStripe
                icon={<Clock className="w-3 h-3 text-amber-500" />}
                label="Timeline / Aging"
                value={`T+${daysPast}d`}
                subValue={`Promesa: ${formatDate(op.fecha_promesa)}`}
              />
              <MetricStripe
                icon={<TrendingUp className="w-3 h-3 text-primary-500" />}
                label="Entregas / Fulfillment"
                value={`${entregasTotales}/${totalUnidades}`}
                subValue={`${Math.round((entregasTotales / totalUnidades) * 100 || 0)}% Unidades`}
              />
              <MetricStripe
                icon={<DollarSign className="w-3 h-3 text-emerald-500" />}
                label="Costo Producción"
                value={formatCurrency(costoTotal)}
                subValue={`CPP: ${formatCurrency(cpp)}`}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-40 self-start sticky top-4">
              <OPActions opId={id} estadoActual={op.estado} />
            </div>
          </div>

          {/* Consolidado Industrial: Stepper + Matriz */}
          <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 shadow-inner overflow-hidden">
            <div className="p-8 lg:p-10">
              <div className="mb-14">
                <OPStepper currentStatus={estadoOP} historial={historial} />
              </div>
              <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-6 flex flex-col gap-6">
                <OPProgressMatrix lines={progressLines} opEstado={estadoOP} />

                {op.notas && (
                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notas de Producción</span>
                    </div>
                    <p className="text-body-sm text-slate-600 font-medium bg-slate-50/50 p-4 rounded-xl border border-slate-100 italic leading-snug">
                      &quot;{op.notas}&quot;
                    </p>
                  </div>
                )}

                <div className="pt-6 mt-6 border-t border-slate-100 -mx-6 px-6 relative min-h-[14rem] flex-1">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full items-stretch">
                    <div className="h-full relative">
                      <ReporteCortePanelClient
                        opId={id}
                        estadoActual={op.estado}
                        reporte={null}
                        reportes={reporteData.dataAll ?? (reporteData.data ? [reporteData.data] : [])}
                        lineasOP={lineasOP}
                        bodegaTallerId={bodegaTallerId}
                        isEditing={activeOverlay === 'corte'}
                        reporteEnEdicion={reporteEnEdicion ?? null}
                        onStartEdit={(id) => {
                          setActiveOverlay('corte')
                          setReporteEditandoId(id)
                        }}
                        onStartCreate={() => {
                          setActiveOverlay('corte')
                          setReporteEditandoId(null)
                        }}
                        onEditComplete={() => {
                          setActiveOverlay(null)
                          setReporteEditandoId(null)
                        }}
                      />
                    </div>
                    
                    {ESTADOS_CON_INSUMOS.includes(estadoOP) && (
                      <div className="h-full relative">
                        <ReporteInsumosPanel
                          opId={id}
                          insumos={insumosParaReporte}
                          bloqueado={liquidacionAprobada?.estado === 'aprobada'}
                          estadoActual={estadoOP}
                          isEditing={activeOverlay === 'insumos'}
                          onStartEdit={() => setActiveOverlay('insumos')}
                          onEditComplete={() => setActiveOverlay(null)}
                        />
                      </div>
                    )}

                    <div className="h-full relative lg:col-span-2">
                       <EntregasPanel
                        opId={id}
                        opCodigo={op.codigo}
                        estadoActual={estadoOP}
                        entregas={entregas ?? []}
                        lineasOP={lineasOP}
                        totalUnidadesOP={totalUnidades}
                        liquidacionesPorEntrega={Object.fromEntries(
                          liquidacionesOP.filter(l => l.entrega_id).map(l => [l.entrega_id!, l.id])
                        )}
                        puedeEntregar={hayReporteInsumos || estadoOP === 'entregada'}
                        isEditing={activeOverlay === 'entregas'}
                        onStartEdit={() => setActiveOverlay('entregas')}
                        onEditComplete={() => setActiveOverlay(null)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Banner Origen USA */}
      {detalles.some((d: any) => d.productos?.origen_usa) && (
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50 border border-blue-200 px-5 py-3 mx-4 lg:mx-0">
          <Globe className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <p className="text-body-sm font-semibold text-blue-700">Origen USA 🇺🇸</p>
            <p className="text-xs text-blue-600">
              Esta orden contiene productos que requieren etiquetas en inglés, composición de fibras y origen &quot;Made in Colombia&quot;
            </p>
          </div>
        </div>
      )}



      {/* Panel de Liquidación */}
      {ESTADOS_CON_LIQUIDACION.includes(estadoOP) && resumenLiquidacion && (
        <LiquidacionPanel
          opId={id}
          opCodigo={op.codigo}
          resumenInicial={resumenLiquidacion}
          serviciosRefIniciales={serviciosRef}
          serviciosBOM={serviciosBOM}
          lineasOP={(() => {
            const unidadesEntregadasPorProducto = (entregas ?? [])
              .filter(e => e.estado === 'aceptada')
              .flatMap(e => e.entrega_detalle ?? [])
              .reduce<Record<string, number>>((acc, d) => {
                acc[d.producto_id] = (acc[d.producto_id] ?? 0) + d.cantidad_entregada
                return acc
              }, {})
            return [...new Map(lineasOP.map(l => [l.producto_id, l])).values()]
              .map(l => ({
                producto_id: l.producto_id,
                referencia: l.referencia,
                nombre: l.nombre,
                unidades: unidadesEntregadasPorProducto[l.producto_id] ?? l.cantidad_asignada ?? 0,
              }))
          })()}
          liquidacionAprobada={liquidacionAprobada?.estado === 'aprobada' ? {
            costo_total: liquidacionAprobada.costo_total,
            cpp: liquidacionAprobada.cpp,
            cantidad_entregada: liquidacionAprobada.cantidad_entregada,
            fecha_aprobacion: liquidacionAprobada.fecha_aprobacion,
          } : null}
          hayReporteInsumos={hayReporteInsumos}
          bodegas={bodegas}
          bodegaDestinoId={bodegaDestino}
        />
      )}

      {/* Historial de estados */}
      <HistorialEstados
        historial={historial}
        createdAt={op.created_at || op.fecha_promesa}
        createdBy={null}
      />
    </div>
  )
}

function MetricStripe({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col justify-center shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-sm font-black text-slate-900 leading-none">{value}</span>
        <span className="text-[8px] font-bold text-slate-400 truncate">{subValue}</span>
      </div>
    </div>
  )
}
