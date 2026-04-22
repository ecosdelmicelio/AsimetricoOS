'use client'

import { useState, useTransition } from 'react'
import { Trash2, Plus, Loader2, Package, Wrench, Check } from 'lucide-react'
import {
  addBOMMaterial, addBOMServicio, deleteBOMLinea, updateBOMLinea, toggleBOMCompleted,
} from '@/features/productos/services/bom-actions'
import { cn, formatCurrency } from '@/shared/lib/utils'
import type {
  BOMLineaMaterial, BOMLineaServicio, Material, ServicioOperativo,
} from '@/features/productos/services/bom-actions'

const TIPO_PROCESO_LABEL: Record<string, string> = {
  corte:      'Corte',
  confeccion: 'Confección',
  maquillado: 'Maquillado',
  lavanderia: 'Lavandería',
  otro:       'Otro',
}

interface Props {
  productoId: string
  materiales: BOMLineaMaterial[]
  servicios: BOMLineaServicio[]
  catalogoMateriales: Material[]
  catalogoServicios: ServicioOperativo[]
  precioBase: number | null
  costoTotal: number
  costoMateriales: number
  costoServicios: number
  bomCompleto?: boolean
  onBOMCompleted?: () => void
  onBOMChanged?: () => void | Promise<void>
}

type Tab = 'materiales' | 'servicios'

