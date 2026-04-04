'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { OCDetalle } from '@/features/compras/types'

interface Props {
  productos: Array<{ id: string; referencia: string; nombre: string; color: string | null }>
  onLineasChange: (lineas: any[]) => void
}

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL']

export function PTLineasForm({ productos, onLineasChange }: Props) {
  const [lineas, setLineas] = useState<any[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [tallaSeleccionada, setTallaSeleccionada] = useState('S')
  const [cantidadIngresada, setCantidadIngresada] = useState('')
  const [precioIngresado, setPrecioIngresado] = useState('')

  const handleAgregar = () => {
    if (!productoSeleccionado || !cantidadIngresada) {
      alert('Selecciona un producto y cantidad')
      return
    }

    const cantidad = parseInt(cantidadIngresada)
    const precio = parseFloat(precioIngresado) || 0

    const nuevaLinea = {
      producto_id: productoSeleccionado,
      talla: tallaSeleccionada,
      cantidad,
      precio_pactado: precio,
    }

    const nuevasLineas = [...lineas, nuevaLinea]
    setLineas(nuevasLineas)
    onLineasChange(nuevasLineas)

    // Reset
    setProductoSeleccionado('')
    setTallaSeleccionada('S')
    setCantidadIngresada('')
    setPrecioIngresado('')
  }

  const handleEliminar = (idx: number) => {
    const nuevasLineas = lineas.filter((_, i) => i !== idx)
    setLineas(nuevasLineas)
    onLineasChange(nuevasLineas)
  }

  const productoSeleccionadoObj = productos.find(p => p.id === productoSeleccionado)

  return (
    <div className="space-y-4">
      <h3 className="text-body-md font-semibold text-foreground">Líneas a Recibir</h3>

      {/* Agregar línea */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Producto */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Producto</label>
            <div className="rounded-lg bg-white shadow-neu-inset">
              <select
                value={productoSeleccionado}
                onChange={(e) => setProductoSeleccionado(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-body-sm text-foreground outline-none"
              >
                <option value="">Seleccionar...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.referencia} — {p.nombre} {p.color ? `(${p.color})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Talla */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Talla</label>
            <div className="rounded-lg bg-white shadow-neu-inset">
              <select
                value={tallaSeleccionada}
                onChange={(e) => setTallaSeleccionada(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-body-sm text-foreground outline-none"
              >
                {TALLAS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cantidad */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Cantidad</label>
            <div className="rounded-lg bg-white shadow-neu-inset">
              <input
                type="number"
                min="1"
                value={cantidadIngresada}
                onChange={(e) => setCantidadIngresada(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-transparent text-body-sm text-foreground outline-none"
              />
            </div>
          </div>
        </div>

        {/* Precio (opcional) */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase">Precio Pactado (opcional)</label>
          <div className="rounded-lg bg-white shadow-neu-inset">
            <input
              type="number"
              min="0"
              step="100"
              value={precioIngresado}
              onChange={(e) => setPrecioIngresado(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-transparent text-body-sm text-foreground outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAgregar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white font-semibold text-body-sm transition-all hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          Agregar Línea
        </button>
      </div>

      {/* Lista de líneas */}
      {lineas.length > 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-neu-base">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Referencia</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Talla</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Cantidad</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Precio</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {lineas.map((linea, idx) => {
                  const producto = productos.find(p => p.id === linea.producto_id)
                  return (
                    <tr key={idx} className="hover:bg-black/2 transition-colors">
                      <td className="px-4 py-3 text-body-sm text-foreground">
                        {producto?.referencia} {producto?.color && `(${producto.color})`}
                      </td>
                      <td className="px-4 py-3 text-body-sm text-foreground">{linea.talla}</td>
                      <td className="px-4 py-3 text-right text-body-sm font-medium text-foreground">{linea.cantidad}</td>
                      <td className="px-4 py-3 text-right text-body-sm text-foreground">
                        ${linea.precio_pactado?.toLocaleString('es-CO') || '0'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleEliminar(idx)}
                          className="p-1 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lineas.length === 0 && (
        <p className="text-center text-body-sm text-muted-foreground py-6">
          Sin líneas agregadas. Agrega referencias que planeas recibir.
        </p>
      )}
    </div>
  )
}
