'use client'

import { useState, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { TALLAS_STANDARD } from '@/shared/constants/tallas'
import { derivarNombreBase, extraerColorDelNombre } from '@/shared/lib/productos-utils'
import { formatCurrency } from '@/shared/lib/utils'

interface Producto {
  id: string
  referencia: string
  nombre: string
  color: string | null
  precio_base?: number | null
  tallas?: string[]
}

interface ProductoEnMatriz {
  producto_id: string
  referencia: string
  nombre: string
  color: string | null
  precio_unitario: number
  cantidades: Record<string, number>
}

interface LineaPT {
  producto_id: string
  talla: string
  cantidad: number
  precio_pactado: number
}

interface Props {
  productos: Producto[]
  onLineasChange: (lineas: LineaPT[]) => void
}

export function OCLineasPTForm({ productos, onLineasChange }: Props) {
  const [productosEnMatriz, setProductosEnMatriz] = useState<ProductoEnMatriz[]>([])
  const [colorSeleccionado, setColorSeleccionado] = useState('')

  // Variaciones disponibles (las que no están ya en la matriz)
  const variacionesDisponibles = useMemo(() =>
    productos
      .filter(p => !productosEnMatriz.some(m => m.producto_id === p.id))
      .map(p => ({
        productoId: p.id,
        referencia: p.referencia,
        nombre: p.nombre,
        color: extraerColorDelNombre(p.nombre, p.color),
        precio_base: p.precio_base ?? 0,
        tallas: p.tallas,
      }))
      .sort((a, b) => (a.color ?? '').localeCompare(b.color ?? '')),
    [productos, productosEnMatriz]
  )

  // Tallas union de productos en matriz
  const tallasUnion: string[] = useMemo(() => {
    if (productosEnMatriz.length === 0) return Array.from(TALLAS_STANDARD)
    const conjunto = new Set<string>()
    for (const p of productosEnMatriz) {
      const productoOriginal = productos.find(po => po.id === p.producto_id)
      const tallas = productoOriginal?.tallas || Array.from(TALLAS_STANDARD)
      for (const t of tallas) conjunto.add(t)
    }
    return Array.from(conjunto)
  }, [productosEnMatriz, productos])

  const handleActualizarCantidad = (productoId: string, talla: string, cantidad: number): void => {
    const num = typeof cantidad === 'number' ? cantidad : parseInt(String(cantidad)) || 0
    setProductosEnMatriz(prev =>
      prev.map(p =>
        p.producto_id === productoId
          ? { ...p, cantidades: { ...p.cantidades, [talla]: Math.max(0, num) } }
          : p
      )
    )
    generarLineas()
  }

  const handleActualizarPrecio = (productoId: string, precio: number) => {
    const num = typeof precio === 'number' ? precio : parseFloat(String(precio)) || 0
    setProductosEnMatriz(prev =>
      prev.map(p =>
        p.producto_id === productoId
          ? { ...p, precio_unitario: Math.max(0, num) }
          : p
      )
    )
    generarLineas()
  }

  const handleRemover = (productoId: string) => {
    setProductosEnMatriz(prev => prev.filter(p => p.producto_id !== productoId))
    generarLineas()
  }

  const handleSeleccionarProductoDirecto = (productoId: string) => {
    if (!productoId) return

    const opcion = variacionesDisponibles.find(v => v.productoId === productoId)
    if (!opcion) return

    const nuevoProducto: ProductoEnMatriz = {
      producto_id: opcion.productoId,
      referencia: opcion.referencia,
      nombre: derivarNombreBase(opcion.nombre, opcion.color),
      color: opcion.color,
      precio_unitario: opcion.precio_base ?? 0,
      cantidades: Object.fromEntries((opcion.tallas || TALLAS_STANDARD).map(t => [t, 0])),
    }

    setProductosEnMatriz(prev => [...prev, nuevoProducto])
    setColorSeleccionado('')

    // Generar líneas después de actualizar
    setTimeout(() => generarLineas(), 0)
  }

  const generarLineas = () => {
    const lineas: LineaPT[] = []
    for (const p of productosEnMatriz) {
      for (const [talla, cantidad] of Object.entries(p.cantidades || {})) {
        if (cantidad > 0) {
          lineas.push({
            producto_id: p.producto_id,
            talla,
            cantidad,
            precio_pactado: p.precio_unitario,
          })
        }
      }
    }
    onLineasChange(lineas)
  }

  const calcularTotal = () =>
    productosEnMatriz.reduce((sum: number, p: ProductoEnMatriz) => {
      const unidades = Object.values(p.cantidades).reduce((s: number, q: number) => s + q, 0)
      return sum + unidades * p.precio_unitario
    }, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Tabla compacta - Siempre visible */}
      <div className="border-t border-slate-100" />
      <div className="overflow-x-auto flex-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Código</th>
              <th className="px-4 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Nombre</th>
              <th className="px-4 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Color</th>
              <th className="px-4 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Precio Unit</th>
              {tallasUnion.map(talla => (
                <th key={talla} className="px-2 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest min-w-[60px]">
                  {talla}
                </th>
              ))}
              <th className="px-4 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest border-l border-slate-200/40">Total Uds</th>
              <th className="px-4 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Total $</th>
              <th className="px-6 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest w-20">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {/* Filas existentes */}
            {productosEnMatriz.map(producto => {
              const totalUds = Object.values(producto.cantidades).reduce((s: number, q: number) => s + q, 0)
              const totalValor = totalUds * producto.precio_unitario
              const productoOriginal = productos.find(p => p.id === producto.producto_id)

              return (
                <tr key={producto.producto_id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-3 font-mono text-[10px] text-slate-400">{productoOriginal?.referencia}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-900 uppercase tracking-tight">{producto.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg">
                      {producto.color ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={producto.precio_unitario || ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0
                        handleActualizarPrecio(producto.producto_id, Math.max(0, val))
                      }}
                      placeholder="0"
                      className="w-24 text-right bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-black tabular-nums text-slate-900 outline-none focus:border-slate-300 transition-all"
                    />
                  </td>
                  {tallasUnion.map(talla => (
                    <td key={talla} className="px-2 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={producto.cantidades[talla] || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0
                          handleActualizarCantidad(producto.producto_id, talla, Math.max(0, val))
                        }}
                        placeholder="0"
                        className="w-12 text-center bg-slate-50 border border-slate-100 rounded-lg py-1.5 text-[11px] font-black tabular-nums focus:bg-white focus:border-slate-300 outline-none transition-all"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-black text-[11px] tabular-nums text-slate-900 border-l border-slate-200/30">{totalUds}</td>
                  <td className="px-4 py-3 text-right font-black text-[11px] tabular-nums text-emerald-600">
                    {formatCurrency(totalValor)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemover(producto.producto_id)}
                      className="p-1.5 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      aria-label={`Eliminar ${producto.nombre}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}

            {/* Fila nueva para agregar producto */}
            <tr className="bg-emerald-50/20">
              <td colSpan={1} className="px-6 py-4 border-r border-emerald-100/30">
                <span className="text-[9px] font-black text-emerald-600/50 uppercase tracking-[0.3em]">NUEVO</span>
              </td>
              <td colSpan={7} className="px-4 py-3">
                <select
                  value={colorSeleccionado}
                  onChange={e => handleSeleccionarProductoDirecto(e.target.value)}
                  className="w-full max-w-sm bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 uppercase outline-none focus:border-emerald-300 transition-all cursor-pointer"
                >
                  <option value="">Seleccionar producto para agregar...</option>
                  {variacionesDisponibles.map(v => (
                    <option key={v.productoId} value={v.productoId}>
                      {v.nombre} — {v.color ?? 'Sin color'}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}


