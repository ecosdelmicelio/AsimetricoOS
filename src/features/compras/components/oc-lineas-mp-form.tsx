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
    <div className="flex flex-col h-full">
      {/* Agregar línea */}
      <div className="bg-slate-50/50 border-b border-slate-100 p-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Agregar Material</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Material */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Material</label>
            <select
              value={materialSeleccionado}
              onChange={e => setMaterialSeleccionado(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 uppercase outline-none focus:border-slate-300 transition-all cursor-pointer"
            >
              <option value="">Seleccionar...</option>
              {materiales.map(m => (
                <option key={m.id} value={m.id}>
                  {m.codigo} — {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad & Precio */}
          <div className="grid grid-cols-2 gap-4 md:col-span-1">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Cantidad</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black tabular-nums text-slate-900 outline-none focus:border-slate-300 transition-all"
                  step="0.01"
                  min="0"
                />
                {materialActual?.unidad && (
                  <span className="absolute right-3 text-[9px] font-bold text-slate-400">
                    {materialActual.unidad}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">V. Unit</label>
              <input
                type="number"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black tabular-nums text-slate-900 outline-none focus:border-slate-300 transition-all"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Botón agregar */}
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={handleAgregarLinea}
              disabled={!materialSeleccionado || !cantidad || !precio}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de líneas */}
      {lineas.length > 0 && (
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Código</th>
                <th className="px-4 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Material</th>
                <th className="px-4 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Unidad</th>
                <th className="px-4 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Cantidad</th>
                <th className="px-4 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Precio Unit</th>
                <th className="px-4 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest border-l border-slate-200/40">Total</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest w-20">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lineas.map((linea) => {
                const mat = materiales.find(m => m.id === linea.material_id)
                const isEditing = editingId === linea.tempId
                return (
                  <tr key={linea.tempId} className={`transition-colors group hover:bg-slate-50/30 ${isEditing ? 'bg-slate-50/50' : ''}`}>
                    <td className="px-6 py-3 font-mono text-[10px] text-slate-400">{mat?.codigo}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-900 uppercase tracking-tight">{mat?.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg">
                        {mat?.unidad ?? '—'}
                      </span>
                    </td>

                    {/* Cantidad — inline editable */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editCantidad}
                          onChange={e => setEditCantidad(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEditing(linea.tempId)}
                          onBlur={() => saveEditing(linea.tempId)}
                          autoFocus
                          step="0.01"
                          min="0"
                          className="w-24 text-right bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-black tabular-nums text-slate-900 outline-none focus:border-slate-300"
                        />
                      ) : (
                        <span
                          onClick={() => startEditing(linea)}
                          className="cursor-pointer text-[11px] font-black tabular-nums text-slate-700 hover:text-slate-900 transition-colors"
                          title="Click para editar"
                        >
                          {linea.cantidad.toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* Precio — inline editable */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editPrecio}
                          onChange={e => setEditPrecio(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEditing(linea.tempId)}
                          onBlur={() => saveEditing(linea.tempId)}
                          step="0.01"
                          min="0"
                          className="w-28 text-right bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-black tabular-nums text-slate-900 outline-none focus:border-slate-300"
                        />
                      ) : (
                        <span
                          onClick={() => startEditing(linea)}
                          className="cursor-pointer text-[11px] font-black tabular-nums text-slate-700 hover:text-slate-900 transition-colors"
                          title="Click para editar"
                        >
                          {formatCurrency(linea.precio_unitario)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-[11px] tabular-nums text-slate-900 border-l border-slate-200/30">
                      {formatCurrency(
                        (isEditing ? (parseFloat(editCantidad) || 0) : linea.cantidad) *
                        (isEditing ? (parseFloat(editPrecio) || 0) : linea.precio_unitario)
                      )}
                    </td>

                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => saveEditing(linea.tempId)}
                            className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Guardar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(linea)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Editar línea"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEliminarLinea(linea.tempId)}
                          className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
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


        </div>
      )}
    </div>
  )
}

