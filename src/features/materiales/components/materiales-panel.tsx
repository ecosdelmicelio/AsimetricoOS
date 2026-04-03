'use client'

import { useState, useTransition, useCallback, useMemo, useEffect, useRef } from 'react'
import { Plus, Edit2, Loader2, Package, AlertTriangle, RotateCcw } from 'lucide-react'
import { createMaterial, updateMaterial } from '@/features/materiales/services/materiales-actions'
import { useDuplicateCheck } from '@/shared/hooks/use-duplicate-check'
import { CodigoBuilder } from '@/features/codigo-schema/components/codigo-builder'
import type { CodigoSchema, SegmentoSeleccion } from '@/features/codigo-schema/types'
import type { Material, UnidadMaterial } from '@/features/materiales/types'

const UNIDADES: { value: UnidadMaterial; label: string }[] = [
  { value: 'metros',   label: 'Metros (m)' },
  { value: 'kg',       label: 'Kilogramos (kg)' },
  { value: 'unidades', label: 'Unidades (ud)' },
  { value: 'conos',    label: 'Conos' },
  { value: 'lb',       label: 'Libras (lb)' },
]

const UNIDAD_LABEL: Record<UnidadMaterial, string> = {
  metros: 'm', kg: 'kg', unidades: 'ud', conos: 'cono', lb: 'lb',
}

function formatCop(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  materiales: Material[]
  schema: CodigoSchema | null
}

