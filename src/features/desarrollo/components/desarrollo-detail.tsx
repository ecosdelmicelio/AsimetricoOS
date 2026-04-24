'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, AlertTriangle, Plus, FlaskConical, Edit3, Printer } from 'lucide-react'
import Link from 'next/link'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { DesarrolloStatusBadge } from './desarrollo-status-badge'
import { NuevaVersionForm } from './nueva-version-form'
import { HallazgosPanel } from './hallazgos-panel'
import { AssetUploader } from './asset-uploader'
import { GaleriaLightroom } from './galeria-lightroom'
import { AprobacionesPanel } from './aprobaciones-panel'
import { ViabilidadOpsPanel } from './viabilidad-ops-panel'
import { CondicionesPanel } from './condiciones-panel'
import { AuditoriaMaster } from './auditoria-master'
import { RutaOperacionalEditor } from './ruta-operacional-editor'
import { FichaTecnicaPrint } from './ficha-tecnica-print'
import { PuntosCriticosEditor } from './puntos-criticos-editor'
import { DesarrolloInfoComercial } from './desarrollo-info-comercial'
import { GenerarMuestraModal } from './generar-muestra-modal'
import { 
  cambiarStatusDesarrollo, 
  updateDesarrolloComercial, 
  updateVersionQuality 
} from '@/features/desarrollo/services/desarrollo-actions'
import { graduarDesarrollo } from '@/features/desarrollo/services/graduacion-actions'
import {
  STATUS_LABELS,
  CATEGORIA_LABELS,
  PRIORIDAD_COLORS,
  SECUENCIA_STATUS,
} from '@/features/desarrollo/types'
import type { StatusDesarrollo, Prioridad, DesarrolloViabilidadOps } from '@/features/desarrollo/types'
import type { Material, ServicioOperativo } from '@/features/productos/services/bom-actions'

const TRANSICIONES_PERMITIDAS: Record<StatusDesarrollo, StatusDesarrollo[]> = {
  draft:         ['ops_review', 'descartado'],
  ops_review:    ['sampling', 'draft', 'descartado', 'hold'],
  sampling:      ['fitting', 'ops_review', 'descartado'],
  fitting:       ['client_review', 'sampling', 'ops_review', 'descartado'],
  client_review: ['approved', 'sampling', 'descartado'],
  approved:      ['graduated', 'fitting', 'descartado'],
  hold:          ['draft', 'ops_review', 'descartado'],
  graduated:     [],
  descartado:    [],
  derivado:      [],
}

type Tab = 'info' | 'versiones' | 'bom' | 'operacional' | 'condiciones' | 'muestra' | 'assets' | 'hallazgos' | 'historial' | 'auditoria' | 'comercial' | 'calidad'

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
  puntos_criticos_calidad: any[]
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
  nombre_comercial: string | null
  subpartida_arancelaria: string | null
  composicion: string | null
  instrucciones_cuidado: string | null
  updated_at: string | null
  terceros: { nombre: string } | null
  desarrollo_versiones: Version[]
  desarrollo_transiciones: Transicion[]
  desarrollo_ordenes: OrdenMuestra[]
  desarrollo_viabilidad_ops: DesarrolloViabilidadOps[]
  desarrollo_condiciones: any[]
  desarrollo_condiciones_material: any[]
  desarrollo_operaciones: any[]
  json_alta_resolucion?: any
  tipo_muestra_asignada?: string
  disonancia_activa?: boolean
  cliente_id?: string | null
  profiles: { full_name: string } | null
}

interface Props {
  desarrollo: DesarrolloData
  talleres:   Tercero[]
  proveedores: Tercero[]
  catalogoMateriales: Material[]
  catalogoServicios:  ServicioOperativo[]
}
 
