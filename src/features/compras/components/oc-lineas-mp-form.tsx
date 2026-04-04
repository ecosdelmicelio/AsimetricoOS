'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'

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
}

export function OCLineasMPForm({ materiales, onLineasChange }: Props) {
  const [lineas, setLineas] = useState<(LineaMP & { tempId: string })[]>([])
  const [materialSeleccionado, setMaterialSeleccionado] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [precio, setPrecio] = useState('')

  const materialActual = useMemo(
    () => materiales.find(m => m.id === materialSeleccionado),
    [materialSeleccionado, materiales]
  )

  const handleAgregarLinea = () => {
    if (!materialSeleccionado || !cantidad || !precio) {
      return
    }

    const cant = parseFloat(cantidad)
    const prec = parseFloat(precio)

    if (cant <= 0 || prec < 0) {
      return
    }

    const nuevaLinea = {
      material_id: materialSeleccionado,
      cantidad: cant,
      precio_unitario: prec,
      tempId: Math.random().toString(),
    }

    const nuevasLineas = [...lineas, nuevaLinea]
    setLineas(nuevasLineas)
    onLineasChange(nuevasLineas)

    // Resetear
    setMaterialSeleccionado('')
    setCantidad('')
    setPrecio('')
  }

  const handleEliminarLinea = (tempId: string) => {
    const nuevasLineas = lineas.filter(l => l.tempId !== tempId)
    setLineas(nuevasLineas)
    onLineasChange(nuevasLineas)
  }

  const calcularTotal = () => {
    return lineas.reduce((sum, l) => sum + l.cantidad * l.precio_unitario, 0)
  }

  return (
    <div className="space-y-4">
      {/* Agregar línea */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-4">
        <h3 className="text-body-md font-semibold text-foreground mb-4">Agregar Material</h3>

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
            <label className="text-body-xs font-medium text-muted-foreground">
              Cantidad ({materialActual?.unidad || '?'})
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-white shadow-neu-inset text-foreground outline-none text-body-sm"
              step="0.01"
              min="0"
            />
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
        <div className="rounded-2xl bg-neu-base shadow-neu p-4 overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-black/10">
                <th className="text-left py-2 px-2 font-semibold">Código</th>
                <th className="text-left py-2 px-2 font-semibold">Material</th>
                <th className="text-right py-2 px-2 font-semibold">Cantidad</th>
                <th className="text-right py-2 px-2 font-semibold">Precio Unit</th>
                <th className="text-right py-2 px-2 font-semibold">Total</th>
                <th className="text-center py-2 px-2 font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea, idx) => {
                const mat = materiales.find(m => m.id === linea.material_id)
                return (
                  <tr key={linea.tempId} className="border-b border-black/5">
                    <td className="py-2 px-2 font-mono text-muted-foreground">{mat?.codigo}</td>
                    <td className="py-2 px-2">{mat?.nombre}</td>
                    <td className="text-right py-2 px-2">
                      {linea.cantidad.toFixed(2)} {mat?.unidad}
                    </td>
                    <td className="text-right py-2 px-2">
                      ${linea.precio_unitario.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-2 px-2 font-semibold">
                      ${(linea.cantidad * linea.precio_unitario).toLocaleString('es-CO', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="text-center py-2 px-2">
                      <button
                        type="button"
                        onClick={() => handleEliminarLinea(linea.tempId)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
