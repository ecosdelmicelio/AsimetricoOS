'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createOrdenVenta } from '@/features/ordenes-venta/services/ov-actions'
import { TALLAS_STANDARD } from '@/shared/constants/tallas'
import type { LineaOV } from '@/features/ordenes-venta/types'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'

interface Cliente {
  id: string
  nombre: string
}

interface Producto {
  id: string
  nombre: string
  referencia: string
  color: string | null
  precio_base: number | null
  categoria: string | null
  origen_usa: boolean
}

interface Props {
  clientes: Cliente[]
  productos: Producto[]
}

export function OVForm({ clientes, productos }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [clienteId, setClienteId] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [productosEnForm, setProductosEnForm] = useState<ProductoEnMatriz[]>([])
  const [productoSelId, setProductoSelId] = useState('')
  const [error, setError] = useState<string | null>(null)

  function agregarProducto() {
    const prod = productos.find(p => p.id === productoSelId)
    if (!prod) return
    if (productosEnForm.some(p => p.producto_id === prod.id)) return

    const cantidades: Record<string, number> = {}
    TALLAS_STANDARD.forEach(t => { cantidades[t] = 0 })

    const nuevo: ProductoEnMatriz = {
      producto_id: prod.id,
      referencia: prod.referencia,
      nombre: prod.nombre,
      color: prod.color,
      precio_unitario: prod.precio_base ?? 0,
      cantidades,
    }

    setProductosEnForm(prev => [...prev, nuevo])
    setProductoSelId('')
  }

  function actualizarCantidad(productoId: string, talla: string, cantidad: number) {
    setProductosEnForm(prev =>
      prev.map(p =>
        p.producto_id !== productoId
          ? p
          : { ...p, cantidades: { ...p.cantidades, [talla]: cantidad } }
      )
    )
  }

  function actualizarPrecio(productoId: string, precio: number) {
    setProductosEnForm(prev =>
      prev.map(p => p.producto_id !== productoId ? p : { ...p, precio_unitario: precio })
    )
  }

  function removerProducto(productoId: string) {
    setProductosEnForm(prev => prev.filter(p => p.producto_id !== productoId))
  }

  function calcularTotalUds(): number {
    return productosEnForm.reduce(
      (sum, p) => sum + Object.values(p.cantidades).reduce((s, v) => s + (v || 0), 0),
      0
    )
  }

  function calcularTotalOV(): number {
    return productosEnForm.reduce((sum, p) => {
      const uds = Object.values(p.cantidades).reduce((s, v) => s + (v || 0), 0)
      return sum + uds * p.precio_unitario
    }, 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clienteId) { setError('Selecciona un cliente'); return }
    if (!fechaEntrega) { setError('Selecciona una fecha de entrega'); return }

    const lineasValidas: LineaOV[] = productosEnForm.flatMap(p =>
      TALLAS_STANDARD.map(talla => ({
        producto_id: p.producto_id,
        producto_nombre: p.nombre,
        talla,
        cantidad: p.cantidades[talla] ?? 0,
        precio_pactado: p.precio_unitario,
      })).filter(l => l.cantidad > 0)
    )

    if (lineasValidas.length === 0) {
      setError('Agrega al menos un producto con cantidad mayor a 0')
      return
    }

    startTransition(async () => {
      const result = await createOrdenVenta({
        cliente_id: clienteId,
        fecha_entrega: fechaEntrega,
        lineas: lineasValidas,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(`/ordenes-venta/${result.data?.id}`)
    })
  }

  const productosDisponibles = productos.filter(
    p => !productosEnForm.some(pf => pf.producto_id === p.id)
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos básicos */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-body-md">Datos de la Orden</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Cliente */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Cliente <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                required
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha entrega */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Fecha de Entrega <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <input
                type="date"
                value={fechaEntrega}
                onChange={e => setFechaEntrega(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Agregar productos */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-body-md">Productos</h2>

        {/* Selector */}
        <div className="flex gap-3 flex-wrap">
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 flex-1 min-w-[200px]">
            <select
              value={productoSelId}
              onChange={e => setProductoSelId(e.target.value)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Seleccionar producto...</option>
              {productosDisponibles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.referencia} — {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={agregarProducto}
            disabled={!productoSelId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        {/* Matriz de productos */}
        <MatrizProductos
          productos={productosEnForm}
          tallas={[...TALLAS_STANDARD]}
          mostrarPrecio
          onActualizarCantidad={actualizarCantidad}
          onActualizarPrecio={actualizarPrecio}
          onRemover={removerProducto}
        />
      </div>

      {/* Total y submit */}
      {productosEnForm.length > 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-body-sm">Total estimado</p>
            <p className="text-display-xs font-bold text-foreground">
              ${calcularTotalOV().toLocaleString('es-CO')}
            </p>
            <p className="text-muted-foreground text-body-sm">
              {calcularTotalUds()} unidades
            </p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neu-base shadow-neu text-primary-700 font-bold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60 hover:shadow-neu-lg"
          >
            {isPending ? 'Creando...' : 'Crear Orden'}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-body-sm">
          {error}
        </div>
      )}
    </form>
  )
}
