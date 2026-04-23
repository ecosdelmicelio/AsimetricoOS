'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { Plus, Package, MapPin, Globe, Edit2, Loader2, AlertTriangle, Building2 } from 'lucide-react'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { getProveedores } from '@/features/compras/services/compras-actions'
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
    <div className="space-y-6 text-slate-900">
      {/* Header acciones Premium */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <label className="flex items-center gap-3 cursor-pointer group">
          <button
            onClick={() => setShowInactivos(v => !v)}
            className="group relative flex items-center justify-center shrink-0"
          >
            <div
              className={cn("w-12 h-6 rounded-full transition-all duration-300 border", 
                showInactivos ? 'bg-slate-900 border-slate-900' : 'bg-slate-100 border-slate-200 shadow-inner'
              )}
            >
              <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300", 
                showInactivos ? 'translate-x-7' : 'translate-x-1'
              )} />
            </div>
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Visibilidad</span>
            <span className={cn("text-xs font-black uppercase tracking-tight mt-1", 
              showInactivos ? 'text-slate-900' : 'text-emerald-600'
            )}>
              {showInactivos ? 'Historial de Inactivos' : 'Materiales de Uso Activo'}
            </span>
          </div>
        </label>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100"
          >
            <Plus className="w-4 h-4" />
            Crear Materia Prima
          </button>
        )}
      </div>

      {/* Form de creación */}
      {showForm && (
        <MaterialForm onDone={() => setShowForm(false)} />
      )}

      {/* Lista vacía Premium */}
      {visibles.length === 0 && !showForm && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-24 flex flex-col items-center text-center max-w-2xl mx-auto mt-12 group">
          <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-900 font-black text-2xl tracking-tighter uppercase">Sin Materias Primas Registradas</p>
          <p className="text-slate-400 text-sm mt-3 max-w-sm font-medium leading-relaxed">
            No hay materiales que coincidan con el filtro seleccionado. Comienza creando telas, hilos o accesorios.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-10 flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Plus className="w-5 h-5" />
            Registrar Primer Material
          </button>
        </div>
      )}

      {/* Tabla Premium */}
      {visibles.length > 0 && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/20">
                <th className="hidden lg:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-4 w-24">Registro</th>
                <th className="hidden sm:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-4 w-32">Identificación</th>
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-4">Descripción de la Materia Prima</th>
                <th className="hidden md:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-4 w-20">U.M.</th>
                <th className="hidden lg:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-right px-4 py-4 w-24">Saldos</th>
                <th className="hidden xl:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-right px-4 py-4 w-32">Valorización</th>
                <th className="hidden md:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4 py-4 w-24">Status</th>
                <th className="px-4 py-4 w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
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
    <tr className={cn('group/row transition-all hover:bg-slate-50/50', !m.activo ? 'opacity-40 grayscale-[0.5]' : '')}>
      <td className="hidden lg:table-cell px-4 py-4 whitespace-nowrap">
        <span className="text-[10px] font-black text-slate-400 tabular-nums">
          {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
        </span>
      </td>
      <td className="hidden sm:table-cell px-4 py-4">
        <span className="text-[11px] font-black text-slate-900 tracking-wider font-mono bg-slate-100 px-2 py-1 rounded-lg truncate block">
          {m.codigo}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className={cn("hidden md:flex w-8 h-8 rounded-xl items-center justify-center shrink-0 border", 
            m.tipo_mp === 'nacional' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
          )}>
            {m.tipo_mp === 'nacional' ? <MapPin className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-black text-slate-900 truncate tracking-tight uppercase">{m.nombre}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest md:hidden">
                {UNIDADES.find(u => u.value === m.unidad)?.label ?? m.unidad}
              </span>
              <span className="text-[10px] font-black text-emerald-600 tracking-widest md:hidden">
                {formatCurrency(saldo?.costo_promedio ?? m.costo_unit)}
              </span>
            </div>
            {m.terceros?.nombre && (
              <p className="hidden sm:block text-[9px] font-black text-slate-400 mt-1 uppercase truncate opacity-70">
                <Building2 className="w-3 h-3 inline mr-1 mb-0.5" />
                {m.terceros.nombre}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="hidden md:table-cell px-4 py-4">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {UNIDADES.find(u => u.value === m.unidad)?.label ?? m.unidad}
        </span>
      </td>
      <td className="hidden lg:table-cell px-4 py-4 text-right whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-900 tabular-nums">{saldo?.saldo_total ?? 0}</span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">disponible</span>
        </div>
      </td>
      <td className="hidden xl:table-cell px-4 py-4 text-right whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-900 tabular-nums">
            {formatCurrency(saldo?.valor_total ?? 0)}
          </span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
            CU: {formatCurrency(saldo?.costo_promedio ?? m.costo_unit)}
          </span>
        </div>
      </td>
      <td className="hidden md:table-cell px-4 py-4 text-center">
        <button
          onClick={onToggleActivo}
          className={cn('text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-xl border transition-all',
            m.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
          )}
        >
          {m.activo ? 'Act.' : 'Inact.'}
        </button>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex justify-end opacity-100 transition-all duration-300">
          <button
            onClick={onEdit}
            title="Editar materia prima"
            className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:shadow-md transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
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

  const [minimoCompra, setMinimoCompra] = useState(material?.minimo_compra?.toString() ?? '')
  const [multiploCompra, setMultiploCompra] = useState(material?.multiplo_compra?.toString() ?? '')
  const [leadtimeDias, setLeadtimeDias] = useState(material?.leadtime_dias?.toString() ?? '')
  const [stockSeguridad, setStockSeguridad] = useState(material?.stock_seguridad?.toString() ?? '')
  const [toleranciaRecepcionPct, setToleranciaRecepcionPct] = useState(material?.tolerancia_recepcion_pct?.toString() ?? '')
  const [unidadEmpaque, setUnidadEmpaque] = useState(material?.unidad_empaque ?? '')
  const [proveedorId, setProveedorId] = useState(material?.proveedor_id ?? '')
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([])

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

    const cargarProveedores = async () => {
      const resp = await getProveedores()
      setProveedores(resp)
    }
    cargarProveedores()
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
      const variablesLogisticas = {
        minimo_compra: minimoCompra ? parseFloat(minimoCompra) : undefined,
        multiplo_compra: multiploCompra ? parseFloat(multiploCompra) : undefined,
        leadtime_dias: leadtimeDias ? parseInt(leadtimeDias, 10) : undefined,
        stock_seguridad: stockSeguridad ? parseFloat(stockSeguridad) : undefined,
        tolerancia_recepcion_pct: toleranciaRecepcionPct ? parseFloat(toleranciaRecepcionPct) : undefined,
        unidad_empaque: unidadEmpaque.trim() || undefined,
        proveedor_id: proveedorId || undefined,
      }

      const res = isEdit
        ? await updateMaterial(material.id, {
            nombre,
            unidad,
            costo_unit: costoNum,
            referencia_proveedor: referenciaProveedor || undefined,
            partida_arancelaria: partidaArancelaria || undefined,
            tipo_mp: tipoMP,
            activo,
            rendimiento_kg: rendimientoNum,
            ...variablesLogisticas
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
            ...variablesLogisticas
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

      {/* Row 4: Costo, Rendimiento y Arancel */}
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

      {/* Row 5: Parámetros de Cadena de Suministro */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-black/5 pt-3">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Unidad Empaque Prov.</label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={unidadEmpaque}
              onChange={e => setUnidadEmpaque(e.target.value)}
              placeholder="Ej: Rollo x50m, Caja x500"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Proveedor Predeterminado (MRP)</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-2.5 py-1.5 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={proveedorId}
              onChange={e => setProveedorId(e.target.value)}
              className="w-full bg-transparent text-xs text-foreground outline-none appearance-none"
            >
              <option value="">— Seleccionar Proveedor —</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Mínimo (MOQ)</label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
            <input
              type="number"
              min="0"
              step="0.1"
              value={minimoCompra}
              onChange={e => setMinimoCompra(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Múltiplo</label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
            <input
              type="number"
              min="0"
              step="0.1"
              value={multiploCompra}
              onChange={e => setMultiploCompra(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stock Seguridad</label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
            <input
              type="number"
              min="0"
              step="0.1"
              value={stockSeguridad}
              onChange={e => setStockSeguridad(e.target.value)}
              placeholder="Alertar bajo..."
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">LeadTime (Días)</label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
            <input
              type="number"
              min="0"
              value={leadtimeDias}
              onChange={e => setLeadtimeDias(e.target.value)}
              placeholder="0 días"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tolerancia Recep. (%)</label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={toleranciaRecepcionPct}
              onChange={e => setToleranciaRecepcionPct(e.target.value)}
              placeholder="+/- %"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
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
