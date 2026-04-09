'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { crearTraslado, confirmarTraslado } from '@/features/wms/services/traslados-actions'
import type { Bodega } from '@/features/wms/types'

interface Props {
  bodegas: Bodega[]
  bodegaOrigen?: string
}

interface ItemTraslado {
  id: string
  producto_id?: string
  material_id?: string
  bin_id?: string
  talla?: string
  cantidad: number
  unidad: string
}

export function TrasladoForm({ bodegas, bodegaOrigen }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trasladoCreado, setTrasladoCreado] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    bodega_origen_id: bodegaOrigen || '',
    bodega_destino_id: '',
    notas: '',
  })

  const [items, setItems] = useState<ItemTraslado[]>([])

  const agregarItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36),
        cantidad: 1,
        unidad: 'unidades',
      },
    ])
  }

  const eliminarItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(
      items.map(i =>
        i.id === id ? { ...i, [field]: value } : i,
      ),
    )
  }

  const handleCrearTraslado = async () => {
    if (!formData.bodega_origen_id || !formData.bodega_destino_id) {
      setError('Selecciona bodega origen y destino')
      return
    }

    if (items.length === 0) {
      setError('Agrega al menos un item')
      return
    }

    setLoading(true)
    const result = await crearTraslado({
      bodega_origen_id: formData.bodega_origen_id,
      bodega_destino_id: formData.bodega_destino_id,
      items: items.map(i => ({
        producto_id: i.producto_id,
        material_id: i.material_id,
        bin_id: i.bin_id,
        talla: i.talla,
        cantidad: i.cantidad,
        unidad: i.unidad,
      })),
      notas: formData.notas || undefined,
    })
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setTrasladoCreado(result.data.id)
      // Automáticamente confirmar
      const confirmResult = await confirmarTraslado(result.data.id)
      if (confirmResult.error) {
        setError(`Traslado creado pero error al confirmar: ${confirmResult.error}`)
      } else {
        setShowForm(false)
        setFormData({
          bodega_origen_id: bodegaOrigen || '',
          bodega_destino_id: '',
          notas: '',
        })
        setItems([])
        setError(null)
        setTrasladoCreado(null)
      }
    }
  }

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} className="gap-2">
        <Plus className="w-4 h-4" />
        Nuevo Traslado
      </Button>
    )
  }

  return (
    <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Crear Traslado</h3>
        <button
          onClick={() => setShowForm(false)}
          className="p-1 hover:bg-neu-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Bodegas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Bodega Origen</label>
          <select
            value={formData.bodega_origen_id}
            onChange={e =>
              setFormData({
                ...formData,
                bodega_origen_id: e.target.value,
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
          >
            <option value="">Seleccionar...</option>
            {bodegas
              .filter(b => b.activo)
              .map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bodega Destino</label>
          <select
            value={formData.bodega_destino_id}
            onChange={e =>
              setFormData({
                ...formData,
                bodega_destino_id: e.target.value,
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
          >
            <option value="">Seleccionar...</option>
            {bodegas
              .filter(
                b =>
                  b.activo &&
                  b.id !== formData.bodega_origen_id,
              )
              .map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium">Items</label>
          <button
            onClick={agregarItem}
            className="text-xs px-2 py-1 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
          >
            + Agregar
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">
            Sin items
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex gap-2 items-end">
                <input
                  type="number"
                  value={item.cantidad}
                  onChange={e =>
                    updateItem(item.id, 'cantidad', parseInt(e.target.value) || 0)
                  }
                  placeholder="Cantidad"
                  className="flex-1 px-2 py-1 text-sm rounded-lg border border-neu-300"
                />
                <select
                  value={item.unidad}
                  onChange={e => updateItem(item.id, 'unidad', e.target.value)}
                  className="px-2 py-1 text-sm rounded-lg border border-neu-300"
                >
                  <option>unidades</option>
                  <option>kg</option>
                  <option>metros</option>
                </select>
                <button
                  onClick={() => eliminarItem(item.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium mb-1">Notas</label>
        <textarea
          value={formData.notas}
          onChange={e => setFormData({ ...formData, notas: e.target.value })}
          placeholder="Notas opcionales del traslado..."
          className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
          rows={2}
        />
      </div>

      {/* Botones */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setShowForm(false)}>
          Cancelar
        </Button>
        <Button onClick={handleCrearTraslado} disabled={loading}>
          {loading ? 'Creando traslado...' : 'Crear y Confirmar'}
        </Button>
      </div>
    </div>
  )
}