export function BOMEditor({
  productoId, materiales, servicios,
  catalogoMateriales, catalogoServicios,
  precioBase, costoTotal, costoMateriales, costoServicios, bomCompleto = false, onBOMCompleted, onBOMChanged,
}: Props) {
  const [tab, setTab] = useState<Tab>('materiales')
  const [pending, startTransition] = useTransition()
  const tieneLineas = materiales.length > 0 || servicios.length > 0

  function handleMarkCompleted() {
    startTransition(async () => {
      await toggleBOMCompleted(productoId, !bomCompleto)
      onBOMCompleted?.()
    })
  }

  return (
    <div className="space-y-4">
      {costoTotal > 0 && (
        <CostoVelocimetro
          costoTotal={costoTotal}
          costoMateriales={costoMateriales}
          costoServicios={costoServicios}
          precioBase={precioBase}
        />
      )}

      {tieneLineas && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
          <label className="flex items-center gap-3 flex-1 cursor-pointer group">
            <div className="relative w-6 h-6">
              <input
                type="checkbox"
                checked={bomCompleto}
                onChange={handleMarkCompleted}
                disabled={pending}
                className="w-6 h-6 rounded-lg border-2 border-slate-200 checked:bg-emerald-500 checked:border-emerald-600 transition-all cursor-pointer disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Certificación de Ficha</span>
              <span className={cn("text-xs font-black uppercase tracking-tight mt-1", 
                bomCompleto ? 'text-emerald-600' : 'text-slate-500'
              )}>
                {bomCompleto ? '✓ Fórmula Validada y Completa' : 'Pendiente por completar'}
              </span>
            </div>
          </label>
          {pending && <Loader2 className="w-5 h-5 animate-spin text-primary-600" />}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl bg-slate-50 p-1.5 border border-slate-100">
        <TabButton active={tab === 'materiales'} onClick={() => setTab('materiales')} icon={<Package className="w-4 h-4" />}>
          Materia Prima ({materiales.length})
        </TabButton>
        <TabButton active={tab === 'servicios'} onClick={() => setTab('servicios')} icon={<Wrench className="w-4 h-4" />}>
          Servicios y MO ({servicios.length})
        </TabButton>
      </div>

      {/* Contenido de tab */}
      {tab === 'materiales' && (
        <MaterialesTab
          productoId={productoId}
          lineas={materiales}
          catalogo={catalogoMateriales}
          onBOMChanged={onBOMChanged}
        />
      )}
      {tab === 'servicios' && (
        <ServiciosTab
          productoId={productoId}
          lineas={servicios}
          catalogo={catalogoServicios}
          onBOMChanged={onBOMChanged}
        />
      )}
    </div>
  )
}

/* ── Velocímetro financiero ─────────────────────────────────── */
function CostoVelocimetro({
  costoTotal, costoMateriales, costoServicios, precioBase,
}: { costoTotal: number; costoMateriales: number; costoServicios: number; precioBase: number | null }) {
  const pctMateriales = costoTotal > 0 ? (costoMateriales / costoTotal) * 100 : 0
  const margen = precioBase && precioBase > 0
    ? ((precioBase - costoTotal) / precioBase) * 100
    : null
  const margenColor = margen === null ? '' : margen >= 25 ? 'text-green-600' : margen >= 10 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm px-6 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Costo Industrial Estimado</span>
          <span className="text-xl font-black text-slate-900 mt-1 tabular-nums">{formatCurrency(costoTotal)}</span>
        </div>
        {margen !== null && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Rentabilidad Bruta</span>
            <span className={cn("text-lg font-black mt-1", margenColor)}>
              {margen.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="h-3 rounded-full overflow-hidden bg-slate-100 flex">
          <div
            className="h-full bg-blue-500 transition-all duration-700"
            style={{ width: `${pctMateriales}%` }}
          />
          <div
            className="h-full bg-purple-500 transition-all duration-700"
            style={{ width: `${100 - pctMateriales}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-blue-600">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            MP: {formatCurrency(costoMateriales)} ({pctMateriales.toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5 text-purple-600">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Serv: {formatCurrency(costoServicios)} ({(100 - pctMateriales).toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Tab Materiales ─────────────────────────────────────────── */
function MaterialesTab({
  productoId, lineas, catalogo, onBOMChanged,
}: { productoId: string; lineas: BOMLineaMaterial[]; catalogo: Material[]; onBOMChanged?: () => void | Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const usados = lineas.map(l => l.material_id)
  const disponibles = catalogo.filter(m => !usados.includes(m.id))

  const [materialId, setMaterialId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [notas, setNotas] = useState('')
  const [reportableEnCorte, setReportableEnCorte] = useState(true)

  function handleAdd() {
    if (!materialId || !cantidad) {
      setError('Debes seleccionar un material y definir la cantidad')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const res = await addBOMMaterial(productoId, materialId, parseFloat(cantidad), notas || undefined, reportableEnCorte)
        if (res.error) { 
          setError(`Error al guardar: ${res.error}`)
          return 
        }
        
        // Limpiar formulario antes de cerrar
        setMaterialId('')
        setCantidad('')
        setNotas('')
        setReportableEnCorte(true)
        setShowForm(false)
        
        // Notificar cambio y esperar a que los datos se refresquen
        if (onBOMChanged) {
          await onBOMChanged()
        }
      } catch (err) {
        setError('Error inesperado al intentar guardar el material')
        console.error(err)
      }
    })
  }

  return (
    <div className="space-y-2">
      {lineas.length === 0 && !showForm && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
            <Package className="w-8 h-8 text-slate-200" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Fórmula Vacía</p>
            <p className="text-[11px] text-slate-400 font-medium max-w-[200px]">Define las materias primas necesarias para fabricar esta prenda.</p>
          </div>
        </div>
      )}

      {lineas.map(l => (
        <LineaRow
          key={l.id}
          lineaId={l.id}
          productoId={productoId}
          nombre={`${l.materiales.codigo} — ${l.materiales.nombre}`}
          unidad={l.materiales.unidad}
          costoUnit={l.materiales.costo_unit}
          cantidad={l.cantidad}
          notas={l.notas}
          reportable_en_corte={l.reportable_en_corte}
          onBOMChanged={onBOMChanged}
        />
      ))}

      {showForm ? (
        <div className="rounded-xl bg-neu-base shadow-neu-inset p-4 space-y-3">
          <select
            value={materialId}
            onChange={e => setMaterialId(e.target.value)}
            className="w-full rounded-xl bg-neu-base shadow-neu px-3 py-2 text-body-sm text-foreground focus:outline-none"
          >
            <option value="">Seleccionar material...</option>
            {disponibles.map(m => (
              <option key={m.id} value={m.id}>
                {m.codigo} — {m.nombre} ({m.unidad}) · {formatCurrency(m.costo_unit)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                type="number"
                min={0.001}
                step={0.001}
                placeholder="Cantidad por prenda"
                className="w-full rounded-xl bg-neu-base shadow-neu px-3 py-2 text-body-sm text-foreground focus:outline-none"
              />
            </div>
            <input
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas"
              className="flex-1 rounded-xl bg-neu-base shadow-neu px-3 py-2 text-body-sm text-foreground focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={reportableEnCorte}
              onChange={e => setReportableEnCorte(e.target.checked)}
              className="w-4 h-4 rounded border border-primary-600 bg-white"
            />
            <span className="text-foreground">Reportable en corte</span>
          </label>
          {error && <p className="text-red-600 text-body-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => {
              setShowForm(false)
              setError(null)
              setMaterialId('')
              setCantidad('')
              setNotas('')
              setReportableEnCorte(true)
            }}
              className="flex-1 py-2 rounded-xl bg-neu-base shadow-neu text-body-sm text-muted-foreground">
              Cancelar
            </button>
            <button type="button" onClick={handleAdd} disabled={pending}
              className="flex-1 py-2 rounded-xl bg-primary-600 text-white font-semibold text-body-sm disabled:opacity-50 flex items-center justify-center gap-1">
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Agregar
            </button>
          </div>
        </div>
      ) : (
        <AddButton onClick={() => {
          setShowForm(true)
          setMaterialId('')
          setCantidad('')
          setNotas('')
          setReportableEnCorte(true)
          setError(null)
        }} label="Agregar material" disabled={disponibles.length === 0} />
      )}
    </div>
  )
}

/* ── Tab Servicios ──────────────────────────────────────────── */
function ServiciosTab({
  productoId, lineas, catalogo, onBOMChanged,
}: { productoId: string; lineas: BOMLineaServicio[]; catalogo: ServicioOperativo[]; onBOMChanged?: () => void | Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const usados = lineas.map(l => l.servicio_id)
  const disponibles = catalogo.filter(s => !usados.includes(s.id))

  // Agrupar catálogo por tipo_proceso para el select
  const porTipo = catalogo.reduce<Record<string, ServicioOperativo[]>>((acc, s) => {
    const tipo = s.tipo_proceso || 'otro'
    if (!acc[tipo]) acc[tipo] = []
    acc[tipo].push(s)
    return acc
  }, {})

  const [servicioId, setServicioId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [notas, setNotas] = useState('')

  function handleAdd() {
    startTransition(async () => {
      const res = await addBOMServicio(productoId, servicioId, parseFloat(cantidad), notas || undefined)
      if (res.error) { setError(res.error); return }
      await onBOMChanged?.()
      setShowForm(false)
      setError(null)
      setServicioId('')
      setCantidad('')
      setNotas('')
    })
  }

  return (
    <div className="space-y-2">
      {lineas.length === 0 && !showForm && (
        <p className="text-center text-muted-foreground text-body-sm py-4">
          Sin servicios. Agrega corte, confección, maquillado, etc.
        </p>
      )}

      {lineas.map(l => (
        <LineaRow
          key={l.id}
          lineaId={l.id}
          productoId={productoId}
          nombre={`${l.servicios_operativos.codigo} — ${l.servicios_operativos.nombre}`}
          unidad={l.servicios_operativos.tipo_proceso ? (TIPO_PROCESO_LABEL[l.servicios_operativos.tipo_proceso] ?? l.servicios_operativos.tipo_proceso) : 'Otro'}
          costoUnit={l.servicios_operativos.tarifa_unitaria}
          cantidad={l.cantidad}
          notas={l.notas}
          badge={l.servicios_operativos.tipo_proceso ? TIPO_PROCESO_LABEL[l.servicios_operativos.tipo_proceso] : 'Otro'}
          onBOMChanged={onBOMChanged}
        />
      ))}

      {showForm ? (
        <div className="rounded-xl bg-neu-base shadow-neu-inset p-4 space-y-3">
          <select
            value={servicioId}
            onChange={e => setServicioId(e.target.value)}
            className="w-full rounded-xl bg-neu-base shadow-neu px-3 py-2 text-body-sm text-foreground focus:outline-none"
          >
            <option value="">Seleccionar servicio...</option>
            {Object.entries(porTipo).map(([tipo, items]) => (
              <optgroup key={tipo} label={TIPO_PROCESO_LABEL[tipo] ?? tipo}>
                {items
                  .filter(s => !usados.includes(s.id))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.codigo} — {s.nombre} · {formatCurrency(s.tarifa_unitaria)}/ud
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              type="number"
              min={0.001}
              step={0.001}
              placeholder="Unidades por prenda"
              className="flex-1 rounded-xl bg-neu-base shadow-neu px-3 py-2 text-body-sm text-foreground focus:outline-none"
            />
            <input
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas"
              className="flex-1 rounded-xl bg-neu-base shadow-neu px-3 py-2 text-body-sm text-foreground focus:outline-none"
            />
          </div>
          {error && <p className="text-red-600 text-body-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(null) }}
              className="flex-1 py-2 rounded-xl bg-neu-base shadow-neu text-body-sm text-muted-foreground">
              Cancelar
            </button>
            <button type="button" onClick={handleAdd} disabled={pending}
              className="flex-1 py-2 rounded-xl bg-primary-600 text-white font-semibold text-body-sm disabled:opacity-50 flex items-center justify-center gap-1">
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Agregar
            </button>
          </div>
        </div>
      ) : (
        <AddButton onClick={() => setShowForm(true)} label="Agregar servicio" disabled={disponibles.length === 0} />
      )}
    </div>
  )
}

/* ── Fila de línea editable ─────────────────────────────────── */
function LineaRow({
  lineaId, productoId, nombre, unidad, costoUnit, cantidad, notas, badge, reportable_en_corte = true, onBOMChanged,
}: {
  lineaId: string
  productoId: string
  nombre: string
  unidad: string
  costoUnit: number
  cantidad: number
  notas: string | null
  badge?: string
  reportable_en_corte?: boolean
  onBOMChanged?: () => void | Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(String(cantidad))
  const [nota, setNota] = useState(notas ?? '')
  const [isReportable, setIsReportable] = useState(reportable_en_corte)
  const [pending, startTransition] = useTransition()

  const costoLinea = costoUnit * (parseFloat(qty) || 0)

  function handleSave() {
    startTransition(async () => {
      await updateBOMLinea(lineaId, productoId, parseFloat(qty), nota || undefined, isReportable)
      await onBOMChanged?.()
      setEditing(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteBOMLinea(lineaId, productoId)
      await onBOMChanged?.()
    })
  }

  return (
    <div className={`rounded-xl bg-neu-base shadow-neu px-4 py-3 transition-all ${editing ? 'ring-2 ring-primary-300' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground text-body-sm truncate">{nombre}</span>
            {badge && (
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-lg font-medium">
                {badge}
              </span>
            )}
          </div>

          {editing ? (
            <div className="space-y-2 mt-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  min={0.001}
                  step={0.001}
                  className="w-24 rounded-lg bg-neu-base shadow-neu-inset px-2 py-1 text-body-sm text-foreground focus:outline-none"
                />
                <span className="self-center text-xs text-muted-foreground">{unidad}</span>
                <input
                  type="text"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Notas"
                  className="flex-1 rounded-lg bg-neu-base shadow-neu-inset px-2 py-1 text-body-sm text-foreground focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={isReportable}
                  onChange={e => setIsReportable(e.target.checked)}
                  className="w-4 h-4 rounded border border-primary-600 bg-white"
                />
                <span className="text-foreground">Reportable en corte</span>
              </label>
            </div>
          ) : (
            <div className="text-xs mt-0.5">
              <p className="text-muted-foreground">
                {cantidad} {unidad} × {formatCurrency(costoUnit)} = <span className="font-medium text-foreground">{formatCurrency(costoLinea)}</span>
                {notas && <span className="ml-2">· {notas}</span>}
              </p>
              {isReportable && (
                <p className="text-primary-600 font-medium mt-1">✓ Se reporta en corte</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)}
                className="px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={pending}
                className="px-2 py-1 rounded-lg bg-primary-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1">
                {pending && <Loader2 className="w-3 h-3 animate-spin" />}
                Guardar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-neu-base shadow-neu">
                Editar
              </button>
              <button onClick={handleDelete} disabled={pending}
                className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-red-500 disabled:opacity-50">
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ────────────────────────────────────────────────── */
function TabButton({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
        active
          ? "bg-white text-slate-900 shadow-sm border border-slate-200"
          : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function AddButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-black/10 py-3 text-body-sm text-muted-foreground hover:text-foreground hover:border-black/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Plus className="w-4 h-4" />
      {disabled ? 'Todos los ítems ya están agregados' : label}
    </button>
  )
}
