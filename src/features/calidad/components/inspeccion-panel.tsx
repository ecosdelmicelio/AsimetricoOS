import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Layers, TrendingUp, Bug, RefreshCw } from 'lucide-react'
import { getOPConInspeccion, getTiposDefecto, getTallerCalidadStats } from '@/features/calidad/services/calidad-actions'
import { getCalidadConfig } from '@/features/calidad/services/calidad-config-actions'
import { calcMuestraSugerida } from '@/features/calidad/lib/aql'
import { CalidadStatusBadge } from './calidad-status-badge'
import { NovedadForm } from './novedad-form'
import { CerrarInspeccionForm } from './cerrar-inspeccion-form'
import { IniciarInspeccionButton } from './iniciar-inspeccion-button'
import { formatDate } from '@/shared/lib/utils'
import type { GravedadDefecto, TallerCalidadStats, TipoInspeccion } from '@/features/calidad/types'

const GRAVEDAD_CONFIG = {
  menor:   { label: 'Menor',   className: 'bg-yellow-100 text-yellow-700' },
  mayor:   { label: 'Mayor',   className: 'bg-orange-100 text-orange-700' },
  critico: { label: 'Crítico', className: 'bg-red-100 text-red-700' },
}

const TIPO_INSPECCION: Record<string, TipoInspeccion> = {
  dupro_pendiente: 'dupro',
}

interface Props { op_id: string }

