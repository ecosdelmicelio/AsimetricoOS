'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, AlertTriangle, Plus, FlaskConical } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/shared/lib/utils'
import { DesarrolloStatusBadge } from './desarrollo-status-badge'
import { NuevaVersionForm } from './nueva-version-form'
import { HallazgosPanel } from './hallazgos-panel'
import { AssetUploader } from './asset-uploader'
import { GaleriaLightroom } from './galeria-lightroom'
import { AprobacionesPanel } from './aprobaciones-panel'
import { ViabilidadOpsPanel } from './viabilidad-ops-panel'
import { CondicionesPanel } from './condiciones-panel'
import { GenerarMuestraModal } from './generar-muestra-modal'
import { cambiarStatusDesarrollo } from '@/features/desarrollo/services/desarrollo-actions'
import { graduarDesarrollo } from '@/features/desarrollo/services/graduacion-actions'
import {
  STATUS_LABELS,
  CATEGORIA_LABELS,
  PRIORIDAD_COLORS,
  SECUENCIA_STATUS,
} from '@/features/desarrollo/types'
import type { StatusDesarrollo, Prioridad, DesarrolloViabilidadOps } from '@/features/desarrollo/types'

const TRANSICIONES_PERMITIDAS: Record<StatusDesarrollo, StatusDesarrollo[]> = {
  draft:         ['ops_review', 'cancelled'],
  ops_review:    ['sampling', 'draft', 'cancelled'],
  sampling:      ['fitting', 'ops_review', 'cancelled'],
  fitting:       ['client_review', 'sampling', 'ops_review', 'cancelled'],
  client_review: ['approved', 'sampling', 'cancelled'],
  approved:      ['graduated', 'fitting', 'cancelled'],
  graduated:     [],
  cancelled:     [],
}

type Tab = 'info' | 'versiones' | 'condiciones' | 'muestra' | 'assets' | 'hallazgos' | 'historial'

interface Tercero { id: string; nombre: string }

interface Version {
  id: string
  version_n: number
  aprobado_ops: boolean
  aprobado_cliente: boolean
  aprobado_director: boolean
  created_at: string
  notas_version: string | null
  bom_data: unknown
  cuadro_medidas: unknown
  comportamiento_tela: string | null
  desarrollo_assets: Array<{ id: string; tipo: string; url: string; descripcion: string | null; created_at: string; version_id: string }>
  desarrollo_hallazgos: Array<{ id: string; categoria: string; severidad: string; descripcion: string; zona_prenda: string | null; foto_url: string | null; resuelto: boolean; resuelto_en_version: number | null; created_at: string; version_id: string }>
  desarrollo_costos: Array<{ id: string; concepto: string; descripcion: string | null; monto: number; created_at: string; version_id: string }>
}

interface Transicion {
  id: string
  estado_anterior: string | null
  estado_nuevo: string
  created_at: string
  notas: string | null
  profiles: { full_name: string } | null
}

interface OrdenMuestra {
  id: string
  tipo_orden: string
  op_id: string | null
  oc_id: string | null
  estado: string | null
}

interface DesarrolloData {
  id: string
  temp_id: string
  nombre_proyecto: string
  categoria_producto: string
  tipo_producto: string
  complejidad: string
  status: string
  prioridad: string
  fecha_compromiso: string | null
  notas: string | null
  updated_at: string | null
  terceros: { nombre: string } | null
  desarrollo_versiones: Version[]
  desarrollo_transiciones: Transicion[]
  desarrollo_ordenes: OrdenMuestra[]
  desarrollo_viabilidad_ops: DesarrolloViabilidadOps[]
  desarrollo_condiciones: any[]
  desarrollo_condiciones_material: any[]
  profiles: { full_name: string } | null
}

interface Props {
  desarrollo: DesarrolloData
  talleres:   Tercero[]
  proveedores: Tercero[]
}

