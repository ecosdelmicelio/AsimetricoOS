'use client'

import { useState } from 'react'
import { Plus, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  createBodega,
  updateBodega,
  toggleBodega,
  setBodegaDefault,
} from '@/features/wms/services/bodegas-actions'
import type { Bodega } from '@/features/wms/types'

interface Props {
  bodegas: Bodega[]
  bodegaDefaultId: string | null
}

const TIPOS = [
  { value: 'principal', label: 'Principal' },
  { value: 'secundaria', label: 'Secundaria' },
  { value: 'externa', label: 'Externa' },
  { value: 'consignacion', label: 'Consignación' },
]

export function BodegasTab({ bodegas, bodegaDefaultId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<{
    codigo: string
    nombre: string
    tipo: Bodega['tipo']
  }>({
    codigo: '',
    nombre: '',
    tipo: 'secundaria',
  })

  const resetForm = () => {
    setFormData({ codigo: '', nombre: '', tipo: 'secundaria' })
    setEditingId(null)
    setShowForm(false)
    setError(null)
  }

  const handleCreate = async () => {
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      setError('Código y nombre son obligatorios')
      return
    }

    setLoading(true)
    const result = await createBodega(formData)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      resetForm()
    }
  }

  const handleUpdate = async (id: string) => {
    setLoading(true)
    const result = await updateBodega(id, {
      nombre: formData.nombre || undefined,
      tipo: formData.tipo || undefined,
    })
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      resetForm()
    }
  }

  const handleToggle = async (id: string, activo: boolean) => {
    setLoading(true)
    const result = await toggleBodega(id, !activo)
    setLoading(false)

    if (result.error) setError(result.error)
  }

  const handleSetDefault = async (id: string) => {
    setLoading(true)
    const result = await setBodegaDefault(id)
    setLoading(false)

    if (result.error) setError(result.error)
  }

  const startEdit = (bodega: Bodega) => {
    setFormData({
      codigo: bodega.codigo,
      nombre: bodega.nombre,
      tipo: bodega.tipo,
    })
    setEditingId(bodega.id)
  }

  return (
    <div className="space-y-6">
      {/* Header con botón crear */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Bodegas</h3>
          <p className="text-sm text-muted-foreground">
            Crea y administra las bodegas del sistema
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Bodega
          </Button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
          <h4 className="font-semibold">
            {editingId ? 'Editar Bodega' : 'Nueva Bodega'}
          </h4>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Código</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                disabled={!!editingId}
                placeholder="e.g., PLANT"
                className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="e.g., Planta Principal"
                className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={formData.tipo}
                onChange={e =>
                  setFormData({
                    ...formData,
                    tipo: e.target.value as Bodega['tipo'],
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
              >
                {TIPOS.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingId) {
                  handleUpdate(editingId)
                } else {
                  handleCreate()
                }
              }}
              disabled={loading}
            >
              {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de bodegas */}
      <div className="space-y-3">
        {bodegas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay bodegas creadas
          </div>
        ) : (
          bodegas.map(bodega => (
            <div
              key={bodega.id}
              className="flex items-center justify-between gap-4 bg-neu-base border border-neu-300 rounded-xl p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-sm">{bodega.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {bodega.codigo} • {TIPOS.find(t => t.value === bodega.tipo)?.label}
                    </p>
                  </div>
                  {bodegaDefaultId === bodega.id && (
                    <span className="text-xs font-semibold px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                      Default
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {bodegaDefaultId !== bodega.id && (
                  <button
                    onClick={() => handleSetDefault(bodega.id)}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neu-base hover:bg-neu-200 border border-neu-300 transition-colors"
                  >
                    Marcar Default
                  </button>
                )}

                <button
                  onClick={() => startEdit(bodega)}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-neu-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </button>

                <button
                  onClick={() => handleToggle(bodega.id, bodega.activo)}
                  disabled={loading}
                  className={`p-1.5 rounded-lg transition-colors ${
                    bodega.activo
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  {bodega.activo ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
