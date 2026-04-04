'use client'

import { useState, useMemo, useEffect } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'

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
  tallas: readonly string[] | string[]
  mostrarPrecio?: boolean
  maxCantidades?: Record<string, number>
  opcionesAgregarColor?: Record<string, { productoId: string; color: string | null }[]>
  onActualizarCantidad: (productoId: string, talla: string, cantidad: number) => void
  onActualizarPrecio?: (productoId: string, precio: number) => void
  onRemover: (productoId: string) => void
  onAgregarColor?: (productoId: string) => void
}

const INPUT_TALLA_CLASS =
  'w-12 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1 outline-none text-foreground placeholder:text-muted-foreground/50 text-body-sm'

const INPUT_PRECIO_CLASS =
  'w-20 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1 outline-none text-foreground placeholder:text-muted-foreground/50 text-body-sm'

function calcularUnidades(cantidades: Record<string, number>): number {
  return Object.values(cantidades).reduce((sum, v) => sum + (v || 0), 0)
}

interface ReferenciaGroup {
  referencia: string
  productos: ProductoEnMatriz[]
  subtotalUds: number
  subtotalPrecio: number
}

export function MatrizProductos({
  productos,
  tallas,
  mostrarPrecio = false,
  maxCantidades,
  opcionesAgregarColor,
  onActualizarCantidad,
  onActualizarPrecio,
  onRemover,
  onAgregarColor,
}: MatrizProductosProps) {
  const sinTallas = tallas.length === 0

  // Agrupar por referencia, ordenar productos por color alfabéticamente
  const grupos: ReferenciaGroup[] = useMemo(() => {
    const map = new Map<string, ProductoEnMatriz[]>()

    for (const p of productos) {
      if (!map.has(p.referencia)) {
        map.set(p.referencia, [])
      }
      map.get(p.referencia)!.push(p)
    }

    return [...map.entries()].map(([ref, prods]) => {
      // Ordenar productos por color alfabéticamente (nulls al final)
      const sorted = prods.sort((a, b) => {
        const colorA = a.color ?? ''
        const colorB = b.color ?? ''
        return colorA.localeCompare(colorB)
      })

      const subtotalUds = sorted.reduce((sum, p) => sum + calcularUnidades(p.cantidades), 0)
      const subtotalPrecio = sorted.reduce(
        (sum, p) => sum + calcularUnidades(p.cantidades) * p.precio_unitario,
        0
      )

      return { referencia: ref, productos: sorted, subtotalUds, subtotalPrecio }
    }).sort((a, b) => a.referencia.localeCompare(b.referencia))
  }, [productos])

  // Estado para referencias expandidas
  const [expandedRefs, setExpandedRefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(grupos.map(g => [g.referencia, true]))
  )

  // Auto-expande nuevas referencias cuando el array cambia
  useEffect(() => {
    setExpandedRefs(prev => {
      const next = { ...prev }
      for (const g of grupos) {
        if (!(g.referencia in next)) {
          next[g.referencia] = true
        }
      }
      return next
    })
  }, [grupos])

  if (productos.length === 0) {
    return (
      <p className="text-muted-foreground text-body-sm text-center py-6">
        Agrega productos para configurar cantidades por talla
      </p>
    )
  }

  const mostrarControlesExpand = grupos.length > 1

  return (
    <div className="space-y-4">
      {/* Controles de expandir/contraer todas las referencias */}
      {mostrarControlesExpand && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const newState: Record<string, boolean> = {}
              for (const g of grupos) {
                newState[g.referencia] = true
              }
              setExpandedRefs(newState)
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary-700 bg-neu-base shadow-neu hover:shadow-neu-lg transition-all"
          >
            Expandir todo
          </button>
          <button
            type="button"
            onClick={() => {
              const newState: Record<string, boolean> = {}
              for (const g of grupos) {
                newState[g.referencia] = false
              }
              setExpandedRefs(newState)
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary-700 bg-neu-base shadow-neu hover:shadow-neu-lg transition-all"
          >
            Contraer todo
          </button>
        </div>
      )}

      {/* Grupos por referencia */}
      {grupos.map(grupo => {
        const isExpanded = expandedRefs[grupo.referencia] ?? true

        return (
          <div
            key={grupo.referencia}
            className="rounded-2xl bg-neu-base shadow-neu overflow-hidden"
          >
            {/* Header de referencia (collapsible) */}
            <button
              type="button"
              onClick={() =>
                setExpandedRefs(prev => ({
                  ...prev,
                  [grupo.referencia]: !prev[grupo.referencia],
                }))
              }
              className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-black/2 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${
                    isExpanded ? '' : '-rotate-90'
                  }`}
                />
                <span className="font-semibold text-foreground text-body-md">
                  {grupo.referencia}
                </span>
              </div>
              <div className="flex items-center gap-4 text-body-sm shrink-0">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{grupo.subtotalUds}</span> uds
                </span>
                {mostrarPrecio && (
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      ${grupo.subtotalPrecio.toLocaleString('es-CO')}
                    </span>
                  </span>
                )}
              </div>
            </button>

            {/* Contenido (colores) */}
            {isExpanded && (
              <div className="border-t border-black/5 p-4 space-y-3">
                {grupo.productos.map(producto => {
                  const totalUds = calcularUnidades(producto.cantidades)
                  const subtotal = totalUds * producto.precio_unitario
                  const colorLabel = producto.color ?? producto.nombre

                  return (
                    <div key={producto.producto_id} className="space-y-3">
                      {/* Sub-header de color */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground text-body-sm">
                          {colorLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemover(producto.producto_id)}
                          className="p-1 rounded-lg text-red-400 hover:text-red-600 transition-colors shrink-0"
                          aria-label={`Eliminar ${colorLabel}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Grid de tallas */}
                      {sinTallas ? (
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-muted-foreground text-body-sm">
                            Cantidad total
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={producto.cantidades['total'] || ''}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0
                              onActualizarCantidad(
                                producto.producto_id,
                                'total',
                                Math.max(0, val)
                              )
                            }}
                            placeholder="0"
                            className={INPUT_TALLA_CLASS}
                            aria-label={`Cantidad de ${colorLabel}`}
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 ml-4">
                          {tallas.map(talla => {
                            const maxKey = `${producto.producto_id}:${talla}`
                            const maxValue = maxCantidades?.[maxKey]
                            return (
                              <div key={talla} className="flex flex-col items-center gap-1">
                                <span className="text-muted-foreground text-xs font-medium">
                                  {talla}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={producto.cantidades[talla] || ''}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 0
                                    onActualizarCantidad(
                                      producto.producto_id,
                                      talla,
                                      Math.max(0, val)
                                    )
                                  }}
                                  placeholder="0"
                                  className={INPUT_TALLA_CLASS}
                                  aria-label={`Cantidad talla ${talla} de ${colorLabel}`}
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

                      {/* Footer de color */}
                      <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-black/5 ml-4">
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
                                  onActualizarPrecio?.(
                                    producto.producto_id,
                                    Math.max(0, val)
                                  )
                                }}
                                placeholder="0"
                                className={INPUT_PRECIO_CLASS}
                                aria-label={`Precio unitario de ${colorLabel}`}
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

                {/* Opción de agregar color inline */}
                {onAgregarColor && opcionesAgregarColor?.[grupo.referencia] && (
                  opcionesAgregarColor[grupo.referencia].length > 0
                ) && (
                  <div className="pt-2 border-t border-black/5 flex gap-2 items-center flex-wrap">
                    <span className="text-muted-foreground text-body-sm">+ Color:</span>
                    <div className="rounded-lg bg-neu-base shadow-neu-inset px-2 py-1.5 flex-1 min-w-[150px]">
                      <select
                        onChange={e => {
                          const productoId = e.target.value
                          if (productoId) {
                            onAgregarColor(productoId)
                            e.target.value = ''
                          }
                        }}
                        className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                      >
                        <option value="">Seleccionar color...</option>
                        {opcionesAgregarColor[grupo.referencia].map(opt => (
                          <option key={opt.productoId} value={opt.productoId}>
                            {opt.color ?? 'Sin color'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
