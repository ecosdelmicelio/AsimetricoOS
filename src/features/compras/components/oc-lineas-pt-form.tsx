'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import { TALLAS_STANDARD } from '@/shared/constants/tallas'
import { derivarNombreBase, extraerColorDelNombre } from '@/shared/lib/productos-utils'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'

interface Producto {
  id: string
  referencia: string
  nombre: string
  color: string | null
  precio_base?: number | null
  tallas?: string[]
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

  const handleAgregarProducto = () => {
    const opcion = variacionesDisponibles.find(v => v.productoId === colorSeleccionado)
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
  }

  const handleActualizarCantidad = (productoId: string, talla: string, cantidad: number) => {
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
    productosEnMatriz.reduce((sum, p) => {
      const unidades = Object.values(p.cantidades).reduce((s, q) => s + q, 0)
      return sum + unidades * p.precio_unitario
    }, 0)

  return (
    <div className="space-y-4">
      {/* Selector de variación por color */}
      <div className="space-y-3">
        <h3 className="text-body-md font-semibold text-foreground">Agregar Producto</h3>

        <div className="flex gap-3 items-end">
          {/* Color / Variación */}
          <div className="flex-1 space-y-1">
            <label className="text-body-xs font-medium text-muted-foreground">Color / Variación</label>
            <select
              value={colorSeleccionado}
              onChange={e => setColorSeleccionado(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-neu-base shadow-neu-inset text-foreground outline-none text-body-sm"
            >
              <option value="">Seleccionar color...</option>
              {variacionesDisponibles.map(v => (
                <option key={v.productoId} value={v.productoId}>
                  {v.color ?? 'Sin color'} — {v.referencia}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAgregarProducto}
            disabled={!colorSeleccionado}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold text-body-sm transition-all hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>

      {/* Matriz */}
      {productosEnMatriz.length > 0 && (
        <>
          <div className="border-t border-black/8" />
          <MatrizProductos
            productos={productosEnMatriz}
            tallas={tallasUnion}
            mostrarPrecio
            onActualizarCantidad={handleActualizarCantidad}
            onActualizarPrecio={handleActualizarPrecio}
            onRemover={handleRemover}
          />

          {/* Total */}
          <div className="pt-3 border-t border-black/10 flex justify-end">
            <div className="text-right">
              <p className="text-muted-foreground text-body-xs">Total estimado</p>
              <p className="text-display-sm font-bold text-foreground">
                ${calcularTotal().toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