export function MaterialesPanel({ materiales, schema }: Props) {
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showInactivos, setShowInactivos] = useState(false)

  const visibles = showInactivos ? materiales : materiales.filter(m => m.activo)

  return (
    <div className="space-y-4">
      {/* Header acciones */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setShowInactivos(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors ${showInactivos ? 'bg-primary-500' : 'bg-neu-base shadow-neu-inset'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showInactivos ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-body-sm text-muted-foreground">Ver inactivos</span>
        </label>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo material
          </button>
        )}
      </div>

      {/* Form de creación */}
      {showForm && (
        <MaterialForm schema={schema} onDone={() => setShowForm(false)} />
      )}

      {/* Lista vacía */}
      {visibles.length === 0 && !showForm && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-3">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Sin materiales</p>
          <p className="text-body-sm text-muted-foreground mt-1">Agrega telas, hilos, elásticos e insumos</p>
        </div>
      )}

      {/* Tabla */}
      {visibles.length > 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-black/5 bg-neu-base">
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Código</span>
            <span className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unidad</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Costo unit.</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Estado</span>
            <span className="col-span-1" />
          </div>

          <div className="divide-y divide-black/5">
            {visibles.map(m =>
              editingId === m.id
                ? <MaterialForm key={m.id} schema={schema} material={m} onDone={() => setEditingId(null)} />
                : <MaterialRow key={m.id} material={m} onEdit={() => setEditingId(m.id)} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MaterialRow({ material: m, onEdit }: { material: Material; onEdit: () => void }) {
  return (
    <div className={`grid grid-cols-12 gap-3 items-center px-5 py-3 ${!m.activo ? 'opacity-50' : ''}`}>
      <span className="col-span-2 font-mono text-body-sm font-semibold text-primary-700">{m.codigo}</span>
      <div className="col-span-4">
        <p className="text-body-sm font-medium text-foreground">{m.nombre}</p>
        {m.descripcion && <p className="text-xs text-muted-foreground truncate">{m.descripcion}</p>}
      </div>
      <span className="col-span-2 text-body-sm text-muted-foreground">{UNIDADES.find(u => u.value === m.unidad)?.label ?? m.unidad}</span>
      <span className="col-span-2 text-body-sm text-foreground text-right font-medium">{formatCop(m.costo_unit)}/{UNIDAD_LABEL[m.unidad]}</span>
      <div className="col-span-1 flex justify-center">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${m.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {m.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <div className="col-span-1 flex justify-end">
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function MaterialForm({
  material,
  schema,
  onDone,
}: {
  material?: Material
  schema: CodigoSchema | null
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [activo, setActivo] = useState(material?.activo ?? true)
  const [codigoManual, setCodigoManual] = useState(material?.codigo ?? '')
  const [codigoState, setCodigoState] = useState<{
    codigo: string
    completo: boolean
    selecciones: SegmentoSeleccion[]
  }>({ codigo: '', completo: false, selecciones: [] })
  const [nombre, setNombre] = useState(material?.nombre ?? '')
  const [unidad, setUnidad] = useState<UnidadMaterial>(material?.unidad ?? 'metros')
  const [costoUnit, setCostoUnit] = useState(material?.costo_unit?.toString() ?? '')
  const [descripcion, setDescripcion] = useState(material?.descripcion ?? '')
  const [rendimientoKg, setRendimientoKg] = useState(material?.rendimiento_kg?.toString() ?? '')
  const isEdit = !!material
  const usaSchema = !isEdit && !!schema

  // Refs para saber si el usuario editó manualmente (y dejar de auto-rellenar)
  const nombreEditadoRef = useRef(isEdit)
  const descripcionEditadaRef = useRef(isEdit)

  // Texto auto-generado: concatenación de etiquetas de cada valor seleccionado
  const autoTexto = useMemo(() => {
    if (!schema || codigoState.selecciones.length === 0) return ''
    return codigoState.selecciones
      .filter(s => s.tipo === 'selector' && s.valor)
      .map(s => {
        const seg = schema.segmentos.find(sg => sg.id === s.segmento_id)
        return seg?.valores.find(v => v.valor === s.valor)?.etiqueta ?? ''
      })
      .filter(Boolean)
      .join(' ')
  }, [schema, codigoState.selecciones])

  // Auto-rellenar nombre y descripción cuando cambian las selecciones
  useEffect(() => {
    if (!usaSchema || !autoTexto) return
    if (!nombreEditadoRef.current) setNombre(autoTexto)
    if (!descripcionEditadaRef.current) setDescripcion(autoTexto)
  }, [autoTexto, usaSchema])

  const handleCodigoChange = useCallback(
    (result: { codigo: string; completo: boolean; selecciones: SegmentoSeleccion[] }) => {
      setCodigoState(result)
    },
    [],
  )

  const codigoEffectivo = usaSchema ? codigoState.codigo : codigoManual

  const { isDuplicate: codigoDuplicado, checking: checkingCodigo } = useDuplicateCheck({
    table: 'materiales',
    field: 'codigo',
    value: codigoEffectivo,
    excludeId: material?.id,
    enabled: !isEdit && codigoEffectivo.trim().length > 0 && (!usaSchema || codigoState.completo),
  })

  const { isDuplicate: nombreDuplicado, checking: checkingNombre } = useDuplicateCheck({
    table: 'materiales',
    field: 'nombre',
    value: nombre,
    excludeId: material?.id,
    enabled: nombre.trim().length > 2,
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const costoNum = parseFloat(costoUnit)
    if (!nombre.trim() || isNaN(costoNum) || costoNum < 0) {
      setError('Nombre y costo son obligatorios')
      return
    }
    if (!isEdit && codigoDuplicado) {
      setError('Ya existe un material con ese código')
      return
    }
    if (usaSchema && !codigoState.completo) {
      setError('Completa el código antes de continuar')
      return
    }

    const autoRefs = codigoState.selecciones
      .filter(s => s.tipo === 'auto_ref')
      .map(s => ({ segmento_id: s.segmento_id, longitud: s.longitud }))

    setError(null)
    startTransition(async () => {
      const rendimientoNum = rendimientoKg ? parseFloat(rendimientoKg) : null
      const res = isEdit
        ? await updateMaterial(material.id, { nombre, unidad, costo_unit: costoNum, descripcion, activo, rendimiento_kg: rendimientoNum })
        : await createMaterial({
            codigo: codigoEffectivo,
            nombre,
            unidad,
            costo_unit: costoNum,
            descripcion,
            rendimiento_kg: rendimientoNum,
            autoRefs: autoRefs.length > 0 ? autoRefs : undefined,
            schema_id: schema?.id,
          })
      if (res.error) { setError(res.error); return }
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 bg-neu-base shadow-neu-inset rounded-xl mx-3 my-2 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {isEdit ? `Editando ${material.codigo}` : 'Nuevo material'}
      </p>

      {/* Código: CodigoBuilder si hay schema, campo manual si no */}
      {!isEdit && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Código *</label>
          {usaSchema ? (
            <CodigoBuilder schema={schema} onChange={handleCodigoChange} />
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                {checkingCodigo && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              </div>
              <div className={`rounded-lg bg-neu-base shadow-neu px-3 py-2 ${codigoDuplicado ? 'ring-1 ring-red-400' : ''}`}>
                <input
                  value={codigoManual}
                  onChange={e => setCodigoManual(e.target.value.toUpperCase())}
                  required
                  placeholder="TEL-004"
                  className="w-full bg-transparent text-body-sm font-mono text-foreground outline-none"
                />
              </div>
              {codigoDuplicado && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span className="text-[10px]">Código ya existe</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Nombre */}
        <div className="space-y-1 sm:col-span-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-foreground">Nombre *</label>
            {checkingNombre && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            {usaSchema && autoTexto && nombreEditadoRef.current && (
              <button
                type="button"
                onClick={() => { nombreEditadoRef.current = false; setNombre(autoTexto) }}
                title="Restaurar nombre automático"
                className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary-600 transition-colors"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Auto
              </button>
            )}
            {usaSchema && autoTexto && !nombreEditadoRef.current && (
              <span className="ml-auto text-[10px] text-primary-500 font-medium">Auto</span>
            )}
          </div>
          <div className={`rounded-lg bg-neu-base shadow-neu px-3 py-2 ${nombreDuplicado ? 'ring-1 ring-amber-400' : ''}`}>
            <input
              value={nombre}
              onChange={e => { nombreEditadoRef.current = true; setNombre(e.target.value) }}
              required
              placeholder="Tela algodón 180g"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          {nombreDuplicado && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span className="text-[10px]">Ya existe un material con este nombre</span>
            </div>
          )}
        </div>

        {/* Unidad */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Unidad</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              value={unidad}
              onChange={e => setUnidad(e.target.value as UnidadMaterial)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              {UNIDADES.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Costo */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Costo/unidad (COP) *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              type="number"
              min="0"
              step="1"
              required
              value={costoUnit}
              onChange={e => setCostoUnit(e.target.value)}
              placeholder="8500"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Rendimiento (m/kg) — solo para metros */}
        {unidad === 'metros' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Rendimiento (m/kg)</label>
            <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
              <input
                type="number"
                min="0"
                step="0.1"
                value={rendimientoKg}
                onChange={e => setRendimientoKg(e.target.value)}
                placeholder="3.5"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Metros por kilogramo</p>
          </div>
        )}

        {/* Descripción */}
        <div className={`space-y-1 ${unidad === 'metros' ? 'sm:col-span-1' : 'sm:col-span-2'}`}>
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-foreground">Descripción</label>
            {usaSchema && autoTexto && descripcionEditadaRef.current && (
              <button
                type="button"
                onClick={() => { descripcionEditadaRef.current = false; setDescripcion(autoTexto) }}
                title="Restaurar descripción automática"
                className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary-600 transition-colors"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Auto
              </button>
            )}
            {usaSchema && autoTexto && !descripcionEditadaRef.current && (
              <span className="ml-auto text-[10px] text-primary-500 font-medium">Auto</span>
            )}
          </div>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              value={descripcion}
              onChange={e => { descripcionEditadaRef.current = true; setDescripcion(e.target.value) }}
              placeholder="Especificación técnica..."
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Estado (solo edición) */}
      {isEdit && (
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <div
            onClick={() => setActivo(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors ${activo ? 'bg-primary-500' : 'bg-neu-base shadow-neu-inset'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-body-sm text-foreground">{activo ? 'Activo' : 'Inactivo'}</span>
        </label>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone}
          className="px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || (!isEdit && codigoDuplicado) || (usaSchema && !codigoState.completo)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Crear material'}
        </button>
      </div>
    </form>
  )
}
