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
    <div className="space-y-4">
      {/* Tabla compacta - Siempre visible */}
      <div className="border-t border-black/8" />
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-black/10">
              <th className="text-left py-2 px-3 font-semibold">Código</th>
              <th className="text-left py-2 px-3 font-semibold">Nombre</th>
              <th className="text-left py-2 px-3 font-semibold">Color</th>
              <th className="text-right py-2 px-3 font-semibold">Precio</th>
              {tallasUnion.map(talla => (
                <th key={talla} className="text-center py-2 px-2 font-semibold text-xs">
                  {talla}
                </th>
              ))}
              <th className="text-right py-2 px-3 font-semibold">Total Uds</th>
              <th className="text-right py-2 px-3 font-semibold">Total $</th>
              <th className="text-center py-2 px-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {/* Filas existentes */}
            {productosEnMatriz.map(producto => {
              const totalUds = Object.values(producto.cantidades).reduce((s: number, q: number) => s + q, 0)
              const totalValor = totalUds * producto.precio_unitario
              const productoOriginal = productos.find(p => p.id === producto.producto_id)

              return (
                <tr key={producto.producto_id} className="border-b border-black/5">
                  <td className="py-2 px-3 font-mono text-muted-foreground">{productoOriginal?.referencia}</td>
                  <td className="py-2 px-3">{producto.nombre}</td>
                  <td className="py-2 px-3 text-muted-foreground">{producto.color ?? '—'}</td>
                  <td className="py-2 px-3 text-right">
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
                      className="w-20 text-right bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1 outline-none text-foreground placeholder:text-muted-foreground/50 text-body-sm"
                    />
                  </td>
                  {tallasUnion.map(talla => (
                    <td key={talla} className="text-center py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        value={producto.cantidades[talla] || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0
                          handleActualizarCantidad(producto.producto_id, talla, Math.max(0, val))
                        }}
                        placeholder="0"
                        className="w-12 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1 outline-none text-foreground placeholder:text-muted-foreground/50 text-body-sm"
                      />
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right font-semibold">{totalUds}</td>
                  <td className="py-2 px-3 text-right font-semibold">
                    {formatCurrency(totalValor)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemover(producto.producto_id)}
                      className="p-1 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                      aria-label={`Eliminar ${producto.nombre}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}

            {/* Fila nueva para agregar producto */}
            <tr className="border-b border-black/5 bg-neu-base/50">
              <td colSpan={1} className="py-2 px-3 text-muted-foreground">—</td>
              <td colSpan={7} className="py-2 px-3">
                <select
                  value={colorSeleccionado}
                  onChange={e => handleSeleccionarProductoDirecto(e.target.value)}
                  className="w-full px-3 py-1 rounded-lg bg-neu-base shadow-neu-inset text-foreground outline-none text-body-sm"
                >
                  <option value="">Seleccionar producto...</option>
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

      {/* Total */}
      {productosEnMatriz.length > 0 && (
        <div className="pt-3 border-t border-black/10 flex justify-end">
          <div className="text-right">
            <p className="text-muted-foreground text-body-xs">Total orden</p>
            <p className="text-display-sm font-bold text-foreground">
              {formatCurrency(calcularTotal())}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


