import Link from 'next/link'
import { ArrowLeft, Package, Calendar, Building2, FileText, ShieldCheck, Globe } from 'lucide-react'
import { createClient } from '@/shared/lib/supabase/server'
import { getOrdenProduccionById, getHistorialOP } from '@/features/ordenes-produccion/services/op-actions'
import { OPStatusBadge } from './op-status-badge'
import { OPActions, OPProgreso } from './op-actions'
import { HistorialEstados } from '@/shared/components/historial-estados'
import { HitosPanel } from '@/features/hitos-produccion/components/hitos-panel'
import { getHitosByOP } from '@/features/hitos-produccion/services/hitos-actions'
import { getReporteCortePorOP } from '@/features/reporte-corte/services/reporte-corte-actions'
import { ReporteCorteePanel } from '@/features/reporte-corte/components/reporte-corte-panel'
import { getEntregasByOP } from '@/features/entregas/services/entregas-actions'
import { EntregasPanel } from '@/features/entregas/components/entregas-panel'
import { getLiquidacionesByOP, getInsumosParaReporte, calcularResumenLiquidacion, getLiquidacionOP, getServiciosRef, getServiciosBOMParaOP } from '@/features/liquidacion/services/liquidacion-actions'
import { ReporteInsumosPanel } from '@/features/liquidacion/components/reporte-insumos-panel'
import { LiquidacionPanel } from '@/features/liquidacion/components/liquidacion-panel'
import type { EstadoOP } from '@/features/ordenes-produccion/types'
import { formatDate, sortTallas } from '@/shared/lib/utils'

interface Props {
  id: string
}