export function DesarrolloDetail({ 
  desarrollo, talleres, proveedores, catalogoMateriales, catalogoServicios 
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab]             = useState<Tab>('info')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [transicionNota, setTransicionNota]   = useState('')
  const [estadoDestino, setEstadoDestino]     = useState<StatusDesarrollo | null>(null)
  const [showTransicionModal, setShowTransicionModal] = useState(false)
  const [showNuevaVersion, setShowNuevaVersion] = useState(false)
  const [showEditarVersion, setShowEditarVersion] = useState(false)
  const [versionActiva, setVersionActiva]     = useState<string | null>(null)
  const [showMuestraModal, setShowMuestraModal] = useState(false)
  const [muestraCreadaCodigo, setMuestraCreadaCodigo] = useState<string | null>(null)
  const [showGraduarModal, setShowGraduarModal] = useState(false)
  const [graduacionError, setGraduacionError] = useState<string | null>(null)
  const [productoGraduado, setProductoGraduado] = useState<{ productoId: string; referencia: string } | null>(null)
  const [showPrintView, setShowPrintView]     = useState(false)

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

  const currentAdvice = ({
    draft: {
      title: 'Fase de Diseño & BOM',
      description: 'Enfócate en definir los materiales (BOM) y crear la ficha técnica. Una vez listo, define condiciones y envía a revisión de operaciones.',
      bg: 'bg-blue-50 border-blue-100 text-blue-800',
    },
    ops_review: {
      title: 'Revisión de Viabilidad Ops',
      description: 'Define MOQs, proveedores y múltiplos para determinar si el producto es escalable. El Director debe dar su aval.',
      bg: 'bg-amber-50 border-amber-100 text-amber-800',
    },
    sampling: {
      title: 'Desarrollo de Muestra Física',
      description: 'Genera la OP/OC de muestra y haz seguimiento al ingreso en bodega para iniciar el fitting.',
      bg: 'bg-violet-50 border-violet-100 text-violet-800',
    },
    fitting: {
      title: 'Pruebas de Ajuste (Fitting)',
      description: 'Registra hallazgos y correcciones necesarias sobre la muestra física recibida.',
      bg: 'bg-teal-50 border-teal-100 text-teal-800',
    },
    client_review: {
      title: 'Validación del Cliente',
      description: 'Presenta el prototipo final al cliente y obtén su aprobación comercial.',
      bg: 'bg-indigo-50 border-indigo-100 text-indigo-800',
    },
    approved: {
      title: 'Desarrollo Aprobado',
      description: 'Todo está listo. Verifica que los materiales y costos sean correctos antes de graduar a producción.',
      bg: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    }
  } as any)[status]
  const tercerosMuestra = esFabricado ? talleres : proveedores

  const isGraduatedStatus = status === 'graduated'

  const hasBom = (ultimaVersion?.bom_data as any)?.materiales?.length > 0
  const hasMedidas = ultimaVersion?.cuadro_medidas != null && Object.keys(ultimaVersion.cuadro_medidas as any).length > 0
  
  // Validación de archivos mandatorios
  const hasOptitex = ultimaVersion?.desarrollo_assets?.some(a => a.tipo === 'optitex')
  const hasEtiquetas = ultimaVersion?.desarrollo_assets?.some(a => ['etiqueta', 'marquilla_comp', 'marquilla_imp'].includes(a.tipo))
  const hasFotos = ultimaVersion?.desarrollo_assets?.some(a => a.tipo === 'foto_muestra')
  const hasFicha = ultimaVersion?.desarrollo_assets?.some(a => a.tipo === 'ficha_tecnica')

  const canMoveToOps = hasBom && hasMedidas
  const canMoveToSampling = !!ultimaVersion?.aprobado_ops
  const canMoveToApproved = !!ultimaVersion?.aprobado_cliente
  const canMoveToGraduated = !!ultimaVersion?.aprobado_director && hasOptitex && hasEtiquetas && hasFotos && hasFicha

  // Viabilidad and ordenes from data
  const viabilidadOps = desarrollo.desarrollo_viabilidad_ops?.[0] as DesarrolloViabilidadOps | undefined
  const ordenMuestra = desarrollo.desarrollo_ordenes?.find(
    o => o.tipo_orden === 'op_muestra' || o.tipo_orden === 'oc_muestra'
  )

  function iniciarTransicion(nuevoEstado: StatusDesarrollo) {
    if (nuevoEstado === 'descartado') { setShowCancelModal(true); return }
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
      await cambiarStatusDesarrollo(desarrollo.id, 'descartado', motivoCancelacion)
      setShowCancelModal(false)
      router.refresh()
    })
  }

  function openGaleria(url: string, index: number, fotos: string[]) {
    setGaleriaFotos(fotos)
    setGaleriaIndex(index)
    setGaleriaOpen(true)
  }

  // Lógica de visibilidad por estado
  const getVisibleTabs = (s: StatusDesarrollo): Tab[] => {
    switch (s) {
      case 'draft':
        return ['versiones', 'operacional', 'assets', 'info']
      case 'ops_review':
        return ['condiciones', 'bom', 'operacional', 'versiones', 'info']
      case 'sampling':
      case 'fitting':
        return ['muestra', 'hallazgos', 'operacional', 'assets', 'versiones', 'info']
      case 'client_review':
        return ['assets', 'hallazgos', 'info']
      case 'approved':
      case 'graduated':
        return ['info', 'comercial', 'bom', 'operacional', 'calidad', 'condiciones', 'assets', 'versiones']
      default:
        return ['info', 'comercial', 'calidad', 'versiones', 'bom', 'operacional', 'condiciones', 'muestra', 'assets', 'hallazgos', 'historial']
    }
  }

  const visibleTabsIds = getVisibleTabs(status)
  
  if (status === 'ops_review' && !visibleTabsIds.includes('auditoria' as any)) {
    visibleTabsIds.unshift('auditoria' as any)
  }

  const TABS = ([
    { id: 'auditoria',   label: 'Auditoría Ops (S7)' },
    { id: 'versiones',   label: 'Diseño & BOM', badge: desarrollo.desarrollo_versiones.length },
    { id: 'bom',         label: 'BOM & Costos' },
    { id: 'operacional', label: 'Ruta (SAM)' },
    { id: 'calidad',     label: 'Requisitos Calidad' },
    { id: 'comercial',   label: 'Info Comercial' },
    { id: 'condiciones', label: 'Viabilidad Ops' },
    { id: 'muestra',     label: 'Muestra Física' },
    { id: 'assets',      label: 'Fotos & Archivos', badge: versionSeleccionada?.desarrollo_assets.length },
    { id: 'hallazgos',   label: 'Hallazgos (Prototipo)', badge: versionSeleccionada?.desarrollo_hallazgos.filter(h => !h.resuelto).length },
    { id: 'info',        label: 'Info General' },
    { id: 'historial',   label: 'Historial' },
  ] as { id: Tab; label: string; badge?: number }[]).filter(t => visibleTabsIds.includes(t.id as any))

  // Auto-switch tab si el actual ya no es visible por cambio de estado
  useEffect(() => {
    if (!visibleTabsIds.includes(activeTab)) {
      setActiveTab(visibleTabsIds[0] || 'info')
    }
  }, [status, visibleTabsIds, activeTab])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-6 min-w-0">
          <Link 
            href="/desarrollo" 
            className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 hover:shadow-md transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{desarrollo.temp_id}</span>
              <DesarrolloStatusBadge status={status} />
              <div className={cn('px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest', PRIORIDAD_COLORS[desarrollo.prioridad as Prioridad])}>
                {desarrollo.prioridad}
              </div>
              {ultimaVersion && (
                <div className="px-2 py-0.5 rounded-lg bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  v{ultimaVersion.version_n}
                </div>
              )}
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter truncate">{desarrollo.nombre_proyecto}</h1>
            <div className="flex items-center gap-3 mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="text-slate-900">{CATEGORIA_LABELS[desarrollo.categoria_producto as keyof typeof CATEGORIA_LABELS] ?? desarrollo.categoria_producto}</span>
              <span className="w-1 h-1 rounded-full bg-slate-200" />
              <span>{desarrollo.tipo_producto}</span>
              <span className="w-1 h-1 rounded-full bg-slate-200" />
              <span>Complejidad {desarrollo.complejidad}</span>
              {desarrollo.terceros && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                  <span className="text-primary-600">{desarrollo.terceros.nombre}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowPrintView(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-900 font-black text-[10px] uppercase tracking-widest hover:shadow-md hover:border-slate-300 transition-all"
        >
          <Printer className="w-4 h-4 text-slate-400" />
          Imprimir Ficha
        </button>
      </div>

      {/* Stepper Vertical-ish / Horizontal Premium */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm px-6 py-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {SECUENCIA_STATUS.map((s, i) => {
            const idx = SECUENCIA_STATUS.indexOf(status)
            const isDone = i < idx; const isCurrent = s === status
            return (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <div className={cn('px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300',
                  isCurrent ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-105' : isDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100')}>
                  {STATUS_LABELS[s]}
                </div>
                {i < SECUENCIA_STATUS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-200 shrink-0" />}
              </div>
            )
          })}
          {status === 'descartado' && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-200 shrink-0" />
              <div className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] bg-rose-50 text-rose-600 border border-rose-100">Descartado</div>
            </>
          )}
        </div>
      </div>

      {/* Acciones de transición */}
      {status !== 'graduated' && status !== 'descartado' && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Mover a →</span>
            {transicionesPermitidas.filter(s => s !== 'descartado').map(s => {
              const isOps = s === 'ops_review'
              const isSampling = s === 'sampling'
              const isApproved = s === 'approved'
              const isGraduated = s === 'graduated'

              let blocked = false
              let reason: string[] = []

              if (isOps && !canMoveToOps) {
                blocked = true
                if (!hasBom) reason.push('Falta definir BOM')
                if (!hasMedidas) reason.push('Faltan medidas técnicas')
                if (!hasOptitex) reason.push('Falta archivo Optitex')
                if (!hasEtiquetas) reason.push('Faltan etiquetas/marquillas')
                if (!hasFotos) reason.push('Faltan fotos de referencia')
                if (!hasFicha) reason.push('Falta ficha técnica')
              } else if (isSampling && !canMoveToSampling) {
                blocked = true
                reason.push('Requiere Aprobación Ops (Panel Aprobaciones)')
              } else if (isApproved && !canMoveToApproved) {
                blocked = true
                reason.push('Requiere Aprobación del Cliente')
              } else if (isGraduated && !canMoveToGraduated) {
                blocked = true
                if (!ultimaVersion?.aprobado_director) reason.push('Requiere Aprobación del Director de Diseño')
                if (!hasOptitex) reason.push('Falta archivo Optitex')
                if (!hasEtiquetas) reason.push('Faltan etiquetas/marquillas')
                if (!hasFotos) reason.push('Faltan fotos de referencia')
                if (!hasFicha) reason.push('Faltan fichas técnicas')
              }

              const isDisabled = isPending || blocked
              
              return (
                <div key={s} className="group relative">
                  <button onClick={() => iniciarTransicion(s)} disabled={isDisabled}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    {STATUS_LABELS[s]}
                  </button>
                  {blocked && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-[9px] text-white rounded-lg shadow-xl z-20 text-center animate-in fade-in slide-in-from-bottom-1 border border-slate-700">
                      {reason.map((r, i) => <p key={i}>• {r}</p>)}
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

      {/* Banner de Contexto / Advice */}
      {currentAdvice && !isGraduatedStatus && (
        <div className={cn('rounded-[32px] border-l-[6px] px-8 py-6 flex gap-6 items-center shadow-lg shadow-slate-100/50 transition-all duration-500 hover:shadow-xl', currentAdvice.bg)}>
          <div className="w-14 h-14 rounded-2xl bg-white/40 flex items-center justify-center shrink-0 border border-white/20 backdrop-blur-sm shadow-inner">
             <FlaskConical className="w-6 h-6 text-current opacity-70" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-1">{currentAdvice.title}</h4>
            <p className="text-sm font-medium opacity-80 leading-relaxed max-w-2xl">{currentAdvice.description}</p>
          </div>
        </div>
      )}
      {isGraduatedStatus && (
        <div className="rounded-[32px] bg-slate-900 border border-slate-800 px-8 py-6 flex gap-6 items-center shadow-2xl shadow-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center shrink-0 border border-primary-500/30 backdrop-blur-sm">
             <FlaskConical className="w-6 h-6 text-primary-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-1 text-primary-400">Archivo Técnico Maestro</h4>
            <p className="text-sm font-medium text-slate-300 leading-relaxed max-w-2xl">
              Este desarrollo ha sido graduado. La información contenida aquí es la **Fuente Única de Verdad** para producción, calidad y comercio exterior.
            </p>
          </div>
          <div className="ml-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-700">
            Audit-Ready
          </div>
        </div>
      )}

      {/* Tabs Premium */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/30 px-4 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('relative flex items-center gap-2.5 px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all group',
                activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600')}>
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-black">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 inset-x-4 h-1 bg-slate-900 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
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

          {/* TAB: Viabilidad Ops */}
          {activeTab === 'condiciones' && (
            <CondicionesPanel
              readOnly={status !== 'ops_review'}
              desarrolloId={desarrollo.id}
              versionId={ultimaVersion?.id || ''}
              tipoProducto={desarrollo.tipo_producto as 'fabricado' | 'comercializado'}
              bomData={Array.isArray(ultimaVersion?.bom_data) ? (ultimaVersion?.bom_data || []) : ((ultimaVersion?.bom_data as any)?.materiales || [])}
              condicionesExistentes={Array.isArray(desarrollo.desarrollo_condiciones) ? desarrollo.desarrollo_condiciones[0] : desarrollo.desarrollo_condiciones}
              materialCondicionesExistentes={desarrollo.desarrollo_condiciones_material}
              proveedores={proveedores}
              catalogoMateriales={catalogoMateriales}
            />
          )}

          {/* TAB: Auditoria Master */}
          {activeTab === ('auditoria' as any) && (
             <AuditoriaMaster 
                desarrolloId={desarrollo.id}
                jsonAltaResolucion={desarrollo.json_alta_resolucion || {}}
                tipoMuestraActual={desarrollo.tipo_muestra_asignada as any}
                disonanciaActiva={desarrollo.disonancia_activa}
                status={desarrollo.status}
             />
          )}

          {/* TAB: Info Comercial */}
          {activeTab === 'comercial' && (
            <DesarrolloInfoComercial 
              desarrollo={desarrollo}
              onSave={async (data) => {
                await updateDesarrolloComercial(desarrollo.id, data)
                router.refresh()
              }}
            />
          )}

          {/* TAB: Calidad */}
          {activeTab === 'calidad' && versionSeleccionada && (
            <PuntosCriticosEditor 
              versionId={versionSeleccionada.id}
              initialPuntos={versionSeleccionada.puntos_criticos_calidad || []}
              onSave={async (puntos) => {
                await updateVersionQuality(versionSeleccionada.id, puntos)
                router.refresh()
              }}
            />
          )}

          {/* TAB: Versiones */}
          {activeTab === 'versiones' && (
            <div className="space-y-4">
              {showNuevaVersion ? (
                <NuevaVersionForm
                  desarrolloId={desarrollo.id}
                  categoria={desarrollo.categoria_producto as any}
                  clienteId={desarrollo.cliente_id}
                  catalogoMateriales={catalogoMateriales}
                  catalogoServicios={catalogoServicios}
                  proveedores={proveedores}
                  initialBom={ultimaVersion?.bom_data}
                  onCreated={() => { setShowNuevaVersion(false); router.refresh() }}
                  onCancel={() => setShowNuevaVersion(false)}
                />
              ) : showEditarVersion && ultimaVersion ? (
                <NuevaVersionForm
                  mode="edit"
                  versionId={ultimaVersion.id}
                  desarrolloId={desarrollo.id}
                  categoria={desarrollo.categoria_producto as any}
                  clienteId={desarrollo.cliente_id}
                  catalogoMateriales={catalogoMateriales}
                  catalogoServicios={catalogoServicios}
                  proveedores={proveedores}
                  initialBom={ultimaVersion.bom_data}
                  initialNotas={ultimaVersion.notas_version || ''}
                  initialComportamiento={ultimaVersion.comportamiento_tela || ''}
                  initialMedidas={ultimaVersion.cuadro_medidas as any}
                  onCreated={() => { setShowEditarVersion(false); router.refresh() }}
                  onCancel={() => setShowEditarVersion(false)}
                />
              ) : (
                <>
                  <button onClick={() => setShowNuevaVersion(true)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-wider">
                    <Plus className="w-3.5 h-3.5" /> Crear nueva versión
                  </button>
                  <div className="space-y-3">
                    {versionesOrdenadas.map(v => {
                      const isUltima = v.id === ultimaVersion?.id
                      return (
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
                              {/* Botón Editar (solo si es la versión actual y no está aprobada por todos?) */}
                              {isUltima && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setShowEditarVersion(true) }}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all"
                                  title="Editar esta versión"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <AprobDot label="Ops" ok={v.aprobado_ops} />
                              <AprobDot label="Cli" ok={v.aprobado_cliente} />
                              <AprobDot label="Dir" ok={v.aprobado_director} />
                            </div>
                          </div>
                          {/* BOM preview */}
                          {!!v.bom_data && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              {Array.isArray(v.bom_data) ? (
                                <div className="flex flex-wrap gap-1.5">
                                  <p className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">BOM (Vista Clásica)</p>
                                  {(v.bom_data as any[]).map((item, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-medium">
                                      {item.material_nombre} · {item.cantidad} {item.unidad}
                                    </span>
                                  ))}
                                </div>
                              ) : typeof v.bom_data === 'object' ? (
                                <>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BOM & Costos</p>
                                    {(v.bom_data as any).costo_estimado > 0 && (
                                      <span className="text-[10px] font-black text-slate-900">{formatCurrency((v.bom_data as any).costo_estimado)}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {/* Materiales */}
                                    {((v.bom_data as any).materiales || []).map((item: any, i: number) => (
                                      <div key={i} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-bold">
                                        {item.material_nombre} · {item.cantidad} {item.unidad}
                                      </div>
                                    ))}
                                    {/* Servicios */}
                                    {((v.bom_data as any).servicios || []).map((item: any, i: number) => (
                                      <div key={i} className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[9px] font-bold">
                                        {item.servicio_nombre} · {item.cantidad} ud
                                      </div>
                                    ))}
                                  </div>
                                  {/* Medidas (opcional en card) */}
                                  {v.cuadro_medidas && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Medidas OK</span>
                                      <div className="flex gap-1">
                                        {Object.keys(v.cuadro_medidas as any).map(m => (
                                          <div key={m} className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Checklist de Validación Pre-Ops */}
                  {status === 'draft' && (
                    <div className="mt-6 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Checklist de Entrega a Ops</p>
                        <p className="text-[11px] text-slate-500">Asegúrate de cumplir con estos requisitos para habilitar la revisión de viabilidad.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <CheckItem label="BOM Completo" ok={hasBom} />
                        <CheckItem label="Medidas Cargadas" ok={hasMedidas} />
                      </div>
                      <div className="mt-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mandatorio para Cierre (Graduación)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <CheckItem label="Optitex" ok={hasOptitex} />
                          <CheckItem label="Fotos Muestra" ok={hasFotos} />
                          <CheckItem label="Marquillas" ok={hasEtiquetas} />
                          <CheckItem label="Ficha Técnica" ok={hasFicha} />
                        </div>
                      </div>
                      {!canMoveToOps && (
                        <div className="flex items-center gap-2 text-[10px] text-amber-600 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Faltan requisitos para enviar a revisión operativa.</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB: BOM & Costos (Solo lectura de la versión seleccionada) */}
          {activeTab === 'bom' && versionSeleccionada && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    BOM de la versión v{versionSeleccionada.version_n}
                  </p>
                  <p className="text-xs text-slate-500">Consulta los materiales y servicios definidos para esta iteración específica.</p>
                </div>
                {(versionSeleccionada.bom_data as any)?.costo_estimado > 0 && (
                  <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-right">
                    <p className="text-[9px] font-black uppercase opacity-60">Costo Estimado</p>
                    <p className="text-lg font-black">{formatCurrency((versionSeleccionada.bom_data as any).costo_estimado)}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Lista Materiales */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" /> Materias Primas
                  </h4>
                  <div className="space-y-2">
                    {((versionSeleccionada.bom_data as any)?.materiales || []).map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{m.material_nombre}</p>
                          <p className="text-[10px] text-slate-400">{m.referencia} · {m.cantidad} {m.unidad} × {formatCurrency(m.costo_unit)}</p>
                        </div>
                        <div className="text-xs font-black text-slate-900 ml-4">
                          {formatCurrency(m.cantidad * m.costo_unit)}
                        </div>
                      </div>
                    ))}
                    {((versionSeleccionada.bom_data as any)?.materiales?.length === 0) && (
                      <p className="text-xs text-slate-400 italic py-2">Sin materiales registrados</p>
                    )}
                  </div>
                </div>

                {/* Lista Servicios */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-purple-500 rounded-full" /> Servicios Operativos
                  </h4>
                  <div className="space-y-2">
                    {((versionSeleccionada.bom_data as any)?.servicios || []).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{s.servicio_nombre}</p>
                          <p className="text-[10px] text-purple-600 font-bold uppercase tracking-tighter">{s.tipo_proceso}</p>
                          <p className="text-[10px] text-slate-400">{s.cantidad} ud × {formatCurrency(s.tarifa_unitaria)}</p>
                        </div>
                        <div className="text-xs font-black text-slate-900 ml-4">
                          {formatCurrency(s.cantidad * s.tarifa_unitaria)}
                        </div>
                      </div>
                    ))}
                    {((versionSeleccionada.bom_data as any)?.servicios?.length === 0) && (
                      <p className="text-xs text-slate-400 italic py-2">Sin servicios registrados</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Comportamiento Tela */}
              {versionSeleccionada.comportamiento_tela && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">Comportamiento de Tela</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{versionSeleccionada.comportamiento_tela}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Ruta Operacional */}
          {activeTab === 'operacional' && versionSeleccionada && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RutaOperacionalEditor 
                desarrolloId={desarrollo.id}
                versionId={versionSeleccionada.id}
                initialOperaciones={desarrollo.desarrollo_operaciones.filter(o => o.version_id === versionSeleccionada.id)}
              />
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
                    {status !== 'graduated' && status !== 'descartado' && ultimaVersion && (
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

      {/* Ficha Técnica Imprimible */}
      {showPrintView && versionSeleccionada && (
        <FichaTecnicaPrint
          desarrollo={desarrollo}
          version={versionSeleccionada}
          operaciones={desarrollo.desarrollo_operaciones.filter(o => o.version_id === versionSeleccionada.id)}
          onClose={() => setShowPrintView(false)}
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

function AprobDot({ label, ok }: { label: string, ok: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={cn('w-2 h-2 rounded-full', ok ? 'bg-green-500' : 'bg-slate-200')} />
      <span className="text-[8px] font-bold text-slate-400 uppercase">{label}</span>
    </div>
  )
}

function CheckItem({ label, ok }: { label: string, ok: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 p-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-colors',
      ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-400')}>
      <div className={cn('w-2 h-2 rounded-full', ok ? 'bg-green-500' : 'bg-slate-300 shadow-inner')} />
      {label}
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