export function DesarrolloDetail({ desarrollo, talleres, proveedores }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab]             = useState<Tab>('info')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [transicionNota, setTransicionNota]   = useState('')
  const [estadoDestino, setEstadoDestino]     = useState<StatusDesarrollo | null>(null)
  const [showTransicionModal, setShowTransicionModal] = useState(false)
  const [showNuevaVersion, setShowNuevaVersion] = useState(false)
  const [versionActiva, setVersionActiva]     = useState<string | null>(null)
  const [showMuestraModal, setShowMuestraModal] = useState(false)
  const [muestraCreadaCodigo, setMuestraCreadaCodigo] = useState<string | null>(null)
  const [showGraduarModal, setShowGraduarModal] = useState(false)
  const [graduacionError, setGraduacionError] = useState<string | null>(null)
  const [productoGraduado, setProductoGraduado] = useState<{ productoId: string; referencia: string } | null>(null)

  // Lightroom state
  const [galeriaFotos, setGaleriaFotos]   = useState<string[]>([])
  const [galeriaIndex, setGaleriaIndex]   = useState(0)
  const [galeriaOpen, setGaleriaOpen]     = useState(false)

  const status = desarrollo.status as StatusDesarrollo
  const transicionesPermitidas = TRANSICIONES_PERMITIDAS[status] ?? []

  const versionesOrdenadas = [...desarrollo.desarrollo_versiones].sort((a, b) => b.version_n - a.version_n)
  const ultimaVersion = versionesOrdenadas[0]
  const versionSeleccionada = versionActiva
    ? desarrollo.desarrollo_versiones.find(v => v.id === versionActiva)
    : ultimaVersion

  const esFabricado = desarrollo.tipo_producto === 'fabricado'
  const tercerosMuestra = esFabricado ? talleres : proveedores

  const hasBom = Array.isArray(ultimaVersion?.bom_data) && (ultimaVersion.bom_data as any[]).length > 0
  const hasCondiciones = esFabricado
    ? desarrollo.desarrollo_condiciones_material.length > 0
    : desarrollo.desarrollo_condiciones && (Array.isArray(desarrollo.desarrollo_condiciones) ? desarrollo.desarrollo_condiciones.length > 0 : !!desarrollo.desarrollo_condiciones)
 
  const canMoveToOps = hasBom && hasCondiciones

  // Viabilidad and ordenes from data
  const viabilidadOps = desarrollo.desarrollo_viabilidad_ops?.[0] as DesarrolloViabilidadOps | undefined
  const ordenMuestra = desarrollo.desarrollo_ordenes?.find(
    o => o.tipo_orden === 'op_muestra' || o.tipo_orden === 'oc_muestra'
  )

  function iniciarTransicion(nuevoEstado: StatusDesarrollo) {
    if (nuevoEstado === 'cancelled') { setShowCancelModal(true); return }
    setEstadoDestino(nuevoEstado)
    setShowTransicionModal(true)
  }

  function confirmarTransicion() {
    if (!estadoDestino) return
    startTransition(async () => {
      await cambiarStatusDesarrollo(desarrollo.id, estadoDestino, transicionNota || undefined)
      setShowTransicionModal(false)
      setTransicionNota('')
      router.refresh()
    })
  }

  function confirmarCancelacion() {
    if (!motivoCancelacion.trim()) return
    startTransition(async () => {
      await cambiarStatusDesarrollo(desarrollo.id, 'cancelled', motivoCancelacion)
      setShowCancelModal(false)
      router.refresh()
    })
  }

  function openGaleria(url: string, index: number, fotos: string[]) {
    setGaleriaFotos(fotos)
    setGaleriaIndex(index)
    setGaleriaOpen(true)
  }

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'info',        label: 'General' },
    { id: 'versiones',   label: 'Versiones', badge: desarrollo.desarrollo_versiones.length },
    { id: 'condiciones', label: 'Condiciones' },
    { id: 'muestra',     label: 'Muestra' },
    { id: 'assets',      label: 'Fotos & Archivos', badge: versionSeleccionada?.desarrollo_assets.length },
    { id: 'hallazgos',   label: 'Hallazgos', badge: versionSeleccionada?.desarrollo_hallazgos.filter(h => !h.resuelto).length },
    { id: 'historial',   label: 'Historial' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/desarrollo" className="mt-1 p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{desarrollo.temp_id}</span>
            <DesarrolloStatusBadge status={status} />
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', PRIORIDAD_COLORS[desarrollo.prioridad as Prioridad])}>
              {desarrollo.prioridad}
            </span>
            {ultimaVersion && (
              <span className="text-[10px] font-bold text-slate-400">v{ultimaVersion.version_n}</span>
            )}
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{desarrollo.nombre_proyecto}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span>{CATEGORIA_LABELS[desarrollo.categoria_producto as keyof typeof CATEGORIA_LABELS] ?? desarrollo.categoria_producto}</span>
            <span>·</span><span className="capitalize">{desarrollo.tipo_producto}</span>
            <span>·</span><span className="capitalize">{desarrollo.complejidad}</span>
            {desarrollo.terceros && (<><span>·</span><span>{desarrollo.terceros.nombre}</span></>)}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {SECUENCIA_STATUS.map((s, i) => {
            const idx = SECUENCIA_STATUS.indexOf(status)
            const isDone = i < idx; const isCurrent = s === status
            return (
              <div key={s} className="flex items-center gap-1 shrink-0">
                <div className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider',
                  isCurrent ? 'bg-primary-600 text-white' : isDone ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400')}>
                  {STATUS_LABELS[s]}
                </div>
                {i < SECUENCIA_STATUS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
              </div>
            )
          })}
          {status === 'cancelled' && (
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-red-100 text-red-600">Cancelado</div>
          )}
        </div>
      </div>

      {/* Acciones de transición */}
      {status !== 'graduated' && status !== 'cancelled' && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Mover a →</span>
            {transicionesPermitidas.filter(s => s !== 'cancelled').map(s => {
              const isOps = s === 'ops_review'
              const isDisabled = isPending || (isOps && !canMoveToOps)
              
              return (
                <div key={s} className="group relative">
                  <button onClick={() => iniciarTransicion(s)} disabled={isDisabled}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    {STATUS_LABELS[s]}
                  </button>
                  {isOps && !canMoveToOps && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-[9px] text-white rounded-lg shadow-xl z-20 text-center animate-in fade-in slide-in-from-bottom-1">
                      {!hasBom && "• Falta definir BOM (materiales)\n"}
                      {!hasCondiciones && "• Faltan condiciones de abastecimiento (MOQ/LT)"}
                    </div>
                  )}
                </div>
              )
            })}
            <button onClick={() => setShowCancelModal(true)} disabled={isPending}
              className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={() => { setShowNuevaVersion(true); setActiveTab('versiones') }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50">
              <Plus className="w-3.5 h-3.5" /> Nueva versión
            </button>
            {/* Graduar — solo cuando approved + triple aprobación */}
            {status === 'approved' && ultimaVersion?.aprobado_ops && ultimaVersion?.aprobado_cliente && ultimaVersion?.aprobado_director && (
              <button onClick={() => setShowGraduarModal(true)} disabled={isPending}
                className="ml-auto flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50">
                <FlaskConical className="w-3.5 h-3.5" /> Graduar → Producto
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-1.5 px-4 py-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-colors',
                activeTab === tab.id ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-400 hover:text-slate-600')}>
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* TAB: Info General */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Fecha compromiso" value={desarrollo.fecha_compromiso ? new Date(desarrollo.fecha_compromiso).toLocaleDateString('es-CO') : '—'} />
                <InfoRow label="Creado por" value={desarrollo.profiles?.full_name ?? '—'} />
                <InfoRow label="Complejidad" value={desarrollo.complejidad} capitalize />
                <InfoRow label="Última actualización" value={desarrollo.updated_at ? new Date(desarrollo.updated_at).toLocaleDateString('es-CO') : '—'} />
              </div>
              {desarrollo.notas && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notas</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{desarrollo.notas}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Condiciones */}
          {activeTab === 'condiciones' && (
            <CondicionesPanel
              desarrolloId={desarrollo.id}
              versionId={ultimaVersion?.id || ''}
              tipoProducto={desarrollo.tipo_producto as 'fabricado' | 'comercializado'}
              bomData={(ultimaVersion?.bom_data as any[]) || []}
              condicionesExistentes={Array.isArray(desarrollo.desarrollo_condiciones) ? desarrollo.desarrollo_condiciones[0] : desarrollo.desarrollo_condiciones}
              materialCondicionesExistentes={desarrollo.desarrollo_condiciones_material}
              proveedores={proveedores}
            />
          )}

          {/* TAB: Versiones */}
          {activeTab === 'versiones' && (
            <div className="space-y-4">
              {showNuevaVersion ? (
                <NuevaVersionForm
                  desarrolloId={desarrollo.id}
                  onCreated={() => { setShowNuevaVersion(false); router.refresh() }}
                  onCancel={() => setShowNuevaVersion(false)}
                />
              ) : (
                <>
                  <button onClick={() => setShowNuevaVersion(true)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-wider">
                    <Plus className="w-3.5 h-3.5" /> Crear nueva versión
                  </button>
                  <div className="space-y-3">
                    {versionesOrdenadas.map(v => (
                      <div key={v.id}
                        onClick={() => setVersionActiva(v.id)}
                        className={cn('rounded-xl border p-4 cursor-pointer transition-all',
                          versionSeleccionada?.id === v.id ? 'border-primary-300 bg-primary-50' : 'border-slate-200 hover:border-slate-300')}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-black text-slate-900">v{v.version_n}</span>
                              <span className="text-[10px] text-slate-400">{new Date(v.created_at).toLocaleDateString('es-CO')}</span>
                            </div>
                            {v.notas_version && <p className="text-xs text-slate-600 line-clamp-2">{v.notas_version}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <AprobDot label="Ops" ok={v.aprobado_ops} />
                            <AprobDot label="Cli" ok={v.aprobado_cliente} />
                            <AprobDot label="Dir" ok={v.aprobado_director} />
                          </div>
                        </div>
                        {/* BOM preview */}
                        {Array.isArray(v.bom_data) && v.bom_data.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">BOM</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(v.bom_data as Array<{ material_nombre: string; cantidad: number; unidad: string }>).slice(0, 5).map((item, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                                  {item.material_nombre} · {item.cantidad} {item.unidad}
                                </span>
                              ))}
                              {(v.bom_data as unknown[]).length > 5 && (
                                <span className="text-[10px] text-slate-400">+{(v.bom_data as unknown[]).length - 5} más</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: Muestra */}
          {activeTab === 'muestra' && (
            <div className="space-y-6">
              {/* Viabilidad Ops */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Evaluación de Viabilidad Operativa</p>
                <ViabilidadOpsPanel
                  desarrolloId={desarrollo.id}
                  versionId={ultimaVersion?.id ?? ''}
                  evaluacionExistente={viabilidadOps ?? null}
                />
              </div>

              <div className="border-t border-slate-100 pt-5">
                {/* Orden de Muestra */}
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  {esFabricado ? 'Orden de Producción de Muestra' : 'Orden de Compra de Muestra'}
                </p>
                {ordenMuestra ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">
                        {ordenMuestra.tipo_orden === 'op_muestra' ? 'OP Muestra' : 'OC Muestra'} generada
                      </span>
                      {muestraCreadaCodigo && (
                        <p className="text-sm font-black text-violet-900 mt-0.5">{muestraCreadaCodigo}</p>
                      )}
                    </div>
                    {ordenMuestra.tipo_orden === 'op_muestra' && ordenMuestra.op_id && (
                      <Link href={`/ordenes-produccion/${ordenMuestra.op_id}`}
                        className="text-[10px] font-black text-violet-600 hover:underline uppercase tracking-wider">
                        Ver OP →
                      </Link>
                    )}
                    {ordenMuestra.tipo_orden === 'oc_muestra' && ordenMuestra.oc_id && (
                      <Link href={`/compras/${ordenMuestra.oc_id}`}
                        className="text-[10px] font-black text-violet-600 hover:underline uppercase tracking-wider">
                        Ver OC →
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      Aún no se ha generado {esFabricado ? 'una OP' : 'una OC'} de muestra para este desarrollo.
                    </p>
                    {status !== 'graduated' && status !== 'cancelled' && ultimaVersion && (
                      <button onClick={() => setShowMuestraModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition-all">
                        <FlaskConical className="w-3.5 h-3.5" />
                        Generar {esFabricado ? 'OP' : 'OC'} de Muestra
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Triple Aprobación */}
              {ultimaVersion && (
                <div className="border-t border-slate-100 pt-5">
                  <AprobacionesPanel
                    versionId={ultimaVersion.id}
                    desarrolloId={desarrollo.id}
                    aprobadoOps={ultimaVersion.aprobado_ops}
                    aprobadoCliente={ultimaVersion.aprobado_cliente}
                    aprobadoDirector={ultimaVersion.aprobado_director}
                    statusDesarrollo={status}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB: Assets */}
          {activeTab === 'assets' && versionSeleccionada && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                v{versionSeleccionada.version_n} — {new Date(versionSeleccionada.created_at).toLocaleDateString('es-CO')}
              </p>
              <AssetUploader
                assets={versionSeleccionada.desarrollo_assets}
                versionId={versionSeleccionada.id}
                desarrolloId={desarrollo.id}
                onGaleriaClick={openGaleria}
              />
            </div>
          )}

          {/* TAB: Hallazgos */}
          {activeTab === 'hallazgos' && versionSeleccionada && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                v{versionSeleccionada.version_n} — {new Date(versionSeleccionada.created_at).toLocaleDateString('es-CO')}
              </p>
              <HallazgosPanel
                hallazgos={versionSeleccionada.desarrollo_hallazgos}
                versionId={versionSeleccionada.id}
                versionN={versionSeleccionada.version_n}
                desarrolloId={desarrollo.id}
              />
            </div>
          )}

          {/* TAB: Historial */}
          {activeTab === 'historial' && (
            <div className="space-y-2">
              {[...desarrollo.desarrollo_transiciones]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map(t => (
                  <div key={t.id} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.estado_anterior && <DesarrolloStatusBadge status={t.estado_anterior as StatusDesarrollo} />}
                        {t.estado_anterior && <ChevronRight className="w-3 h-3 text-slate-400" />}
                        <DesarrolloStatusBadge status={t.estado_nuevo as StatusDesarrollo} />
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {t.profiles?.full_name ?? '—'} · {new Date(t.created_at).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      {t.notas && <p className="text-xs text-slate-500 mt-0.5 italic">{t.notas}</p>}
                    </div>
                  </div>
                ))}
              {desarrollo.desarrollo_transiciones.length === 0 && (
                <p className="text-sm text-slate-400 italic">Sin historial</p>
              )}
            </div>
          )}

          {/* Placeholder si no hay versión seleccionada en tabs de versión */}
          {(activeTab === 'assets' || activeTab === 'hallazgos') && !versionSeleccionada && (
            <div className="text-center py-8 text-slate-400">
              <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin versiones creadas aún</p>
            </div>
          )}

          {activeTab === 'muestra' && !ultimaVersion && (
            <div className="text-center py-8 text-slate-400">
              <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Crea una versión primero para gestionar la muestra</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: cambio de estado */}
      {showTransicionModal && estadoDestino && (
        <Modal onClose={() => setShowTransicionModal(false)}>
          <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
            Cambiar a <DesarrolloStatusBadge status={estadoDestino} />
          </h3>
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Notas (opcional)</label>
            <textarea value={transicionNota} onChange={e => setTransicionNota(e.target.value)} rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none"
              placeholder="Motivo del cambio, observaciones..." />
          </div>
          <div className="flex gap-3">
            <button onClick={confirmarTransicion} disabled={isPending}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 disabled:opacity-50">
              Confirmar
            </button>
            <button onClick={() => setShowTransicionModal(false)}
              className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: cancelación */}
      {showCancelModal && (
        <Modal onClose={() => setShowCancelModal(false)}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <h3 className="font-black text-slate-900">Cancelar Desarrollo</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Esta acción cancelará <strong>{desarrollo.temp_id}</strong>. Motivo obligatorio.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Motivo *</label>
            <textarea value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-red-300 resize-none"
              placeholder="Ej: MOQ inviable, cliente canceló..." />
          </div>
          <div className="flex gap-3">
            <button onClick={confirmarCancelacion} disabled={isPending || !motivoCancelacion.trim()}
              className="px-5 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-50">
              Cancelar Desarrollo
            </button>
            <button onClick={() => setShowCancelModal(false)}
              className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">
              Volver
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Generar OP/OC Muestra */}
      {showMuestraModal && ultimaVersion && (
        <GenerarMuestraModal
          desarrolloId={desarrollo.id}
          versionId={ultimaVersion.id}
          tipoProducto={desarrollo.tipo_producto as 'fabricado' | 'comercializado'}
          terceros={tercerosMuestra}
          onCreado={(codigo, tipo) => {
            setMuestraCreadaCodigo(codigo)
            setShowMuestraModal(false)
            router.refresh()
            void tipo
          }}
          onClose={() => setShowMuestraModal(false)}
        />
      )}

      {/* Modal: Graduar */}
      {showGraduarModal && (
        <Modal onClose={() => { setShowGraduarModal(false); setGraduacionError(null) }}>
          {productoGraduado ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                <FlaskConical className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-lg">¡Graduado con éxito!</p>
                <p className="text-sm text-slate-500 mt-1">
                  Producto <strong>{productoGraduado.referencia}</strong> creado en el catálogo.
                </p>
              </div>
              <Link href={`/productos/${productoGraduado.productoId}`}
                className="block w-full py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 text-center">
                Ver Producto →
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-black text-slate-900">Graduar a Producto</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Se creará un producto en el catálogo con las condiciones comerciales definidas.
                Las condiciones de proveedor, MOQ, leadtime y precios se copiarán al producto.
              </p>
              <ul className="text-xs text-slate-500 space-y-1 mb-5 pl-3 border-l-2 border-emerald-200">
                <li>✓ Triple aprobación completada</li>
                <li>✓ Condiciones comerciales registradas</li>
                <li>✓ Versión final documentada</li>
              </ul>
              {graduacionError && (
                <p className="text-sm text-red-600 mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  {graduacionError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  disabled={isPending}
                  onClick={() => {
                    setGraduacionError(null)
                    startTransition(async () => {
                      const result = await graduarDesarrollo(desarrollo.id)
                      if (result.error) { setGraduacionError(result.error); return }
                      setProductoGraduado(result.data!)
                      router.refresh()
                    })
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50">
                  {isPending ? 'Graduando...' : 'Confirmar Graduación'}
                </button>
                <button onClick={() => { setShowGraduarModal(false); setGraduacionError(null) }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Galería Lightroom */}
      {galeriaOpen && galeriaFotos.length > 0 && (
        <GaleriaLightroom
          fotos={galeriaFotos}
          initialIndex={galeriaIndex}
          onClose={() => setGaleriaOpen(false)}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={cn('text-sm text-slate-700 mt-0.5', capitalize && 'capitalize')}>{value}</p>
    </div>
  )
}

function AprobDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      <div className={cn('w-2 h-2 rounded-full', ok ? 'bg-green-400' : 'bg-slate-200')} />
      <span className="text-[9px] text-slate-400 font-medium">{label}</span>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">{children}</div>
    </div>
  )
}