export async function InspeccionPanel({ op_id }: Props) {
  const [{ op, inspeccion, historialInspecciones }, tiposDefecto, calidadConfig] = await Promise.all([
    getOPConInspeccion(op_id),
    getTiposDefecto(),
    getCalidadConfig(),
  ])

  // Fetch taller stats in parallel once we know taller_id
  let tallerStats: TallerCalidadStats | null = null
  if (op?.taller_id) {
    tallerStats = await getTallerCalidadStats(op.taller_id)
  }

  if (!op) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <p className="font-medium text-foreground">OP no encontrada o no está en calidad</p>
        <Link href="/calidad" className="text-primary-600 text-body-sm mt-2 inline-block">← Volver</Link>
      </div>
    )
  }

  const tipoInspeccion   = TIPO_INSPECCION[op.estado]
  const tipoLabel        = tipoInspeccion === 'dupro' ? 'DuPro' : 'FRI'
  const tieneDefectoCritico = inspeccion?.novedades_calidad.some(
    (n) => (n.gravedad as GravedadDefecto) === 'critico'
  ) ?? false
  const muestraSugerida  = tipoInspeccion
    ? calcMuestraSugerida(op.total_unidades, tipoInspeccion, calidadConfig)
    : 1
  const rechazosAnteriores = historialInspecciones.filter(h => h.resultado === 'rechazada').length
  const cicloActual        = rechazosAnteriores + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/calidad"
            className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-display-xs font-heading font-bold text-foreground">{op.codigo}</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">
                {tipoLabel}
              </span>
              {cicloActual > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-orange-100 text-orange-700">
                  <RefreshCw className="w-3 h-3" />
                  Re-inspección #{cicloActual}
                </span>
              )}
              {inspeccion && <CalidadStatusBadge resultado={inspeccion.resultado} />}
            </div>
            <p className="text-muted-foreground text-body-sm mt-0.5">
              {op.taller} · {op.cliente} · Promesa: {formatDate(op.fecha_promesa)}
            </p>
          </div>
        </div>
      </div>

      {/* Context strip — muestra sugerida + estadísticas del taller */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Muestra sugerida */}
        <div className="rounded-2xl bg-neu-base shadow-neu px-4 py-3 flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Layers className="w-3 h-3" /> Muestra sugerida
          </p>
          <p className="font-bold text-foreground text-body-md">
            {muestraSugerida} prenda{muestraSugerida !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {tipoInspeccion === 'dupro'
              ? `${calidadConfig.dupro_pct}% del lote`
              : calidadConfig.fri_metodo === 'aql'
                ? `AQL ${calidadConfig.aql_nivel} · Nivel ${calidadConfig.inspeccion_nivel}`
                : calidadConfig.fri_metodo === 'pct'
                  ? `${calidadConfig.fri_pct}% del lote`
                  : '√ del lote'
            } · {op.total_unidades} total
          </p>
        </div>

        {/* FTT del taller */}
        <div className="rounded-2xl bg-neu-base shadow-neu px-4 py-3 flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> FTT taller
          </p>
          {tallerStats && tallerStats.total_cerradas > 0 ? (
            <>
              <p className={`font-bold text-body-md ${tallerStats.ftt >= 80 ? 'text-green-600' : tallerStats.ftt >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                {tallerStats.ftt}%
              </p>
              <p className="text-xs text-muted-foreground">
                {tallerStats.aceptadas}/{tallerStats.total_cerradas} aprobadas
              </p>
            </>
          ) : (
            <p className="font-bold text-foreground text-body-md">—</p>
          )}
        </div>

        {/* Defecto más frecuente */}
        <div className="rounded-2xl bg-neu-base shadow-neu px-4 py-3 col-span-2 flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Bug className="w-3 h-3" /> Defectos frecuentes ({op.taller})
          </p>
          {tallerStats && tallerStats.top_defectos.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tallerStats.top_defectos.map((d, i) => (
                <span
                  key={d.codigo}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                    i === 0 ? 'bg-red-100 text-red-700' : 'bg-neu-base shadow-neu text-muted-foreground'
                  }`}
                >
                  {d.codigo} <span className="font-normal opacity-75">×{d.veces}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Sin historial aún</p>
          )}
        </div>
      </div>

      {/* Sin inspección activa */}
      {!inspeccion && tipoInspeccion && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 flex flex-col items-center text-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cicloActual > 1 ? 'bg-orange-50' : 'bg-neu-base shadow-neu-inset'}`}>
            {cicloActual > 1
              ? <RefreshCw className="w-7 h-7 text-orange-500" />
              : <AlertTriangle className="w-7 h-7 text-yellow-500" />
            }
          </div>
          <div>
            <p className="font-medium text-foreground">
              {cicloActual > 1 ? `Re-inspección #${cicloActual} pendiente` : 'Sin inspección iniciada'}
            </p>
            <p className="text-muted-foreground text-body-sm mt-1">
              {cicloActual > 1
                ? `La inspección anterior fue rechazada. Inicia el ciclo #${cicloActual} una vez corregidas las novedades.`
                : `Inicia la inspección ${tipoLabel} para registrar novedades`
              }
            </p>
          </div>
          <IniciarInspeccionButton op_id={op_id} tipo={tipoInspeccion} ciclo={cicloActual} />
        </div>
      )}

      {/* Inspección activa */}
      {inspeccion && (
        <div className="space-y-4">
          {/* Novedades */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-body-md">
                Novedades registradas ({inspeccion.novedades_calidad.length})
              </h2>
            </div>

            {inspeccion.novedades_calidad.length === 0 ? (
              <div className="rounded-2xl bg-neu-base shadow-neu px-5 py-8 text-center">
                <p className="text-muted-foreground text-body-sm">Sin novedades aún</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
                {inspeccion.novedades_calidad.map((n, i) => {
                  const gravedadConfig = GRAVEDAD_CONFIG[n.gravedad] ?? GRAVEDAD_CONFIG.menor
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 ${i < inspeccion.novedades_calidad.length - 1 ? 'border-b border-black/5' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-body-sm">
                            {n.tipos_defecto?.codigo ?? 'DEF-?'} — {n.tipos_defecto?.descripcion ?? ''}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${gravedadConfig.className}`}>
                            {gravedadConfig.label}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-body-sm mt-0.5">
                          {n.cantidad_afectada} prenda{n.cantidad_afectada !== 1 ? 's' : ''}
                          {n.descripcion && ` · ${n.descripcion}`}
                        </p>
                      </div>
                      {n.foto_url && (
                        <a href={n.foto_url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={n.foto_url}
                            alt="Foto defecto"
                            className="w-12 h-12 object-cover rounded-xl shrink-0 shadow-neu"
                          />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <NovedadForm
              inspeccion_id={inspeccion.id}
              op_id={op_id}
              tiposDefecto={tiposDefecto}
            />
          </div>

          {/* Cerrar inspección */}
          <CerrarInspeccionForm
            inspeccion_id={inspeccion.id}
            op_id={op_id}
            estado_op={op.estado}
            tieneDefectoCritico={tieneDefectoCritico}
            muestraSugerida={muestraSugerida}
          />
        </div>
      )}

      {/* Historial de inspecciones anteriores */}
      {historialInspecciones.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground text-body-md text-muted-foreground">
            Inspecciones anteriores
          </h2>
          <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
            {historialInspecciones.map((h, i) => (
              <div
                key={h.id}
                className={`flex items-center justify-between px-4 py-3 ${i < historialInspecciones.length - 1 ? 'border-b border-black/5' : ''}`}
              >
                <div>
                  <p className="text-body-sm font-medium text-foreground">
                    Inspección {h.tipo.toUpperCase()}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {h.timestamp_cierre ? formatDate(h.timestamp_cierre) : '—'}
                    {h.muestra_revisada && ` · ${h.muestra_revisada} prendas revisadas`}
                    {h.cantidad_segundas && ` · ${h.cantidad_segundas} segundas`}
                  </p>
                </div>
                <CalidadStatusBadge resultado={h.resultado} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
