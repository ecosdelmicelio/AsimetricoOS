'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Trash2, Edit2, Loader2, AlertTriangle } from 'lucide-react'
import {
  createServicioOperativo,
  updateServicioOperativo,
  deleteServicioOperativo,
  toggleServicioActivo,
  getServiciosEjecutores,
} from '@/features/servicios/services/servicios-actions'
import { CodigoPreviewServicio } from '@/features/servicios/components/codigo-preview-servicio'
import type { ServicioOperativo, TipoServicioAtributo } from '@/features/servicios/types/servicios'
import type { Tercero } from '@/features/terceros/types'

interface Props {
  servicios: ServicioOperativo[]
  tipos: TipoServicioAtributo[]
  subtipos: TipoServicioAtributo[]
  ejecutores: Array<{ id: string; nombre: string }>
}

export function ServiciosPanel({ servicios, tipos, subtipos, ejecutores }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [atributo1Id, setAtributo1Id] = useState<string | null>(null)
  const [atributo2Id, setAtributo2Id] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [tarifa, setTarifa] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ejecutorId, setEjecutorId] = useState<string | null>(null)
  const [codigoGenerado, setCodigoGenerado] = useState('')
  const [codigoCompleto, setCodigoCompleto] = useState(false)

  // Edición
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNombre, setEditingNombre] = useState('')
  const [editingTarifa, setEditingTarifa] = useState('')
  const [editingDescripcion, setEditingDescripcion] = useState('')
  const [editingEjecutorId, setEditingEjecutorId] = useState<string | null>(null)

  // Subtipos filtrados según tipo seleccionado
  const subtiposFiltrados = useMemo(() => {
    if (!atributo1Id) return []
    return subtipos.filter(s => s.tipo_padre_id === atributo1Id)
  }, [atributo1Id, subtipos])

  // Agrupar servicios por tipo
  const serviciosPorTipo = useMemo(() => {
    const grupos: Record<string, ServicioOperativo[]> = {}
    tipos.forEach(tipo => {
      grupos[tipo.id] = servicios.filter(s => s.atributo1_id === tipo.id)
    })
    return grupos
  }, [servicios, tipos])

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

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
      setCodigoGenerado('')
      setShowForm(false)
      setSuccessMsg(`"${nombre}" agregado`)
      setTimeout(() => setSuccessMsg(null), 3000)
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
      setSuccessMsg('Servicio actualizado')
      setTimeout(() => setSuccessMsg(null), 3000)
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
    <div className="space-y-6">
      {/* Formulario para agregar */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="text-body-sm font-semibold text-foreground">Agregar nuevo servicio</h3>
        <form onSubmit={handleAgregar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Tipo *</label>
              <select
                value={atributo1Id || ''}
                onChange={e => {
                  const newId = e.target.value || null
                  setAtributo1Id(newId)
                  setAtributo2Id(null) // Reset subtipo
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke"
              >
                <option value="">Seleccionar tipo...</option>
                {tipos.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Subtipo *</label>
              <select
                value={atributo2Id || ''}
                onChange={e => setAtributo2Id(e.target.value || null)}
                disabled={!atributo1Id}
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke disabled:opacity-50"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Corte recto estándar"
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Ejecutor</label>
              <select
                value={ejecutorId || ''}
                onChange={e => setEjecutorId(e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Tarifa (COP) *</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={tarifa}
                onChange={e => setTarifa(e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Descripción</label>
              <input
                type="text"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Detalles"
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {atributo1Id && atributo2Id && (
            <CodigoPreviewServicio
              tipos={tipos}
              subtipos={subtipos}
              atributo1Id={atributo1Id}
              atributo2Id={atributo2Id}
              onCodigoChange={(codigo, completo) => {
                setCodigoGenerado(codigo)
                setCodigoCompleto(completo)
              }}
            />
          )}

          <button
            type="submit"
            disabled={pending || !codigoCompleto}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </form>

        {error && <div className="text-red-600 text-body-sm rounded-xl bg-red-50 p-3">{error}</div>}
        {successMsg && <div className="text-green-600 text-body-sm rounded-xl bg-green-50 p-3">{successMsg}</div>}
      </div>

      {/* Lista por tipo */}
      <div className="space-y-4">
        {tipos.map(tipo => (
          <div key={tipo.id} className="rounded-2xl bg-neu-base shadow-neu p-6">
            <h3 className="text-body-sm font-semibold text-foreground mb-4">
              {tipo.nombre}
            </h3>

            {serviciosPorTipo[tipo.id].length === 0 ? (
              <p className="text-muted-foreground text-body-sm">Sin servicios agregados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b border-neu-stroke">
                      <th className="text-left py-2 px-3 font-semibold text-foreground">Código</th>
                      <th className="text-left py-2 px-3 font-semibold text-foreground">Nombre</th>
                      <th className="text-left py-2 px-3 font-semibold text-foreground">Ejecutor</th>
                      <th className="text-right py-2 px-3 font-semibold text-foreground">Tarifa</th>
                      <th className="text-center py-2 px-3 font-semibold text-foreground w-16">Estado</th>
                      <th className="text-right py-2 px-3 font-semibold text-foreground w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviciosPorTipo[tipo.id].map(srv => (
                      <tr key={srv.id} className="border-b border-neu-stroke hover:bg-neu-hover transition-colors">
                        <td className="py-2.5 px-3 font-mono text-foreground font-medium">{srv.codigo}</td>
                        <td className="py-2.5 px-3">
                          {editingId === srv.id ? (
                            <input
                              type="text"
                              value={editingNombre}
                              onChange={e => setEditingNombre(e.target.value)}
                              className="w-full px-2 py-1 rounded bg-white border border-neu-stroke text-body-sm"
                              autoFocus
                            />
                          ) : (
                            <span className="text-foreground">{srv.nombre}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {editingId === srv.id ? (
                            <select
                              value={editingEjecutorId || ''}
                              onChange={e => setEditingEjecutorId(e.target.value || null)}
                              className="w-full px-2 py-1 rounded bg-white border border-neu-stroke text-body-sm"
                            >
                              <option value="">Sin asignar</option>
                              {ejecutores.map(ejecutor => (
                                <option key={ejecutor.id} value={ejecutor.id}>
                                  {ejecutor.nombre}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-foreground text-xs">{getEjecutorNombre(srv.ejecutor_id)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {editingId === srv.id ? (
                            <input
                              type="number"
                              min={0}
                              value={editingTarifa}
                              onChange={e => setEditingTarifa(e.target.value)}
                              className="w-full px-2 py-1 rounded bg-white border border-neu-stroke text-body-sm text-right"
                            />
                          ) : (
                            <span className="text-foreground font-mono">
                              ${srv.tarifa_unitaria.toLocaleString('es-CO')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {editingId !== srv.id && (
                            <button
                              onClick={() => handleToggleActivo(srv.id)}
                              disabled={pending}
                              className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                                srv.activo
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {srv.activo ? 'Activo' : 'Inactivo'}
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right flex justify-end gap-1">
                          {editingId === srv.id ? (
                            <>
                              <button
                                onClick={() => handleEditarGuardar(srv.id)}
                                disabled={pending}
                                className="px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingId(srv.id)
                                  setEditingNombre(srv.nombre)
                                  setEditingTarifa(srv.tarifa_unitaria.toString())
                                  setEditingDescripcion(srv.descripcion || '')
                                  setEditingEjecutorId(srv.ejecutor_id || null)
                                }}
                                disabled={pending}
                                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEliminar(srv.id)}
                                disabled={pending}
                                className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
