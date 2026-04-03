'use client'

import { Trash2 } from 'lucide-react'

export interface ProductoEnMatriz {
  producto_id: string
  referencia: string
  nombre: string
  color: string | null
  precio_unitario: number
  cantidades: Record<string, number>
}

interface MatrizProductosProps {
  productos: ProductoEnMatriz[]
  tallas: string[]
  mostrarPrecio?: boolean
  maxCantidades?: Record<string, number>
  onActualizarCantidad: (productoId: string, talla: string, cantidad: number) => void
  onActualizarPrecio?: (productoId: string, precio: number) => void
  onRemover: (productoId: string) => void
}

const INPUT_TALLA_CLASS =
  'w-12 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1 outline-none text-foreground placeholder:text-muted-foreground/50 text-body-sm'

const INPUT_PRECIO_CLASS =
  'w-20 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1 outline-none text-foreground placeholder:text-muted-foreground/50 text-body-sm'

function calcularUnidades(cantidades: Record<string, number>): number {
  return Object.values(cantidades).reduce((sum, v) => sum + (v || 0), 0)
}

export function MatrizProductos({
  productos,
  tallas,
  mostrarPrecio = false,
  maxCantidades,
  onActualizarCantidad,
  onActualizarPrecio,
  onRemover,
}: MatrizProductosProps) {
  const sinTallas = tallas.length === 0

  if (productos.length === 0) {
    return (
      <p className="text-muted-foreground text-body-sm text-center py-6">
        Agrega productos para configurar cantidades por talla
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {productos.map(producto => {
        const totalUds = calcularUnidades(producto.cantidades)
        const subtotal = totalUds * producto.precio_unitario

        return (
          <div
            key={producto.producto_id}
            className="rounded-2xl bg-neu-base shadow-neu p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-semibold text-foreground text-body-sm truncate">
                  {producto.nombre}
                </span>
                <span className="text-muted-foreground text-body-sm shrink-0">
                  {producto.color ?? '—'}
                </span>
                <span className="text-muted-foreground/60 text-xs shrink-0">
                  {producto.referencia}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemover(producto.producto_id)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 transition-colors shrink-0"
                aria-label={`Eliminar ${producto.nombre}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Grid de tallas o input único */}
            {sinTallas ? (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-body-sm">Cantidad total</span>
                <input
                  type="number"
                  min="0"
                  value={producto.cantidades['total'] || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0
                    onActualizarCantidad(producto.producto_id, 'total', Math.max(0, val))
                  }}
                  placeholder="0"
                  className={INPUT_TALLA_CLASS}
                  aria-label={`Cantidad de ${producto.nombre}`}
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {tallas.map(talla => {
                  const maxKey = `${producto.producto_id}:${talla}`
                  const maxValue = maxCantidades?.[maxKey]
                  return (
                    <div key={talla} className="flex flex-col items-center gap-1">
                      <span className="text-muted-foreground text-xs font-medium">{talla}</span>
                      <input
                        type="number"
                        min="0"
                        value={producto.cantidades[talla] || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0
                          onActualizarCantidad(producto.producto_id, talla, Math.max(0, val))
                        }}
                        placeholder="0"
                        className={INPUT_TALLA_CLASS}
                        aria-label={`Cantidad talla ${talla} de ${producto.nombre}`}
                      />
                      {maxValue !== undefined && (
                        <span className="text-muted-foreground/60 text-xs">
                          / {maxValue}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-black/5">
              <span className="text-muted-foreground text-body-sm">
                <span className="font-semibold text-foreground">{totalUds}</span> uds
              </span>

              {mostrarPrecio && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-body-sm">Precio: $</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={producto.precio_unitario || ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0
                        onActualizarPrecio?.(producto.producto_id, Math.max(0, val))
                      }}
                      placeholder="0"
                      className={INPUT_PRECIO_CLASS}
                      aria-label={`Precio unitario de ${producto.nombre}`}
                    />
                  </div>

                  <span className="text-muted-foreground text-body-sm ml-auto">
                    Subtotal:{' '}
                    <span className="font-semibold text-foreground">
                      {subtotal > 0
                        ? `$${subtotal.toLocaleString('es-CO')}`
                        : '—'}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
