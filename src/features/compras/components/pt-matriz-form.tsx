'use client'

import { useMemo, useState } from 'react'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import { TALLAS_STANDARD } from '@/shared/constants/tallas'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'

interface Props {
  productos: Array<{
    id: string
    referencia: string
    nombre: string
    color: string | null
    tallas?: string[] // Tallas específicas del producto, si no aplica usa TALLAS_STANDARD
  }>
  onLineasChange: (lineas: any[]) => void
}

export function PTMatrizForm({ productos, onLineasChange }: Props) {
  const [productosEnMatriz, setProductosEnMatriz] = useState<ProductoEnMatriz[]>([])

  // Obtener la unión de todas las tallas de los productos seleccionados
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

  const productosConTallas: ProductoEnMatriz[] = useMemo(() => {
    return productosEnMatriz.map(p => ({
      ...p,
      cantidades: p.cantidades || {},
    }))
  }, [productosEnMatriz])

  const handleActualizarCantidad = (productoId: string, talla: string, cantidad: number) => {
    setProductosEnMatriz(prev => {
      const existente = prev.find(p => p.producto_id === productoId)

      if (!existente) {
        // Crear nuevo si no existe
        const producto = productos.find(p => p.id === productoId)
        if (!producto) return prev

        return [
          ...prev,
          {
            producto_id: productoId,
            referencia: producto.referencia,
            nombre: producto.nombre,
            color: producto.color,
            precio_unitario: 0,
            cantidades: { [talla]: cantidad },
          },
        ]
      }

      // Actualizar cantidad
      return prev.map(p => {
        if (p.producto_id !== productoId) return p
        const newCantidades = { ...p.cantidades }
        if (cantidad === 0) {
          delete newCantidades[talla]
        } else {
          newCantidades[talla] = cantidad
        }
        return { ...p, cantidades: newCantidades }
      })
    })

    // Emit cambios
    const lineas = generarLineas()
    onLineasChange(lineas)
  }

  const handleRemover = (productoId: string) => {
    setProductosEnMatriz(prev => prev.filter(p => p.producto_id !== productoId))
    const lineas = generarLineas()
    onLineasChange(lineas)
  }

  const generarLineas = () => {
    const lineas: any[] = []
    for (const p of productosEnMatriz) {
      for (const [talla, cantidad] of Object.entries(p.cantidades || {})) {
        if (cantidad > 0) {
          lineas.push({
            producto_id: p.producto_id,
            talla,
            cantidad,
            precio_pactado: 0,
          })
        }
      }
    }
    return lineas
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-body-md font-semibold text-foreground mb-2">Líneas a Recibir</h3>
        <p className="text-body-sm text-muted-foreground mb-4">
          Selecciona referencias y especifica cantidades por talla
        </p>
      </div>

      {/* Selector de productos */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-4">
        <label className="text-body-sm font-medium text-foreground block mb-2">
          Agregar referencia
        </label>
        <select
          onChange={e => {
            const productoId = e.target.value
            if (productoId && !productosEnMatriz.some(p => p.producto_id === productoId)) {
              const producto = productos.find(p => p.id === productoId)
              if (producto) {
                setProductosEnMatriz(prev => [
                  ...prev,
                  {
                    producto_id: productoId,
                    referencia: producto.referencia,
                    nombre: producto.nombre,
                    color: producto.color,
                    precio_unitario: 0,
                    cantidades: {},
                  },
                ])
              }
            }
            e.target.value = ''
          }}
          className="w-full px-3 py-2 rounded-lg bg-white shadow-neu-inset text-foreground outline-none"
        >
          <option value="">Seleccionar producto...</option>
          {productos
            .filter(p => !productosEnMatriz.some(pm => pm.producto_id === p.id))
            .map(p => (
              <option key={p.id} value={p.id}>
                {p.referencia} — {p.nombre} {p.color ? `(${p.color})` : ''}
              </option>
            ))}
        </select>
      </div>

      {/* Matriz */}
      {productosEnMatriz.length > 0 ? (
        <MatrizProductos
          productos={productosConTallas}
          tallas={tallasUnion}
          mostrarPrecio={false}
          onActualizarCantidad={handleActualizarCantidad}
          onRemover={handleRemover}
        />
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
          <p className="text-body-sm text-muted-foreground">
            Selecciona referencias arriba para empezar a ingresar cantidades
          </p>
        </div>
      )}

      {/* Resumen */}
      {productosEnMatriz.length > 0 && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-body-sm font-semibold text-blue-900">
            {productosEnMatriz.length} referencia(s) con{' '}
            {productosEnMatriz.reduce((sum, p) => sum + Object.values(p.cantidades || {}).length, 0)} talla(s)
          </p>
        </div>
      )}
    </div>
  )
}
