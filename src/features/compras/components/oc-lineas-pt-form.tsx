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

interface GrupoProducto {
  nombreBase: string
  opciones: {
    productoId: string
    color: string | null
    referencia: string
    nombre: string
    precio_base: number | null
    tallas?: string[]
  }[]
}

function derivarGrupos(productos: Producto[]): GrupoProducto[] {
  const map = new Map<string, GrupoProducto>()
  for (const p of productos) {
    const colorReal = extraerColorDelNombre(p.nombre, p.color)
    const base = derivarNombreBase(p.nombre, colorReal)

    if (!map.has(base)) {
      map.set(base, { nombreBase: base, opciones: [] })
    }
    map.get(base)!.opciones.push({
      productoId: p.id,
      color: colorReal,
      referencia: p.referencia,
      nombre: p.nombre,
      precio_base: p.precio_base ?? 0,
      tallas: p.tallas,
    })
  }
  return [...map.values()].sort((a, b) => a.nombreBase.localeCompare(b.nombreBase))
}

interface Props {
  productos: Producto[]
  onLineasChange: (lineas: LineaPT[]) => void
}

export function OCLineasPTForm({ productos, onLineasChange }: Props) {
  const [productosEnMatriz, setProductosEnMatriz] = useState<ProductoEnMatriz[]>([])
  const [nombreBaseSeleccionado, setNombreBaseSeleccionado] = useState('')
  const [colorSeleccionado, setColorSeleccionado] = useState('')

  const grupos = useMemo(() => derivarGrupos(productos), [productos])
  const grupoActual = grupos.find(g => g.nombreBase === nombreBaseSeleccionado)
  const coloresDisponibles = (grupoActual?.opciones ?? []).filter(
    opt => !productosEnMatriz.some(pf => pf.producto_id === opt.productoId)
  )

  // Obtener la unión de tallas de todos los productos
  const tallasUnion: string[] = useMemo(() => {
    if (productosEnMatriz.length === 0) {
      return Array.from(TALLAS_STANDARD)
    }

    const conjunto = new Set<string>()
    for (const p of productosEnMatriz) {
      const productoOriginal = productos.find(po => po.id === p.producto_id)
      const tallas = productoOriginal?.tallas || Array.from(TALLAS_STANDARD)
      for (const t of tallas) {
        conjunto.add(t)
      }
    }
    return Array.from(conjunto)
  }, [productosEnMatriz, productos])

  const handleAgregarProducto = () => {
    if (!colorSeleccionado) return

    const opcion = coloresDisponibles.find(o => o.productoId === colorSeleccionado)
    if (!opcion) return

    const colorReal = extraerColorDelNombre(opcion.nombre, opcion.color)
    const nombreBase = derivarNombreBase(opcion.nombre, colorReal)

    const nuevoProducto: ProductoEnMatriz = {
      producto_id: opcion.productoId,
      referencia: opcion.referencia,
      nombre: nombreBase,
      color: colorReal,
      precio_unitario: opcion.precio_base ?? 0,
      cantidades: Object.fromEntries((opcion.tallas || TALLAS_STANDARD).map(t => [t, 0])),
    }

    setProductosEnMatriz(prev => [...prev, nuevoProducto])
    setNombreBaseSeleccionado('')
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

  const calcularTotal = () => {
    return productosEnMatriz.reduce((sum, p) => {
      const unidades = Object.values(p.cantidades).reduce((s, q) => s + q, 0)
      return sum + unidades * p.precio_unitario
    }, 0)
  }

  return (
    <div className="space-y-4">
      {/* Selector de producto */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-4">
        <h3 className="text-body-md font-semibold text-foreground mb-4">Agregar Producto</h3>

        <div className="flex gap-3 flex-wrap items-end">
          {/* Nombre base */}
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-body-xs font-medium text-muted-foreground">Producto</label>
            <select
              value={nombreBaseSeleccionado}
              onChange={e => {
                setNombreBaseSeleccionado(e.target.value)
                setColorSeleccionado('')
              }}
              className="w-full px-3 py-2 rounded-lg bg-white shadow-neu-inset text-foreground outline-none text-body-sm"
            >
              <option value="">Seleccionar producto...</option>
              {grupos.map(g => (
                <option key={g.nombreBase} value={g.nombreBase}>
                  {g.nombreBase}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          {grupoActual && coloresDisponibles.length > 0 && (
            <div className="flex-1 min-w-[150px] space-y-1.5">
              <label className="text-body-xs font-medium text-muted-foreground">Color</label>
              <select
                value={colorSeleccionado}
                onChange={e => setColorSeleccionado(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white shadow-neu-inset text-foreground outline-none text-body-sm"
              >
                <option value="">Seleccionar color...</option>
                {coloresDisponibles.map(opt => (
                  <option key={opt.productoId} value={opt.productoId}>
                    {opt.color ?? 'Sin color'} ({opt.referencia})
                  </option>
                ))}
              </select>
            </div>
          )}

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
        <div className="rounded-2xl bg-neu-base shadow-neu p-4">
          <MatrizProductos
            productos={productosEnMatriz}
            tallas={tallasUnion}
            mostrarPrecio
            onActualizarCantidad={handleActualizarCantidad}
            onActualizarPrecio={handleActualizarPrecio}
            onRemover={handleRemover}
          />

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