export async function OPDetail({ id }: Props) {
  const ESTADOS_CON_INSUMOS: EstadoOP[] = ['en_terminado', 'en_entregas', 'liquidada', 'completada']
  const ESTADOS_CON_LIQUIDACION: EstadoOP[] = ['en_entregas', 'liquidada', 'completada']

  const supabase = await createClient()

  // Fetch paralelo base
  const [{ data: op, error }, { data: historial }, hitos, reporteData, { data: entregas }, liquidacionesOP] = await Promise.all([
    getOrdenProduccionById(id),
    getHistorialOP(id),
    getHitosByOP(id),
    getReporteCortePorOP(id),
    getEntregasByOP(id),
    getLiquidacionesByOP(id),
  ])

  const { data: reporte, dataAll: reportes } = reporteData

  if (error || !op) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <p className="text-foreground font-medium">Orden no encontrada</p>
        <Link href="/ordenes-produccion" className="text-primary-600 text-body-sm mt-2 inline-block">
          ← Volver a la lista
        </Link>
      </div>
    )
  }

  // Fetch condicionales (solo cuando el estado lo requiere)
  const estadoOP = op.estado as EstadoOP
  const taller = op.terceros
  const ov = op.ordenes_venta
  const detalles = op.op_detalle ?? []
  const productoIdsOP = [...new Set(detalles.map(d => d.producto_id))]

  const [insumosParaReporte, resumenLiquidacion, liquidacionAprobada, bodegasData, serviciosRef, serviciosBOM] = await Promise.all([
    ESTADOS_CON_INSUMOS.includes(estadoOP) ? getInsumosParaReporte(id) : Promise.resolve([]),
    ESTADOS_CON_LIQUIDACION.includes(estadoOP) ? calcularResumenLiquidacion(id) : Promise.resolve(null),
    ESTADOS_CON_LIQUIDACION.includes(estadoOP) ? getLiquidacionOP(id) : Promise.resolve(null),
    estadoOP === 'en_entregas'
      ? supabase.from('bodegas').select('id, nombre').eq('activo', true).order('nombre')
      : Promise.resolve({ data: [] }),
    ESTADOS_CON_LIQUIDACION.includes(estadoOP) ? getServiciosRef(id) : Promise.resolve([]),
    ESTADOS_CON_LIQUIDACION.includes(estadoOP) ? getServiciosBOMParaOP(productoIdsOP) : Promise.resolve([]),
  ])

  const bodegas = (bodegasData?.data ?? []) as { id: string; nombre: string }[]
  const bodegaDestino = (op as unknown as Record<string, string | null>).bodega_destino_id ?? null

  const hayReporteInsumos = insumosParaReporte.length === 0 || insumosParaReporte.some(i => i.ya_reportado)

  const totalUnidades = detalles.reduce((s, d) => s + d.cantidad_asignada, 0)

  const lineasOP = detalles.map(d => ({
    producto_id: d.producto_id,
    referencia: d.productos?.referencia ?? '',
    nombre: d.productos?.nombre ?? '',
    color: d.productos?.color ?? null,
    talla: d.talla,
    cantidad_asignada: d.cantidad_asignada,
  }))

  // Agrupar por producto
  const porProducto = detalles.reduce<
    Record<string, {
      referencia: string
      nombre: string
      lineas: typeof detalles
    }>
  >((acc, det) => {
    const key = det.productos?.referencia ?? 'sin-ref'
    if (!acc[key]) {
      acc[key] = {
        referencia: det.productos?.referencia ?? '',
        nombre: det.productos?.nombre ?? 'Producto desconocido',
        lineas: [],
      }
    }
    acc[key].lineas.push(det)
    return acc
  }, {})

  // Obtener todas las tallas únicas y ordenarlas
  const todasTallas = sortTallas([...new Set(detalles.map(d => d.talla))])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ordenes-produccion"
            className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-display-xs font-heading font-bold text-foreground">{op.codigo}</h1>
              <OPStatusBadge estado={op.estado} />
              {ov && (
                <Link
                  href={`/ordenes-venta/${op.ov_id}`}
                  className="text-xs text-primary-600 hover:underline bg-neu-base shadow-neu-inset rounded-full px-2 py-0.5"
                >
                  {ov.codigo}
                </Link>
              )}
            </div>
            <p className="text-muted-foreground text-body-sm mt-0.5">
              {taller?.nombre ?? 'Taller desconocido'}
              {ov?.terceros && ` · ${ov.terceros.nombre}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {op.estado === 'dupro_pendiente' && (
            <Link
              href={`/calidad/${id}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-neu-base shadow-neu text-muted-foreground font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
            >
              <ShieldCheck className="w-4 h-4" />
              Inspeccionar
            </Link>
          )}
          <OPActions opId={id} estadoActual={op.estado} tieneReporteCorte={!!reporte} />
        </div>
      </div>

      {/* Barra de progreso */}
      <OPProgreso estadoActual={op.estado} />

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoCard icon={<Building2 className="w-4 h-4" />} label="Taller" value={taller?.nombre ?? '—'} />
        <InfoCard icon={<Calendar className="w-4 h-4" />} label="Promesa" value={formatDate(op.fecha_promesa)} />
        <InfoCard icon={<Package className="w-4 h-4" />} label="Unidades" value={totalUnidades.toString()} />
        <InfoCard icon={<FileText className="w-4 h-4" />} label="OV Origen" value={ov?.codigo ?? '—'} />
      </div>

      {/* Reporte de Corte */}
      <ReporteCorteePanel
        opId={id}
        estadoActual={op.estado}
        reporte={reporte}
        reportes={reportes}
        lineasOP={lineasOP}
      />

      {/* Banner Origen USA — si algún producto de la OP tiene origen_usa */}
      {detalles.some(d => d.productos?.origen_usa) && (
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50 border border-blue-200 px-5 py-3">
          <Globe className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <p className="text-body-sm font-semibold text-blue-700">Origen USA 🇺🇸</p>
            <p className="text-xs text-blue-600">
              Esta orden contiene productos que requieren etiquetas en inglés, composición de fibras y origen &quot;Made in Colombia&quot;
            </p>
          </div>
        </div>
      )}

      {/* Notas */}
      {op.notas && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-5">
          <p className="text-body-sm font-medium text-muted-foreground mb-1">Notas al taller</p>
          <p className="text-body-sm text-foreground">{op.notas}</p>
        </div>
      )}

      {/* Detalle por producto (Matriz) */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground text-body-md">Detalle de Productos</h2>

        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-black/5 bg-black/5">
                <th className="px-4 py-3 font-medium text-muted-foreground w-32">Referencia</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Producto</th>
                {todasTallas.map(t => (
                  <th key={t} className="text-center px-2 py-3 font-medium text-muted-foreground min-w-10">{t}</th>
                ))}
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Uds</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(porProducto).map(([ref, { nombre, lineas }]) => {
                const totalUds = lineas.reduce((s, l) => s + l.cantidad_asignada, 0)
                const esUSA = lineas.some(l => l.productos?.origen_usa)

                // Mapa de cantidad por talla para este producto
                const cantPorTalla = lineas.reduce<Record<string, number>>((acc, l) => {
                  acc[l.talla] = (acc[l.talla] ?? 0) + l.cantidad_asignada
                  return acc
                }, {})

                return (
                  <tr key={ref} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors">
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono font-semibold text-primary-700 text-xs">{ref}</p>
                      {esUSA && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full mt-1">
                          <Globe className="w-2.5 h-2.5" />
                          USA
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-foreground font-medium leading-tight">{nombre}</p>
                    </td>
                    {todasTallas.map(t => (
                      <td key={t} className="px-2 py-3 text-center text-foreground align-top">
                        {cantPorTalla[t] ? (
                          <span className="font-semibold">{cantPorTalla[t]}</span>
                        ) : (
                          <span className="text-muted-foreground/20">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-semibold text-foreground align-top">
                      {totalUds}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entregas */}
      <EntregasPanel
        opId={id}
        opCodigo={op.codigo}
        estadoActual={op.estado}
        entregas={entregas ?? []}
        lineasOP={lineasOP}
        totalUnidadesOP={totalUnidades}
        liquidacionesPorEntrega={Object.fromEntries(
          liquidacionesOP.filter(l => l.entrega_id).map(l => [l.entrega_id!, l.id])
        )}
        bodegas={bodegas}
        bodegaDestinoId={bodegaDestino}
      />

      {/* Reporte de Insumos (en_terminado en adelante) */}
      {ESTADOS_CON_INSUMOS.includes(estadoOP) && (
        <ReporteInsumosPanel
          opId={id}
          insumos={insumosParaReporte}
          bloqueado={liquidacionAprobada?.estado === 'aprobada'}
        />
      )}

      {/* Panel de Liquidación (en_entregas en adelante) */}
      {ESTADOS_CON_LIQUIDACION.includes(estadoOP) && resumenLiquidacion && (
        <LiquidacionPanel
          opId={id}
          resumenInicial={resumenLiquidacion}
          serviciosRefIniciales={serviciosRef}
          serviciosBOM={serviciosBOM}
          lineasOP={(() => {
            const unidadesPorProducto = detalles.reduce<Record<string, number>>((acc, d) => {
              acc[d.producto_id] = (acc[d.producto_id] ?? 0) + d.cantidad_asignada
              return acc
            }, {})
            return [...new Map(lineasOP.map(l => [l.producto_id, l])).values()]
              .map(l => ({ producto_id: l.producto_id, referencia: l.referencia, nombre: l.nombre, unidades: unidadesPorProducto[l.producto_id] ?? 0 }))
          })()}
          liquidacionAprobada={liquidacionAprobada?.estado === 'aprobada' ? {
            costo_total: liquidacionAprobada.costo_total,
            cpp: liquidacionAprobada.cpp,
            cantidad_entregada: liquidacionAprobada.cantidad_entregada,
            fecha_aprobacion: liquidacionAprobada.fecha_aprobacion,
          } : null}
          hayReporteInsumos={hayReporteInsumos}
        />
      )}

      {/* Hitos de producción */}
      <HitosPanel
        opId={id}
        estadoActual={op.estado as EstadoOP}
        hitos={hitos}
        lineas={detalles}
      />

      {/* Historial de estados */}
      <HistorialEstados
        historial={historial}
        createdAt={op.created_at ?? op.fecha_promesa}
        createdBy={null}
      />
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-body-sm">{label}</span>
      </div>
      <p className="font-semibold text-foreground text-body-sm truncate">{value}</p>
    </div>
  )
}
