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
  onActualizarCantidad: (productoId: string, talla: string, cantidad: number) => void
  onActualizarPrecio?: (productoId: string, precio: number) => void
  onRemover: (productoId: string) => void
}

const INPUT_CLASS =
  'w-14 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-1 py-1 outline-none text-foreground placeholder:text-muted-foreground/50 text-body-sm'

export function MatrizProductos({
  productos,
  tallas,
  mostrarPrecio = false,
  onActualizarCantidad,
  onActualizarPrecio,
  onRemover,
}: MatrizProductosProps) {
  const sinTallas = tallas.length === 0

  function calcularTotal(cantidades: Record<string, number>): number {
    return Object.values(cantidades).reduce((sum, v) => sum + (v || 0), 0)
  }

  if (productos.length === 0) {
    return (
      <p className="text-muted-foreground text-body-sm text-center py-6">
        Agrega productos para configurar cantidades por talla
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-neu-base shadow-neu-inset">
      <table className="w-full text-body-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-black/5">
            <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Ref</th>
            <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Color</th>

            {sinTallas ? (
              <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Cantidad</th>
            ) : (
              <>
                {tallas.map(talla => (
                  <th key={talla} className="text-center px-2 py-2.5 font-medium text-muted-foreground">
                    {talla}
                  </th>
                ))}
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Total uds</th>
              </>
            )}

            {mostrarPrecio && (
              <>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Precio</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Subtotal</th>
              </>
            )}

            <th className="px-2 py-2.5" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {productos.map(producto => {
            const totalUds = calcularTotal(producto.cantidades)
            const subtotal = totalUds * producto.precio_unitario

            return (
              <tr key={producto.producto_id} className="border-b border-black/5 last:border-0">
                {/* Referencia + nombre */}
                <td className="px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{producto.referencia}</span>
                    <span className="text-muted-foreground text-xs">{producto.nombre}</span>
                  </div>
                </td>

                {/* Color */}
                <td className="px-3 py-2 text-foreground">
                  {producto.color ?? <span className="text-muted-foreground">—</span>}
                </td>

                {sinTallas ? (
                  /* Modo sin tallas: una columna "total" */
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min="0"
                      value={producto.cantidades['total'] || ''}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0
                        onActualizarCantidad(producto.producto_id, 'total', Math.max(0, val))
                      }}
                      placeholder="0"
                      className={INPUT_CLASS}
                      aria-label={`Cantidad de ${producto.referencia}`}
                    />
                  </td>
                ) : (
                  <>
                    {/* Una columna por talla */}
                    {tallas.map(talla => (
                      <td key={talla} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={producto.cantidades[talla] || ''}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0
                            onActualizarCantidad(producto.producto_id, talla, Math.max(0, val))
                          }}
                          placeholder="0"
                          className={INPUT_CLASS}
                          aria-label={`Cantidad talla ${talla} de ${producto.referencia}`}
                        />
                      </td>
                    ))}

                    {/* Total unidades */}
                    <td className="px-3 py-2 text-center text-foreground font-medium">
                      {totalUds > 0 ? `${totalUds} uds` : <span className="text-muted-foreground">—</span>}
                    </td>
                  </>
                )}

                {/* Precio y subtotal (solo si mostrarPrecio) */}
                {mostrarPrecio && (
                  <>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-muted-foreground text-xs">$</span>
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
                          className={INPUT_CLASS}
                          aria-label={`Precio unitario de ${producto.referencia}`}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {subtotal > 0
                        ? `$${subtotal.toLocaleString('es-CO')}`
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                  </>
                )}

                {/* Eliminar */}
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onRemover(producto.producto_id)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                    aria-label={`Eliminar ${producto.referencia}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
