'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronDown, ChevronUp, Globe } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { createOrdenVenta } from '@/features/ordenes-venta/services/ov-actions'
import { TALLAS_STANDARD, TALLAS_SHAPE } from '@/features/ordenes-venta/types'
import type { LineaOV } from '@/features/ordenes-venta/types'

interface Cliente {
  id: string
  nombre: string
}

interface Producto {
  id: string
  nombre: string
  referencia: string
  precio_base: number | null
  categoria: string | null
  origen_usa: boolean
}

interface Props {
  clientes: Cliente[]
  productos: Producto[]
}

interface ProductoEnForm {
  producto: Producto
  lineas: LineaOV[]
  expanded: boolean
}

type TipoTalla = 'standard' | 'shape'

export function OVForm({ clientes, productos }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [clienteId, setClienteId] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas, setNotas] = useState('')
  const [productosEnForm, setProductosEnForm] = useState<ProductoEnForm[]>([])
  const [productoSelId, setProductoSelId] = useState('')
  const [tipoTalla, setTipoTalla] = useState<TipoTalla>('standard')
  const [error, setError] = useState<string | null>(null)

  const tallasActivas = tipoTalla === 'standard' ? TALLAS_STANDARD : TALLAS_SHAPE

  function agregarProducto() {
    const prod = productos.find(p => p.id === productoSelId)
    if (!prod) return
    if (productosEnForm.some(p => p.producto.id === prod.id)) return

    const lineas: LineaOV[] = tallasActivas.map(talla => ({
      producto_id: prod.id,
      producto_nombre: prod.nombre,
      talla,
      cantidad: 0,
      precio_pactado: prod.precio_base ?? 0,
    }))

    setProductosEnForm(prev => [...prev, { producto: prod, lineas, expanded: true }])
    setProductoSelId('')
  }

  function removerProducto(productoId: string) {
    setProductosEnForm(prev => prev.filter(p => p.producto.id !== productoId))
  }

  function toggleExpanded(productoId: string) {
    setProductosEnForm(prev =>
      prev.map(p => p.producto.id === productoId ? { ...p, expanded: !p.expanded } : p)
    )
  }

  function actualizarCantidad(productoId: string, talla: string, valor: string) {
    const num = parseInt(valor) || 0
    setProductosEnForm(prev =>
      prev.map(p => {
        if (p.producto.id !== productoId) return p
        return {
          ...p,
          lineas: p.lineas.map(l => l.talla === talla ? { ...l, cantidad: Math.max(0, num) } : l),
        }
      })
    )
  }

  function actualizarPrecio(productoId: string, talla: string, valor: string) {
    const num = parseFloat(valor) || 0
    setProductosEnForm(prev =>
      prev.map(p => {
        if (p.producto.id !== productoId) return p
        return {
          ...p,
          lineas: p.lineas.map(l => l.talla === talla ? { ...l, precio_pactado: Math.max(0, num) } : l),
        }
      })
    )
  }

  function calcularTotalProducto(lineas: LineaOV[]) {
    return lineas.reduce((sum, l) => sum + l.cantidad * l.precio_pactado, 0)
  }

  function calcularTotalOV() {
    return productosEnForm.reduce((sum, p) => sum + calcularTotalProducto(p.lineas), 0)
  }

  function calcularUnidadesProducto(lineas: LineaOV[]) {
    return lineas.reduce((sum, l) => sum + l.cantidad, 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clienteId) { setError('Selecciona un cliente'); return }
    if (!fechaEntrega) { setError('Selecciona una fecha de entrega'); return }

    const lineasValidas = productosEnForm.flatMap(p =>
      p.lineas.filter(l => l.cantidad > 0)
    )

    if (lineasValidas.length === 0) {
      setError('Agrega al menos un producto con cantidad mayor a 0')
      return
    }

    startTransition(async () => {
      const result = await createOrdenVenta({
        cliente_id: clienteId,
        fecha_entrega: fechaEntrega,
        notas: notas || undefined,
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
    p => !productosEnForm.some(pf => pf.producto.id === p.id)
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

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Notas (opcional)</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones, especificaciones especiales..."
              className="w-full bg-transparent text-body-sm text-foreground outline-none resize-none placeholder:text-muted-foreground"
            />
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

          {/* Tipo talla */}
          <div className="flex rounded-xl bg-neu-base shadow-neu-inset overflow-hidden">
            <button
              type="button"
              onClick={() => setTipoTalla('standard')}
              className={cn(
                'px-3 py-2.5 text-body-sm font-medium transition-all',
                tipoTalla === 'standard'
                  ? 'bg-primary-600 text-white shadow-inner'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setTipoTalla('shape')}
              className={cn(
                'px-3 py-2.5 text-body-sm font-medium transition-all',
                tipoTalla === 'shape'
                  ? 'bg-primary-600 text-white shadow-inner'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Shape
            </button>
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

        {/* Productos agregados */}
        {productosEnForm.length === 0 && (
          <p className="text-muted-foreground text-body-sm text-center py-6">
            Agrega productos para configurar cantidades por talla
          </p>
        )}

        <div className="space-y-3">
          {productosEnForm.map(({ producto, lineas, expanded }) => {
            const unidades = calcularUnidadesProducto(lineas)
            const total = calcularTotalProducto(lineas)

            return (
              <div key={producto.id} className="rounded-xl bg-neu-base shadow-neu overflow-hidden">
                {/* Header del producto */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleExpanded(producto.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-body-sm">{producto.referencia}</span>
                    <span className="text-muted-foreground text-body-sm">{producto.nombre}</span>
                    {producto.origen_usa && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        <Globe className="w-2.5 h-2.5" />
                        USA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-body-sm font-medium text-foreground">{unidades} uds</span>
                      {total > 0 && (
                        <span className="text-muted-foreground text-body-sm ml-2">
                          ${total.toLocaleString('es-CO')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removerProducto(producto.id) }}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                </div>

                {/* Matriz de tallas */}
                {expanded && (
                  <div className="px-4 pb-4">
                    <div className="rounded-xl bg-neu-base shadow-neu-inset overflow-x-auto">
                      <table className="w-full text-body-sm">
                        <thead>
                          <tr className="border-b border-black/5">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Talla</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">Cantidad</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground">Precio</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineas.map(linea => (
                            <tr key={linea.talla} className="border-b border-black/5 last:border-0">
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-neu-base shadow-neu-inset text-xs font-bold text-foreground">
                                  {linea.talla}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex justify-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={linea.cantidad || ''}
                                    onChange={e => actualizarCantidad(producto.id, linea.talla, e.target.value)}
                                    placeholder="0"
                                    className="w-20 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1.5 outline-none text-foreground placeholder:text-muted-foreground/50"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex justify-center items-center gap-1">
                                  <span className="text-muted-foreground text-xs">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={linea.precio_pactado || ''}
                                    onChange={e => actualizarPrecio(producto.id, linea.talla, e.target.value)}
                                    placeholder="0"
                                    className="w-24 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1.5 outline-none text-foreground placeholder:text-muted-foreground/50"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-foreground">
                                {linea.cantidad > 0
                                  ? `$${(linea.cantidad * linea.precio_pactado).toLocaleString('es-CO')}`
                                  : '—'
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
              {productosEnForm.reduce((s, p) => s + calcularUnidadesProducto(p.lineas), 0)} unidades
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
