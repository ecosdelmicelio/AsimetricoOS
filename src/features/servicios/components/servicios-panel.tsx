'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Trash2, Edit2, Loader2, Wrench } from 'lucide-react'
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
            Nuevo servicio
          </button>
        )}
      </div>

      {/* Form de creación */}
      {showForm && (
        <ServicioForm
          tipos={tipos}
          subtipos={subtipos}
          detalles={detalles}
          subtiposFiltrados={subtiposFiltrados}
          detallesFiltrados={detallesFiltrados}
          atributo1Id={atributo1Id}
          atributo2Id={atributo2Id}
          nombre={nombre}
          tarifa={tarifa}
          descripcion={descripcion}
          ejecutorId={ejecutorId}
          codigoCompleto={codigoCompleto}
          ejecutores={ejecutores}
          pending={pending}
          error={error}
          onAtributo1Change={(id) => {
            setAtributo1Id(id)
            setAtributo2Id(null)
          }}
          onAtributo2Change={setAtributo2Id}
          onNombreChange={setNombre}
          onTarifaChange={setTarifa}
          onDescripcionChange={setDescripcion}
          onEjecutorChange={setEjecutorId}
          onCodigoChange={(_codigo, completo) => {
            setCodigoCompleto(completo)
          }}
          onSubmit={handleAgregar}
          onDone={() => setShowForm(false)}
        />
      )}

      {/* Lista vacía */}
      {visibles.length === 0 && !showForm && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-3">
            <Wrench className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Sin servicios</p>
          <p className="text-body-sm text-muted-foreground mt-1">Agrega procesos operativos y servicios</p>
        </div>
      )}

      {/* Tabla */}
      {visibles.length > 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black/5 bg-neu-base">
                <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left px-5 py-3">Código</th>
                <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left px-5 py-3">Nombre</th>
                <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left px-5 py-3">Ejecutor</th>
                <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right px-5 py-3">Tarifa</th>
                <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center px-5 py-3">Estado</th>
                <th className="px-5 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visibles.map(srv =>
                editingId === srv.id
                  ? <ServicioRow
                    key={srv.id}
                    servicio={srv}
                    ejecutores={ejecutores}
                    isEditing
                    editingNombre={editingNombre}
                    editingTarifa={editingTarifa}
                    editingEjecutorId={editingEjecutorId}
                    onEditingNombreChange={setEditingNombre}
                    onEditingTarifaChange={setEditingTarifa}
                    onEditingEjecutorChange={setEditingEjecutorId}
                    onSave={() => handleEditarGuardar(srv.id)}
                    onCancel={() => setEditingId(null)}
                    pending={pending}
                  />
                  : <ServicioRow
                    key={srv.id}
                    servicio={srv}
                    ejecutores={ejecutores}
                    onEdit={() => {
                      setEditingId(srv.id)
                      setEditingNombre(srv.nombre)
                      setEditingTarifa(srv.tarifa_unitaria.toString())
                      setEditingDescripcion(srv.descripcion || '')
                      setEditingEjecutorId(srv.ejecutor_id || null)
                    }}
                    onDelete={() => handleEliminar(srv.id)}
                    onToggleActivo={() => handleToggleActivo(srv.id)}
                    pending={pending}
                  />
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface ServicioFormProps {
  tipos: TipoServicioAtributo[]
  subtipos: TipoServicioAtributo[]
  detalles: TipoServicioAtributo[]
  subtiposFiltrados: TipoServicioAtributo[]
  detallesFiltrados: TipoServicioAtributo[]
  atributo1Id: string | null
  atributo2Id: string | null
  nombre: string
  tarifa: string
  descripcion: string
  ejecutorId: string | null
  codigoCompleto: boolean
  ejecutores: Array<{ id: string; nombre: string }>
  pending: boolean
  error: string | null
  onAtributo1Change: (id: string | null) => void
  onAtributo2Change: (id: string | null) => void
  onNombreChange: (nombre: string) => void
  onTarifaChange: (tarifa: string) => void
  onDescripcionChange: (descripcion: string) => void
  onEjecutorChange: (ejecutorId: string | null) => void
  onCodigoChange: (codigo: string, completo: boolean) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onDone: () => void
}

function ServicioForm({
  tipos,
  subtipos: _subtipos,
  detalles: _detalles,
  subtiposFiltrados,
  detallesFiltrados,
  atributo1Id,
  atributo2Id,
  nombre,
  tarifa,
  descripcion,
  ejecutorId,
  codigoCompleto,
  ejecutores,
  pending,
  error,
  onAtributo1Change,
  onAtributo2Change,
  onNombreChange,
  onTarifaChange,
  onDescripcionChange,
  onEjecutorChange,
  onCodigoChange,
  onSubmit,
  onDone,
}: ServicioFormProps) {
  return (
    <form onSubmit={onSubmit} className="px-5 py-4 bg-neu-base shadow-neu-inset rounded-xl mx-0 my-0 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Nuevo servicio
      </p>

      {/* Row: Tipo + Subtipo + Detalle */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Tipo *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              value={atributo1Id || ''}
              onChange={e => onAtributo1Change(e.target.value || null)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Seleccionar tipo...</option>
              {tipos.map(tipo => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Subtipo *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              value={atributo2Id || ''}
              onChange={e => onAtributo2Change(e.target.value || null)}
              disabled={!atributo1Id}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none disabled:opacity-50"
            >
              <option value="">Seleccionar subtipo...</option>
              {subtiposFiltrados.map(subtipo => (
                <option key={subtipo.id} value={subtipo.id}>
                  {subtipo.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Detalle</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              value=""
              onChange={() => {}}
              disabled={!atributo2Id || detallesFiltrados.length === 0}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none disabled:opacity-50"
            >
              <option value="">
                {detallesFiltrados.length === 0 ? 'Sin detalles disponibles' : 'Seleccionar detalle...'}
              </option>
              {detallesFiltrados.map(detalle => (
                <option key={detalle.id} value={detalle.id}>
                  {detalle.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row: Nombre + Ejecutor */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Nombre *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              type="text"
              value={nombre}
              onChange={e => onNombreChange(e.target.value)}
              placeholder="Ej: Corte recto estándar"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Ejecutor</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              value={ejecutorId || ''}
              onChange={e => onEjecutorChange(e.target.value || null)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Sin asignar</option>
              {ejecutores.map(ejecutor => (
                <option key={ejecutor.id} value={ejecutor.id}>
                  {ejecutor.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row: Tarifa + Descripción */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Tarifa (COP) *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              type="number"
              min="0"
              step="1000"
              value={tarifa}
              onChange={e => onTarifaChange(e.target.value)}
              placeholder="5000"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Descripción</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              type="text"
              value={descripcion}
              onChange={e => onDescripcionChange(e.target.value)}
              placeholder="Detalles adicionales"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Código preview */}
      {atributo1Id && atributo2Id && (
        <CodigoPreviewServicio
          tipos={tipos}
          subtipos={subtiposFiltrados}
          detalles={detallesFiltrados}
          atributo1Id={atributo1Id}
          atributo2Id={atributo2Id}
          onCodigoChange={onCodigoChange}
        />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone}
          className="px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || !codigoCompleto}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" />}
          Crear servicio
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
        <td className="px-5 py-3"><span className="font-mono text-body-sm font-semibold text-primary-700">{srv.codigo}</span></td>
        <td className="px-5 py-3">
          <input
            type="text"
            value={editingNombre}
            onChange={e => onEditingNombreChange?.(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-neu-base shadow-neu text-body-sm text-foreground outline-none"
            autoFocus
          />
        </td>
        <td className="px-5 py-3">
          <select
            value={editingEjecutorId || ''}
            onChange={e => onEditingEjecutorChange?.(e.target.value || null)}
            className="px-2 py-1.5 rounded-lg bg-neu-base shadow-neu text-body-sm text-foreground outline-none appearance-none"
          >
            <option value="">Sin asignar</option>
            {ejecutores.map(ejecutor => (
              <option key={ejecutor.id} value={ejecutor.id}>
                {ejecutor.nombre}
              </option>
            ))}
          </select>
        </td>
        <td className="px-5 py-3 text-right">
          <input
            type="number"
            min="0"
            value={editingTarifa}
            onChange={e => onEditingTarifaChange?.(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-neu-base shadow-neu text-body-sm text-foreground text-right outline-none"
          />
        </td>
        <td className="px-5 py-3 text-center" />
        <td className="px-5 py-3 text-right">
          <div className="flex justify-end gap-1">
            <button
              onClick={onSave}
              disabled={pending}
              className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
              title="Guardar"
            >
              ✓
            </button>
            <button
              onClick={onCancel}
              className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-red-600 hover:text-red-700 transition-colors"
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
      <td className="px-5 py-3"><span className="font-mono text-body-sm font-semibold text-primary-700">{srv.codigo}</span></td>
      <td className="px-5 py-3"><span className="text-body-sm text-foreground">{srv.nombre}</span></td>
      <td className="px-5 py-3"><span className="text-body-sm text-muted-foreground">{getEjecutorNombre(srv.ejecutor_id)}</span></td>
      <td className="px-5 py-3 text-right"><span className="text-body-sm text-foreground font-mono">${srv.tarifa_unitaria.toLocaleString('es-CO')}</span></td>
      <td className="px-5 py-3 text-center">
        <button
          onClick={onToggleActivo}
          disabled={pending}
          className={`text-xs font-semibold px-2 py-0.5 rounded-lg transition-all disabled:opacity-50 ${
            srv.activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {srv.activo ? 'Activo' : 'Inactivo'}
        </button>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex justify-end gap-1">
          <button
            onClick={onEdit}
            disabled={pending}
            className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Editar"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            disabled={pending}
            className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  )
}
