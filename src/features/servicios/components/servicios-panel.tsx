import { useState, useTransition, useMemo, useRef } from 'react'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { Edit2, Wrench, Plus, Trash2, Loader2, Package } from 'lucide-react'
import {
  createServicioOperativo,
  updateServicioOperativo,
  deleteServicioOperativo,
  toggleServicioActivo,
} from '@/features/servicios/services/servicios-actions'
import { CodigoPreviewServicio } from '@/features/servicios/components/codigo-preview-servicio'
import type { ServicioOperativo, TipoServicioAtributo } from '@/features/servicios/types/servicios'

interface Props {
  servicios: ServicioOperativo[]
  tipos: TipoServicioAtributo[]
  subtipos: TipoServicioAtributo[]
  detalles: TipoServicioAtributo[]
  ejecutores: Array<{ id: string; nombre: string }>
}

export function ServiciosPanel({ servicios, tipos, subtipos, detalles, ejecutores }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showInactivos, setShowInactivos] = useState(false)

  // Form
  const [atributo1Id, setAtributo1Id] = useState<string | null>(null)
  const [atributo2Id, setAtributo2Id] = useState<string | null>(null)
  const [atributo3Id, setAtributo3Id] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [tarifa, setTarifa] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ejecutorId, setEjecutorId] = useState<string | null>(null)
  const [codigoCompleto, setCodigoCompleto] = useState(false)

  // Edición
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNombre, setEditingNombre] = useState('')
  const [editingTarifa, setEditingTarifa] = useState('')
  const [editingDescripcion, setEditingDescripcion] = useState('')
  const [editingEjecutorId, setEditingEjecutorId] = useState<string | null>(null)

  const visibles = showInactivos ? servicios.filter(s => !s.activo) : servicios.filter(s => s.activo)

  const subtiposFiltrados = useMemo(() => {
    if (!atributo1Id) return []
    return subtipos.filter(s => s.tipo_padre_id === atributo1Id)
  }, [atributo1Id, subtipos])

  const detallesFiltrados = useMemo(() => {
    if (!atributo2Id) return []
    return detalles.filter(d => d.subtipo_padre_id === atributo2Id)
  }, [atributo2Id, detalles])

  const handleAgregar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!atributo1Id || !atributo2Id) {
      setError('Debe seleccionar tipo y subtipo')
      return
    }

    if (!nombre.trim() || !tarifa) {
      setError('Nombre y tarifa son obligatorios')
      return
    }

    const tarifaNum = parseFloat(tarifa)
    if (isNaN(tarifaNum) || tarifaNum <= 0) {
      setError('Tarifa debe ser un número mayor a 0')
      return
    }

    startTransition(async () => {
      const res = await createServicioOperativo(
        atributo1Id,
        atributo2Id,
        atributo3Id || '',
        nombre,
        tarifaNum,
        descripcion || undefined,
        ejecutorId || undefined,
      )
      if (res.error) {
        setError(res.error)
        return
      }

      setAtributo1Id(null)
      setAtributo2Id(null)
      setAtributo3Id(null)
      setNombre('')
      setTarifa('')
      setDescripcion('')
      setEjecutorId(null)
      setCodigoCompleto(false)
      setShowForm(false)
    })
  }

  const handleEditarGuardar = (id: string) => {
    setError(null)
    const tarifaNum = parseFloat(editingTarifa)
    if (isNaN(tarifaNum) || tarifaNum <= 0) {
      setError('Tarifa debe ser un número mayor a 0')
      return
    }

    startTransition(async () => {
      const res = await updateServicioOperativo(id, {
        nombre: editingNombre,
        tarifa_unitaria: tarifaNum,
        descripcion: editingDescripcion || null,
        ejecutor_id: editingEjecutorId || null,
      })
      if (res.error) {
        setError(res.error)
        return
      }

      setEditingId(null)
    })
  }

  const handleEliminar = (id: string) => {
    if (!confirm('¿Eliminar este servicio?')) return
    startTransition(async () => {
      const res = await deleteServicioOperativo(id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  const handleToggleActivo = (id: string) => {
    startTransition(async () => {
      const res = await toggleServicioActivo(id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  const getEjecutorNombre = (ejecutor_id: string | null) => {
    if (!ejecutor_id) return '—'
    return ejecutores.find(e => e.id === ejecutor_id)?.nombre || '—'
  }

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
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Catálogo Operativo</span>
            <span className={cn("text-xs font-black uppercase tracking-tight mt-1", 
              showInactivos ? 'text-slate-900' : 'text-emerald-600'
            )}>
              {showInactivos ? 'Historial de Servicios' : 'Portafolio de Servicios Activos'}
            </span>
          </div>
        </label>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100"
          >
            <Plus className="w-4 h-4" />
            Crear Servicio
          </button>
        )}
      </div>

      {/* Form de creación */}
      {showForm && (
        <ServicioForm
          tipos={tipos}
          subtipos={subtipos}
          detalles={detalles}
          ejecutores={ejecutores}
          pending={pending}
          error={error}
          onSubmit={async (e, data) => {
            e.preventDefault()
            setError(null)
            if (!data.atributo1Id || !data.atributo2Id || !data.atributo3Id) {
              setError('Tipo, Subtipo y Detalle son obligatorios')
              return
            }
            startTransition(async () => {
              const res = await createServicioOperativo(
                data.atributo1Id!,
                data.atributo2Id!,
                data.atributo3Id!,
                data.nombre,
                data.tarifa,
                data.descripcion || undefined,
                data.ejecutorId || undefined
              )
              if (res.error) {
                setError(res.error)
              } else {
                setShowForm(false)
              }
            })
          }}
          onDone={() => setShowForm(false)}
        />
      )}

      {/* Lista vacía Premium */}
      {visibles.length === 0 && !showForm && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-24 flex flex-col items-center text-center max-w-2xl mx-auto mt-12 group">
          <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <Wrench className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-900 font-black text-2xl tracking-tighter uppercase">Sin Servicios Definidos</p>
          <p className="text-slate-400 text-sm mt-3 max-w-sm font-medium leading-relaxed">
            No se han encontrado procesos u operaciones en esta categoría. Define nuevos servicios para habilitar el costeo y la subcontratación.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-10 flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Plus className="w-5 h-5" />
            Empezar Portafolio
          </button>
        </div>
      )}

      {/* Tabla de Servicios Premium */}
      {visibles.length > 0 && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/20">
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-5 w-40">Servicio Ident.</th>
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-5 min-w-[250px]">Nombre & Descripción Operativa</th>
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-5 w-48">Ejecutor Asignado</th>
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right px-6 py-5 w-40">Tarifa Unitaria</th>
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-6 py-5 w-24">Estado</th>
                <th className="px-6 py-5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibles.map(srv => (
                editingId === srv.id ? (
                  <tr key={srv.id}>
                    <td colSpan={6} className="px-0 py-0">
                      <ServicioForm
                        servicio={srv}
                        tipos={tipos}
                        subtipos={subtipos}
                        detalles={detalles}
                        ejecutores={ejecutores}
                        pending={pending}
                        onDone={() => setEditingId(null)}
                        onSubmit={async (e, data) => {
                          e.preventDefault()
                          setError(null)
                          const res = await updateServicioOperativo(srv.id, {
                            nombre: data.nombre,
                            tarifa_unitaria: data.tarifa,
                            descripcion: data.descripcion,
                            ejecutor_id: data.ejecutorId,
                          })
                          if (res.error) {
                            setError(res.error)
                            return
                          }
                          setEditingId(null)
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={srv.id} className={cn('group/row transition-all hover:bg-slate-50/50', !srv.activo ? 'opacity-40 grayscale-[0.5]' : '')}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-[11px] font-black text-slate-900 tracking-wider font-mono bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/50">
                        {srv.codigo}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-slate-900 tracking-tight uppercase">{srv.nombre}</span>
                        {srv.descripcion && (
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1 opacity-70 truncate max-w-[300px]">
                            {srv.descripcion}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", srv.ejecutor_id ? "bg-indigo-400" : "bg-emerald-400")} />
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest truncate">
                          {getEjecutorNombre(srv.ejecutor_id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      <span className="text-sm font-black text-slate-900 tabular-nums">
                        {formatCurrency(srv.tarifa_unitaria)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button
                        onClick={() => handleToggleActivo(srv.id)}
                        disabled={pending}
                        className={cn('text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-xl border transition-all',
                          srv.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        )}
                      >
                        {srv.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => setEditingId(srv.id)}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-200 hover:shadow-md transition-all opacity-0 group-hover/row:opacity-100 ml-auto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface ServicioFormProps {
  servicio?: ServicioOperativo
  tipos: TipoServicioAtributo[]
  subtipos: TipoServicioAtributo[]
  detalles: TipoServicioAtributo[]
  ejecutores: Array<{ id: string; nombre: string }>
  pending: boolean
  error?: string | null
  onSubmit: (e: React.FormEvent<HTMLFormElement>, data: {
    atributo1Id: string | null
    atributo2Id: string | null
    atributo3Id: string | null
    nombre: string
    tarifa: number
    descripcion: string
    ejecutorId: string | null
  }) => void
  onDone: () => void
}

function ServicioForm({
  servicio,
  tipos,
  subtipos,
  detalles,
  ejecutores,
  pending,
  error: propError,
  onSubmit,
  onDone,
}: ServicioFormProps) {
  const isEdit = !!servicio
  
  // Local states for inputs to avoid affecting the main panel during edit
  const [atributo1Id, setAtributo1Id] = useState<string | null>(servicio?.atributo1_id || null)
  const [atributo2Id, setAtributo2Id] = useState<string | null>(servicio?.atributo2_id || null)
  const [atributo3Id, setAtributo3Id] = useState<string | null>(servicio?.atributo3_id || null)
  const [nombre, setNombre] = useState(servicio?.nombre || '')
  const nombreEditadoRef = useRef(false)
  const [tarifa, setTarifa] = useState(servicio?.tarifa_unitaria?.toString() || '')
  const [descripcion, setDescripcion] = useState(servicio?.descripcion || '')
  const [ejecutorId, setEjecutorId] = useState<string | null>(servicio?.ejecutor_id || null)
  const [codigoCompleto, setCodigoCompleto] = useState(isEdit)
  const [internalError, setInternalError] = useState<string | null>(null)

  const error = propError || internalError

  const currentSubtipos = useMemo(() => {
    if (!atributo1Id) return []
    return subtipos.filter(s => s.tipo_padre_id === atributo1Id)
  }, [atributo1Id, subtipos])

  const currentDetalles = useMemo(() => {
    if (!atributo2Id) return []
    return detalles.filter(d => d.subtipo_padre_id === atributo2Id)
  }, [atributo2Id, detalles])

  const handleLocalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setInternalError(null)
    
    if (!atributo1Id || !atributo2Id || !atributo3Id) {
      setInternalError('Todos los atributos (tipo, subtipo y detalle) son requeridos para identificar correctamente el servicio.')
      e.preventDefault()
      return
    }

    const tarifaNum = parseFloat(tarifa)
    if (isNaN(tarifaNum) || tarifaNum <= 0) {
      setInternalError('La tarifa debe ser un número mayor a 0')
      e.preventDefault()
      return
    }
    onSubmit(e, {
      atributo1Id,
      atributo2Id,
      atributo3Id,
      nombre,
      tarifa: tarifaNum,
      descripcion,
      ejecutorId
    })
  }

  return (
    <form onSubmit={handleLocalSubmit} className={`px-5 py-4 bg-neu-base shadow-neu-inset rounded-xl mx-0 my-0 space-y-4 ${isEdit ? 'ring-2 ring-primary-300' : ''}`}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {isEdit ? `Editando Servicio: ${servicio.codigo}` : 'Nuevo servicio operativo'}
      </p>

      {/* Top Section: Código Preview */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {isEdit ? 'Código Actual' : 'Código Generado *'}
        </label>
        {isEdit ? (
          <div className="rounded-xl bg-neu-base shadow-neu p-4">
            <p className="text-display-xs font-mono font-bold text-primary-600">
              {servicio.codigo}
            </p>
          </div>
        ) : (
          <CodigoPreviewServicio
            tipos={tipos}
            subtipos={currentSubtipos}
            detalles={currentDetalles}
            atributo1Id={atributo1Id}
            atributo2Id={atributo2Id}
            atributo3Id={atributo3Id}
            onCodigoChange={(_, completo) => setCodigoCompleto(completo)}
            onNombreRecomendado={(rec) => { 
              if (rec.trim() && !nombreEditadoRef.current) setNombre(rec) 
            }}
          />
        )}
      </div>

      {/* Row 1: Clasificación (Tipo, Subtipo, Detalle) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Tipo de Proceso *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              disabled={isEdit}
              value={atributo1Id || ''}
              onChange={e => {
                setAtributo1Id(e.target.value || null)
                setAtributo2Id(null)
                setAtributo3Id(null)
              }}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none disabled:opacity-50"
            >
              <option value="">Seleccionar tipo...</option>
              {tipos.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Subtipo *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              disabled={isEdit || !atributo1Id}
              value={atributo2Id || ''}
              onChange={e => {
                setAtributo2Id(e.target.value || null)
                setAtributo3Id(null)
              }}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none disabled:opacity-50"
            >
              <option value="">Seleccionar subtipo...</option>
              {currentSubtipos.map(subtipo => (
                <option key={subtipo.id} value={subtipo.id}>{subtipo.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Detalle específico *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              disabled={isEdit || !atributo2Id || currentDetalles.length === 0}
              required
              value={atributo3Id || ''}
              onChange={e => setAtributo3Id(e.target.value || null)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none disabled:opacity-50"
            >
              <option value="">
                {currentDetalles.length === 0 ? 'Sin detalles disponibles' : 'Seleccionar detalle...'}
              </option>
              {currentDetalles.map(detalle => (
                <option key={detalle.id} value={detalle.id}>{detalle.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 2: Identificación (Nombre + Ejecutor) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Nombre del Servicio *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              type="text"
              value={nombre}
              onChange={e => {
                nombreEditadoRef.current = true
                setNombre(e.target.value)
              }}
              placeholder="Ej: Corte recto estándar"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Tercero / Ejecutor</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              value={ejecutorId || ''}
              onChange={e => setEjecutorId(e.target.value || null)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Sin asignar (Interno)</option>
              {ejecutores.map(ejecutor => (
                <option key={ejecutor.id} value={ejecutor.id}>{ejecutor.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 3: Comercial (Tarifa + Descripción) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Tarifa Unitaria (COP) *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2 flex items-center">
            <span className="text-muted-foreground text-xs mr-1">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={tarifa}
              onChange={e => setTarifa(e.target.value)}
              placeholder="5000"
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Descripción breve</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Notas para la orden de servicio"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onDone}
          className="px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || (!isEdit && !codigoCompleto)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Crear servicio'}
        </button>
      </div>
    </form>
  )
}

interface ServicioRowProps {
  servicio: ServicioOperativo
  ejecutores: Array<{ id: string; nombre: string }>
  pending: boolean
  isEditing?: boolean
  editingNombre?: string
  editingTarifa?: string
  editingEjecutorId?: string | null
  onEditingNombreChange?: (nombre: string) => void
  onEditingTarifaChange?: (tarifa: string) => void
  onEditingEjecutorChange?: (ejecutorId: string | null) => void
  onSave?: () => void
  onCancel?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onToggleActivo?: () => void
}

function ServicioRow({
  servicio: srv,
  ejecutores,
  pending,
  isEditing,
  editingNombre,
  editingTarifa,
  editingEjecutorId,
  onEditingNombreChange,
  onEditingTarifaChange,
  onEditingEjecutorChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onToggleActivo,
}: ServicioRowProps) {
  const getEjecutorNombre = (ejecutor_id: string | null) => {
    if (!ejecutor_id) return '—'
    return ejecutores.find(e => e.id === ejecutor_id)?.nombre || '—'
  }

  if (isEditing && editingNombre !== undefined) {
    return (
      <tr className={!srv.activo ? 'opacity-50' : ''}>
        <td className="px-3 py-2"><span className="font-mono text-xs font-semibold text-primary-700">{srv.codigo}</span></td>
        <td className="px-3 py-2">
          <input
            type="text"
            value={editingNombre}
            onChange={e => onEditingNombreChange?.(e.target.value)}
            className="px-2 py-1 rounded-lg bg-neu-base shadow-neu text-xs text-foreground outline-none"
            autoFocus
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={editingEjecutorId || ''}
            onChange={e => onEditingEjecutorChange?.(e.target.value || null)}
            className="px-2 py-1 rounded-lg bg-neu-base shadow-neu text-xs text-foreground outline-none appearance-none"
          >
            <option value="">Sin asignar</option>
            {ejecutores.map(ejecutor => (
              <option key={ejecutor.id} value={ejecutor.id}>
                {ejecutor.nombre}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2 text-right">
          <input
            type="number"
            min="0"
            value={editingTarifa}
            onChange={e => onEditingTarifaChange?.(e.target.value)}
            className="px-2 py-1 rounded-lg bg-neu-base shadow-neu text-xs text-foreground text-right outline-none"
          />
        </td>
        <td className="px-3 py-2 text-center" />
        <td className="px-3 py-2 text-right">
          <div className="flex justify-end gap-1">
            <button
              onClick={onSave}
              disabled={pending}
              className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 text-xs"
              title="Guardar"
            >
              ✓
            </button>
            <button
              onClick={onCancel}
              className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-red-600 hover:text-red-700 transition-colors text-xs"
              title="Cancelar"
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={!srv.activo ? 'opacity-50' : ''}>
      <td className="px-3 py-2"><span className="font-mono text-xs font-semibold text-primary-700">{srv.codigo}</span></td>
      <td className="px-3 py-2"><span className="text-xs text-foreground">{srv.nombre}</span></td>
      <td className="px-3 py-2"><span className="text-xs text-muted-foreground">{getEjecutorNombre(srv.ejecutor_id)}</span></td>
      <td className="px-3 py-2 text-right"><span className="text-xs text-foreground font-mono">${srv.tarifa_unitaria.toLocaleString('es-CO')}</span></td>
      <td className="px-3 py-2 text-center">
        <button
          onClick={onToggleActivo}
          disabled={pending}
          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-lg transition-all disabled:opacity-50 ${
            srv.activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {srv.activo ? 'Activo' : 'Inactivo'}
        </button>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1">
          <button
            onClick={onEdit}
            disabled={pending}
            className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Editar"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            disabled={pending}
            className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  )
}
