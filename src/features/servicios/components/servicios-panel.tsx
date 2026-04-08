'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, Loader2, Toggle2, AlertTriangle } from 'lucide-react'
import {
  createServicioOperativo,
  updateServicioOperativo,
  deleteServicioOperativo,
  toggleServicioActivo,
} from '@/features/servicios/services/servicios-actions'
import type { ServicioOperativo, TipoProceso } from '@/features/servicios/types/servicios'
import { TIPOS_PROCESO, LABELS_TIPO_PROCESO } from '@/features/servicios/types/servicios'

interface Props {
  servicios: ServicioOperativo[]
}

export function ServiciosPanel({ servicios }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoProceso>('corte')
  const [nombre, setNombre] = useState('')
  const [tarifa, setTarifa] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ejecutor, setEjecutor] = useState('')

  // Edición
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNombre, setEditingNombre] = useState('')
  const [editingTarifa, setEditingTarifa] = useState('')
  const [editingDescripcion, setEditingDescripcion] = useState('')
  const [editingEjecutor, setEditingEjecutor] = useState('')

  // Agrupar por tipo
  const serviciosPorTipo = TIPOS_PROCESO.reduce(
    (acc, tipo) => {
      acc[tipo] = servicios.filter(s => s.tipo_proceso === tipo)
      return acc
    },
    {} as Record<TipoProceso, ServicioOperativo[]>,
  )

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

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
        tipoSeleccionado,
        nombre,
        tarifaNum,
        descripcion || undefined,
        ejecutor || undefined,
      )
      if (res.error) {
        setError(res.error)
        return
      }

      setNombre('')
      setTarifa('')
      setDescripcion('')
      setEjecutor('')
      setShowForm(false)
      setSuccessMsg(`"${nombre}" agregado a ${LABELS_TIPO_PROCESO[tipoSeleccionado]}`)
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
        ejecutor: editingEjecutor || null,
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
                value={tipoSeleccionado}
                onChange={e => setTipoSeleccionado(e.target.value as TipoProceso)}
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke"
              >
                {TIPOS_PROCESO.map(tipo => (
                  <option key={tipo} value={tipo}>
                    {LABELS_TIPO_PROCESO[tipo]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Corte recto"
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
              <label className="text-xs text-muted-foreground font-medium">Ejecutor</label>
              <input
                type="text"
                value={ejecutor}
                onChange={e => setEjecutor(e.target.value)}
                placeholder="Ej: Juan Pérez"
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

          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </form>

        {error && <div className="text-red-600 text-body-sm">{error}</div>}
        {successMsg && <div className="text-green-600 text-body-sm">{successMsg}</div>}
      </div>

      {/* Lista por tipo */}
      <div className="space-y-4">
        {TIPOS_PROCESO.map(tipo => (
          <div key={tipo} className="rounded-2xl bg-neu-base shadow-neu p-6">
            <h3 className="text-body-sm font-semibold text-foreground mb-4">
              {LABELS_TIPO_PROCESO[tipo]}
            </h3>

            {serviciosPorTipo[tipo].length === 0 ? (
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
                    {serviciosPorTipo[tipo].map(srv => (
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
                            <input
                              type="text"
                              value={editingEjecutor}
                              onChange={e => setEditingEjecutor(e.target.value)}
                              className="w-full px-2 py-1 rounded bg-white border border-neu-stroke text-body-sm"
                            />
                          ) : (
                            <span className="text-foreground text-xs">{srv.ejecutor || '—'}</span>
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
                                  setEditingEjecutor(srv.ejecutor || '')
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
