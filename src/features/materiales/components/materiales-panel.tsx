'use client'

import { useState, useTransition, useCallback, useMemo, useEffect, useRef } from 'react'
import { Plus, Edit2, Loader2, Package, AlertTriangle } from 'lucide-react'
import { createMaterial, updateMaterial, toggleMaterialActivo } from '@/features/materiales/services/materiales-actions'
import { useDuplicateCheck } from '@/shared/hooks/use-duplicate-check'
import { CodigoPreviewMP } from '@/features/materiales/components/codigo-preview-mp'
import { getAtributosMP, getAtributosPorTipoMP } from '@/features/materiales/services/atributo-actions'
import type { Material, UnidadMaterial, TipoMP } from '@/features/materiales/types'
import type { AtributoMP, TipoAtributoMP } from '@/features/materiales/types/atributos'
import { TIPOS_ATRIBUTO_MP, LABELS_ATRIBUTO_MP } from '@/features/materiales/types/atributos'
import type { SaldoTotalMP } from '@/features/kardex/services/kardex-actions'

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
  saldosPorMaterial?: SaldoTotalMP[]
}

export function MaterialesPanel({ materiales, saldosPorMaterial = [] }: Props) {
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showInactivos, setShowInactivos] = useState(false)

  // Crear índice de saldos por material_id para acceso O(1)
  const saldoMap = new Map(saldosPorMaterial.map(s => [s.material_id, s]))

  const visibles = showInactivos ? materiales.filter(m => !m.activo) : materiales.filter(m => m.activo)

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
        <MaterialForm onDone={() => setShowForm(false)} />
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
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black/5 bg-neu-base">
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Creación</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Código</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Nombre</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Unidad</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2">Stock</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2">Costo Unit.</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2">Costo Total</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-center px-3 py-2">Tipo</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-center px-3 py-2">Estado</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visibles.map(m => {
                const saldo = saldoMap.get(m.id)
                return editingId === m.id
                  ? <MaterialForm key={m.id} material={m} onDone={() => setEditingId(null)} />
                  : <MaterialRow key={m.id} material={m} onEdit={() => setEditingId(m.id)} onToggleActivo={async () => {
                      await toggleMaterialActivo(m.id)
                    }} saldo={saldo} />
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MaterialRow({ material: m, onEdit, onToggleActivo, saldo }: { material: Material; onEdit: () => void; onToggleActivo: () => void; saldo?: SaldoTotalMP }) {
  return (
    <tr className={!m.activo ? 'opacity-50' : ''}>
      <td className="px-3 py-2"><span className="text-xs text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</span></td>
      <td className="px-3 py-2"><span className="font-mono text-xs font-semibold text-primary-700">{m.codigo}</span></td>
      <td className="px-3 py-2">
        <p className="text-xs font-medium text-foreground line-clamp-2">{m.nombre}</p>
      </td>
      <td className="px-3 py-2"><span className="text-xs text-muted-foreground">{UNIDADES.find(u => u.value === m.unidad)?.label ?? m.unidad}</span></td>
      <td className="px-3 py-2 text-right"><span className="text-xs font-mono text-foreground">{saldo?.saldo_total ?? 0}</span></td>
      <td className="px-3 py-2 text-right"><span className="text-xs text-foreground font-medium">{formatCop(saldo?.costo_promedio ?? m.costo_unit)}/{UNIDAD_LABEL[m.unidad]}</span></td>
      <td className="px-3 py-2 text-right"><span className="text-xs font-mono text-foreground font-semibold">{formatCop(saldo?.valor_total ?? 0)}</span></td>
      <td className="px-3 py-2 text-center">
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-lg bg-blue-100 text-blue-700 capitalize">
          {m.tipo_mp}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        <button
          onClick={onToggleActivo}
          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-lg transition-colors ${
            m.activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {m.activo ? 'Activo' : 'Inactivo'}
        </button>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={onEdit}
          className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </td>
    </tr>
  )
}

function MaterialForm({
  material,
  onDone,
}: {
  material?: Material
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [activo, setActivo] = useState(material?.activo ?? true)
  const [tipoMP, setTipoMP] = useState<TipoMP>(material?.tipo_mp ?? 'nacional')
  const [codigo, setCodigo] = useState('')
  const [codigoCompleto, setCodigoCompleto] = useState(false)
  const [nombre, setNombre] = useState(material?.nombre ?? '')
  const [unidad, setUnidad] = useState<UnidadMaterial>(material?.unidad ?? 'metros')
  const [costoUnit, setCostoUnit] = useState(material?.costo_unit?.toString() ?? '')
  const [referenciaProveedor, setReferenciaProveedor] = useState(material?.referencia_proveedor ?? '')
  const [partidaArancelaria, setPartidaArancelaria] = useState(material?.partida_arancelaria ?? '')
  const [rendimientoKg, setRendimientoKg] = useState(material?.rendimiento_kg?.toString() ?? '')

  // Atributos
  const [atributosPorTipo, setAtributosPorTipo] = useState<Record<TipoAtributoMP, AtributoMP[]>>({
    tipo: [],
    subtipo: [],
    color: [],
    diseño: [],
  })
  const [atributosSeleccionados, setAtributosSeleccionados] = useState<Record<TipoAtributoMP, string>>({
    tipo: '',
    subtipo: '',
    color: '',
    diseño: '',
  })

  const nombreEditadoRef = useRef(false)

  const isEdit = !!material

  // Cargar atributos al montar
  useEffect(() => {
    const cargarAtributos = async () => {
      const tipos = await Promise.all(
        TIPOS_ATRIBUTO_MP.map(async (tipo) => ({
          tipo,
          atributos: await getAtributosPorTipoMP(tipo),
        }))
      )
      const mapa = Object.fromEntries(
        tipos.map(({ tipo, atributos }) => [tipo, atributos])
      ) as Record<TipoAtributoMP, AtributoMP[]>
      setAtributosPorTipo(mapa)
    }
    cargarAtributos()
  }, [])

  const handleCodigoChange = useCallback((nuevoCodigo: string, completo: boolean) => {
    setCodigo(nuevoCodigo)
    setCodigoCompleto(completo)
  }, [])

  const { isDuplicate: codigoDuplicado, checking: checkingCodigo } = useDuplicateCheck({
    table: 'materiales',
    field: 'codigo',
    value: codigo,
    excludeId: material?.id,
    enabled: !isEdit && codigo.trim().length > 0 && codigoCompleto,
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
    if (!isEdit && !codigoCompleto) {
      setError('Completa el código antes de continuar')
      return
    }
    if (!atributosSeleccionados.tipo || !atributosSeleccionados.subtipo || !atributosSeleccionados.color || !atributosSeleccionados.diseño) {
      setError('Todos los atributos (tipo, subtipo, color, diseño) son requeridos')
      return
    }

    setError(null)
    startTransition(async () => {
      const rendimientoNum = rendimientoKg ? parseFloat(rendimientoKg) : null
      const res = isEdit
        ? await updateMaterial(material.id, {
            nombre,
            unidad,
            costo_unit: costoNum,
            referencia_proveedor: referenciaProveedor || undefined,
            partida_arancelaria: partidaArancelaria || undefined,
            tipo_mp: tipoMP,
            activo,
            rendimiento_kg: rendimientoNum
          })
        : await createMaterial({
            codigo,
            nombre,
            unidad,
            costo_unit: costoNum,
            referencia_proveedor: referenciaProveedor || undefined,
            partida_arancelaria: partidaArancelaria || undefined,
            tipo_mp: tipoMP,
            rendimiento_kg: rendimientoNum,
            atributos: atributosSeleccionados,
          })
      if (res.error) { setError(res.error); return }
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 bg-neu-base shadow-neu-inset rounded-xl mx-3 my-2 space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {isEdit ? `Editando ${material.codigo}` : 'Nuevo material'}
      </p>

      {/* Top Row: Código Generado + Tipo MP Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-start">
        {!isEdit ? (
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Código Generado *</label>
            <CodigoPreviewMP
              atributos={[
                ...(atributosPorTipo.tipo || []),
                ...(atributosPorTipo.subtipo || []),
                ...(atributosPorTipo.color || []),
                ...(atributosPorTipo.diseño || []),
              ]}
              tipoId={atributosSeleccionados.tipo || null}
              subtipoId={atributosSeleccionados.subtipo || null}
              colorId={atributosSeleccionados.color || null}
              disenoId={atributosSeleccionados.diseño || null}
              onCodigoChange={handleCodigoChange}
              onNombreRecomendado={(nombre) => {
                if (nombre.trim() && !nombreEditadoRef.current) setNombre(nombre)
              }}
            />
          </div>
        ) : (
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Código del Material</label>
            <div className="rounded-xl bg-neu-base shadow-neu p-4">
              <p className="text-display-xs font-mono font-bold text-primary-600">
                {material.codigo}
              </p>
            </div>
          </div>
        )}
        
        <div className="space-y-1 md:min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">Origen del Material *</label>
          <div className="relative flex rounded-xl bg-neu-base shadow-neu-inset p-1 w-full">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-primary-600 shadow transition-transform duration-300 ${
                tipoMP === 'nacional' ? 'translate-x-0' : 'translate-x-full'
              }`} 
            />
            <button
              type="button"
              disabled={isEdit}
              onClick={() => setTipoMP('nacional')}
              className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
                tipoMP === 'nacional' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              } ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Nacional
            </button>
            <button
              type="button"
              disabled={isEdit}
              onClick={() => setTipoMP('importado')}
              className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
                tipoMP === 'importado' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              } ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Importado
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Nombre + Unidad + Ref Proveedor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-foreground">Nombre *</label>
            {checkingNombre && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
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
              <span className="text-[10px]">Nombre duplicado</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Unidad de Medida</label>
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

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Referencia Proveedor</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              value={referenciaProveedor}
              onChange={e => setReferenciaProveedor(e.target.value)}
              placeholder="SKU-PROV-123"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Row 3: Atributos de Configuración */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Atributos del Material</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TIPOS_ATRIBUTO_MP.map(tipoAtributo => (
            <div key={tipoAtributo} className="space-y-0.5">
              <label className="text-[10px] font-medium text-muted-foreground block truncate">
                {LABELS_ATRIBUTO_MP[tipoAtributo]} *
              </label>
              <select
                value={atributosSeleccionados[tipoAtributo]}
                onChange={e =>
                  setAtributosSeleccionados(prev => ({
                    ...prev,
                    [tipoAtributo]: e.target.value,
                  }))
                }
                className="w-full text-xs rounded-lg bg-neu-base shadow-neu-inset px-2 py-1.5 text-foreground outline-none appearance-none"
              >
                <option value="">—</option>
                {(atributosPorTipo[tipoAtributo] ?? []).map(attr => (
                  <option key={attr.id} value={attr.id}>
                    {attr.valor}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Costo + Partida Arancelaria + Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Costo/unidad (COP) *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2 flex items-center">
            <span className="text-muted-foreground text-xs mr-1">$</span>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={costoUnit}
              onChange={e => setCostoUnit(e.target.value)}
              placeholder="8500"
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Partida Arancelaria</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              value={partidaArancelaria}
              onChange={e => setPartidaArancelaria(e.target.value)}
              placeholder="6204.62.20"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

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
          </div>
        )}
      </div>

      {/* Footer: Estado y Acciones */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setActivo(v => !v)}
                className={`relative w-8 h-4 rounded-full transition-colors ${activo ? 'bg-green-500' : 'bg-neu-base shadow-neu-inset'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-[11px] font-medium text-foreground">{activo ? 'Activo' : 'Inactivo'}</span>
            </label>
          )}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          {!isEdit && checkingCodigo && <span className="text-[10px] text-muted-foreground animate-pulse">Verificando disponibilidad...</span>}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onDone}
            className="px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || (!isEdit && codigoDuplicado) || (!isEdit && !codigoCompleto)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
          >
            {pending && <Loader2 className="w-3 h-3 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear material'}
          </button>
        </div>
      </div>
    </form>
  )
}
