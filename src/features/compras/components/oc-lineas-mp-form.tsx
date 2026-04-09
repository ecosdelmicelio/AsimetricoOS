'use client'

import { useState, useMemo, useRef } from 'react'
import { Plus, Trash2, Pencil, Check } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/utils'

interface Material {
  id: string
  codigo: string
  nombre: string
  unidad: string
  precio_referencia?: number | null
}

interface LineaMP {
  material_id: string
  cantidad: number
  precio_unitario: number
}

interface Props {
  materiales: Material[]
  onLineasChange: (lineas: LineaMP[]) => void
  embedded?: boolean
}

type LineaConId = LineaMP & { tempId: string }

export function OCLineasMPForm({ materiales, onLineasChange, embedded = false }: Props) {
  const [lineas, setLineas] = useState<LineaConId[]>([])
  const [materialSeleccionado, setMaterialSeleccionado] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [precio, setPrecio] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCantidad, setEditCantidad] = useState('')
  const [editPrecio, setEditPrecio] = useState('')

  const materialActual = useMemo(
    () => materiales.find(m => m.id === materialSeleccionado),
    [materialSeleccionado, materiales]
  )

  const handleAgregarLinea = () => {
    if (!materialSeleccionado || !cantidad || !precio) return
    const cant = parseFloat(cantidad)
    const prec = parseFloat(precio)
    if (cant <= 0 || prec < 0) return

    const nuevasLineas = [...lineas, {
      material_id: materialSeleccionado,
      cantidad: cant,
      precio_unitario: prec,
      tempId: Math.random().toString(),
    }]
    setLineas(nuevasLineas)
    onLineasChange(nuevasLineas)
    setMaterialSeleccionado('')
    setCantidad('')
    setPrecio('')
  }

  const handleEliminarLinea = (tempId: string) => {
    const nuevasLineas = lineas.filter(l => l.tempId !== tempId)
    setLineas(nuevasLineas)
    onLineasChange(nuevasLineas)
  }

  const startEditing = (linea: LineaConId) => {
    setEditingId(linea.tempId)
    setEditCantidad(linea.cantidad.toString())
    setEditPrecio(linea.precio_unitario.toString())
  }

  const saveEditing = (tempId: string) => {
    const cant = parseFloat(editCantidad)
    const prec = parseFloat(editPrecio)
    if (isNaN(cant) || cant <= 0 || isNaN(prec) || prec < 0) {
      setEditingId(null)
      return
    }
    const nuevasLineas = lineas.map(l =>
      l.tempId === tempId ? { ...l, cantidad: cant, precio_unitario: prec } : l
    )
    setLineas(nuevasLineas)
    onLineasChange(nuevasLineas)
    setEditingId(null)
  }

  const calcularTotal = () =>
    lineas.reduce((sum, l) => sum + l.cantidad * l.precio_unitario, 0)

  return (
    <div className="space-y-4">
      {/* Agregar línea */}
      <div className={embedded ? 'space-y-3' : 'rounded-2xl bg-neu-base shadow-neu p-4'}>
        <h3 className="text-body-md font-semibold text-foreground">Agregar Material</h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 mb-3">
          {/* Material */}
          <div className="space-y-1.5">
            <label className="text-body-xs font-medium text-muted-foreground">Material</label>
            <select
              value={materialSeleccionado}
              onChange={e => setMaterialSeleccionado(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white shadow-neu-inset text-foreground outline-none text-body-sm"
            >
              <option value="">Seleccionar...</option>
              {materiales.map(m => (
                <option key={m.id} value={m.id}>
                  {m.codigo} — {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad */}
          <div className="space-y-1.5">
            <label className="text-body-xs font-medium text-muted-foreground">Cantidad</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-white shadow-neu-inset text-foreground outline-none text-body-sm"
                step="0.01"
                min="0"
              />
              {materialActual?.unidad && (
                <span className="shrink-0 text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1.5 rounded-lg">
                  {materialActual.unidad}
                </span>
              )}
            </div>
          </div>

          {/* Precio */}
          <div className="space-y-1.5">
            <label className="text-body-xs font-medium text-muted-foreground">Precio Unitario</label>
            <input
              type="number"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-white shadow-neu-inset text-foreground outline-none text-body-sm"
              step="0.01"
              min="0"
            />
          </div>

          {/* Botón agregar */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAgregarLinea}
              disabled={!materialSeleccionado || !cantidad || !precio}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white font-semibold text-body-sm transition-all hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de líneas */}
      {lineas.length > 0 && (
        <div className={embedded ? '' : 'rounded-2xl bg-neu-base shadow-neu p-4 overflow-x-auto'}>
          {embedded && <div className="border-t border-black/8 mb-3" />}
          <table className={`w-full text-body-sm ${embedded ? '' : 'overflow-x-auto'}`}>
            <thead>
              <tr className="border-b border-black/10">
                <th className="text-left py-2 px-2 font-semibold">Código</th>
                <th className="text-left py-2 px-2 font-semibold">Material</th>
                <th className="text-left py-2 px-2 font-semibold">Unidad</th>
                <th className="text-right py-2 px-2 font-semibold">Cantidad</th>
                <th className="text-right py-2 px-2 font-semibold">Precio Unit</th>
                <th className="text-right py-2 px-2 font-semibold">Total</th>
                <th className="text-center py-2 px-2 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => {
                const mat = materiales.find(m => m.id === linea.material_id)
                const isEditing = editingId === linea.tempId
                return (
                  <tr key={linea.tempId} className={`border-b border-black/5 transition-colors ${isEditing ? 'bg-primary-50/30' : 'hover:bg-black/[0.01]'}`}>
                    <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{mat?.codigo}</td>
                    <td className="py-2 px-2 text-xs">{mat?.nombre}</td>
                    <td className="py-2 px-2">
                      <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                        {mat?.unidad ?? '—'}
                      </span>
                    </td>

                    {/* Cantidad — inline editable */}
                    <td className="text-right py-1.5 px-2">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editCantidad}
                          onChange={e => setEditCantidad(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEditing(linea.tempId)}
                          autoFocus
                          step="0.01"
                          min="0"
                          className="w-24 text-right px-2 py-1 rounded-lg bg-white shadow-neu-inset text-foreground outline-none text-xs"
                        />
                      ) : (
                        <span
                          onClick={() => startEditing(linea)}
                          className="cursor-pointer hover:text-primary-600 transition-colors"
                          title="Click para editar"
                        >
                          {linea.cantidad.toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* Precio — inline editable */}
                    <td className="text-right py-1.5 px-2">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editPrecio}
                          onChange={e => setEditPrecio(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEditing(linea.tempId)}
                          step="0.01"
                          min="0"
                          className="w-28 text-right px-2 py-1 rounded-lg bg-white shadow-neu-inset text-foreground outline-none text-xs"
                        />
                      ) : (
                        <span
                          onClick={() => startEditing(linea)}
                          className="cursor-pointer hover:text-primary-600 transition-colors"
                          title="Click para editar"
                        >
                          {formatCurrency(linea.precio_unitario)}
                        </span>
                      )}
                    </td>

                    <td className="text-right py-2 px-2 font-semibold text-xs">
                      ${(
                        (isEditing ? (parseFloat(editCantidad) || 0) : linea.cantidad) *
                        (isEditing ? (parseFloat(editPrecio) || 0) : linea.precio_unitario)
                      ).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="text-center py-2 px-2">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => saveEditing(linea.tempId)}
                            className="text-green-600 hover:text-green-700 transition-colors"
                            title="Guardar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(linea)}
                            className="text-muted-foreground hover:text-primary-600 transition-colors"
                            title="Editar línea"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEliminarLinea(linea.tempId)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Eliminar línea"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-black/10 flex justify-end">
            <div className="text-right">
              <p className="text-muted-foreground text-body-xs">Total estimado</p>
              <p className="text-display-sm font-bold text-foreground">
                ${calcularTotal().toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

