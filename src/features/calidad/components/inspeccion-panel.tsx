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
      <div className="rounded-[2rem] bg-white border border-slate-100 shadow-xl p-12 text-center">
        <p className="font-bold text-slate-900">OP no encontrada o no está en calidad</p>
        <Link href="/calidad" className="text-primary-600 text-[10px] font-black uppercase tracking-widest mt-4 inline-block hover:underline">
          ← Volver al listado
        </Link>
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
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">{op.codigo}</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white">
                {tipoLabel}
              </span>
              {cicloActual > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">
                  <RefreshCw className="w-2.5 h-2.5" />
                  RE-INSPECCIÓN #{cicloActual}
                </span>
              )}
              {inspeccion && <CalidadStatusBadge resultado={inspeccion.resultado} />}
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none">
              {op.taller} · {op.cliente} · PROMESA: {formatDate(op.fecha_promesa)}
            </p>
          </div>
        </div>
      </div>

      {/* Context strip — muestra sugerida + estadísticas del taller */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Muestra sugerida */}
        <div className="rounded-[1.5rem] bg-white border border-slate-100 shadow-sm px-5 py-4 flex flex-col gap-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-primary-500" /> Muestra sugerida
          </p>
          <p className="font-black text-slate-900 text-lg leading-tight">
            {muestraSugerida} <span className="text-[10px] font-bold text-slate-400">UDS</span>
          </p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight opacity-70">
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
        <div className="rounded-[1.5rem] bg-white border border-slate-100 shadow-sm px-5 py-4 flex flex-col gap-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-500" /> FTT TALLER
          </p>
          {tallerStats && tallerStats.total_cerradas > 0 ? (
            <>
              <p className={`font-black text-lg leading-tight ${tallerStats.ftt >= 80 ? 'text-emerald-600' : tallerStats.ftt >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                {tallerStats.ftt}%
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight opacity-70">
                {tallerStats.aceptadas}/{tallerStats.total_cerradas} APROBADAS
              </p>
            </>
          ) : (
            <p className="font-black text-slate-900 text-lg leading-tight">—</p>
          )}
        </div>

        {/* Defecto más frecuente */}
        <div className="rounded-[1.5rem] bg-white border border-slate-100 shadow-sm px-5 py-4 col-span-2 flex flex-col gap-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Bug className="w-3 h-3 text-rose-500" /> DEFECTOS FRECUENTES ({op.taller})
          </p>
          {tallerStats && tallerStats.top_defectos.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {tallerStats.top_defectos.map((d, i) => (
                <span
                  key={d.codigo}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    i === 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}
                >
                  {d.codigo} <span className="font-bold opacity-60">×{d.veces}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight opacity-70 mt-1">Sin historial aún</p>
          )}
        </div>
      </div>

      {/* Sin inspección activa */}
      {!inspeccion && tipoInspeccion && (
        <div className="rounded-[2.5rem] bg-white border border-slate-100 shadow-xl p-10 flex flex-col items-center text-center gap-6">
          <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center ${cicloActual > 1 ? 'bg-amber-50' : 'bg-slate-50'}`}>
            {cicloActual > 1
              ? <RefreshCw className="w-8 h-8 text-amber-500 animate-spin-slow" />
              : <AlertTriangle className="w-8 h-8 text-amber-500" />
            }
          </div>
          <div>
            <p className="text-lg font-black text-slate-900 tracking-tight uppercase">
              {cicloActual > 1 ? `Re-inspección #${cicloActual} pendiente` : 'Inspección No Iniciada'}
            </p>
            <p className="text-slate-500 text-sm font-medium mt-2 max-w-sm mx-auto">
              {cicloActual > 1
                ? `La inspección anterior fue rechazada. Inicia el ciclo #${cicloActual} una vez corregidas las novedades.`
                : `Debes iniciar formalmente la inspección técnica de ${tipoLabel} para poder registrar hallazgos.`
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
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                HALLAZGOS REGISTRADOS ({inspeccion.novedades_calidad.length})
              </h2>
            </div>

            {inspeccion.novedades_calidad.length === 0 ? (
              <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm px-6 py-12 text-center">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sin novedades aún</p>
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
                {inspeccion.novedades_calidad.map((n, i) => {
                  const gravedadConfig = GRAVEDAD_CONFIG[n.gravedad] ?? GRAVEDAD_CONFIG.menor
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 ${i < inspeccion.novedades_calidad.length - 1 ? 'border-b border-black/5' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-black text-slate-900 text-xs uppercase tracking-tight">
                            {n.tipos_defecto?.codigo ?? 'DEF-?'} — {n.tipos_defecto?.descripcion ?? ''}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${gravedadConfig.className}`}>
                            {gravedadConfig.label}
                          </span>
                        </div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
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
            productos={op.productos}
            rechazosAnteriores={rechazosAnteriores}
          />
        </div>
      )}

      {/* Historial de inspecciones anteriores */}
      {historialInspecciones.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-2">
            INSPECCIONES ANTERIORES
          </h2>
          <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
            {historialInspecciones.map((h, i) => (
              <div
                key={h.id}
                className={`flex items-center justify-between px-6 py-4 ${i < historialInspecciones.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    Inspección {h.tipo.toUpperCase()}
                  </p>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                    {h.timestamp_cierre ? formatDate(h.timestamp_cierre) : '—'}
                    {h.muestra_revisada && h.muestra_revisada > 0 ? ` · ${h.muestra_revisada} PRENDAS` : ''}
                    {h.cantidad_segundas && h.cantidad_segundas > 0 ? ` · ${h.cantidad_segundas} SEGUNDAS` : ''}
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
