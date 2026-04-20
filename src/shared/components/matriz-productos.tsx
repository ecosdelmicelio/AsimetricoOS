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
  'w-10 text-center bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 outline-none text-slate-900 focus:border-slate-400 focus:bg-white transition-all text-[10px] font-black tabular-nums'

const INPUT_PRECIO_CLASS =
  'w-20 text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-900 focus:border-slate-400 focus:bg-white transition-all text-[10px] font-black tabular-nums'

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

  // Cálculo de totales verticales por talla para un grupo
  const calcularTotalesPorTalla = (productosGrupo: ProductoEnMatriz[]) => {
    const totales: Record<string, number> = {}
    for (const t of tallas) {
      totales[t] = productosGrupo.reduce((sum, p) => sum + (p.cantidades[t] || 0), 0)
    }
    if (sinTallas) {
      totales['total'] = productosGrupo.reduce((sum, p) => sum + (p.cantidades['total'] || 0), 0)
    }
    return totales
  }

  const [expandedRefs, setExpandedRefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(grupos.map(g => [g.referencia, true]))
  )

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
      <div className="bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100 p-12 text-center animate-in fade-in duration-500">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Matrix Ready</p>
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          Seleccione un producto del catálogo para configurar tallaje
        </p>
      </div>
    )
  }

  const mostrarControlesExpand = grupos.length > 1

  return (
    <div className="space-y-6">
      {/* Controles de expandir/contraer */}
      {mostrarControlesExpand && (
        <div className="flex gap-2 justify-end px-4">
          <button
            type="button"
            onClick={() => setExpandedRefs(Object.fromEntries(grupos.map(g => [g.referencia, true])))}
            className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
          >
            Expandir Todo
          </button>
          <button
            type="button"
            onClick={() => setExpandedRefs(Object.fromEntries(grupos.map(g => [g.referencia, false])))}
            className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
          >
            Contraer Todo
          </button>
        </div>
      )}

      {grupos.map(grupo => {
        const isExpanded = expandedRefs[grupo.referencia] ?? true
        const totalesVerticales = calcularTotalesPorTalla(grupo.productos)

        return (
          <div key={grupo.referencia} className="group/ref rounded-[40px] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all overflow-hidden">
            {/* Header de Referencia */}
            <button
              type="button"
              onClick={() => setExpandedRefs(prev => ({ ...prev, [grupo.referencia]: !isExpanded }))}
              className="w-full px-8 py-5 flex items-center justify-between gap-4 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-2xl bg-slate-50 text-slate-400 transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-slate-900 text-base tracking-tighter uppercase leading-none">
                    {grupo.referencia}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Línea de Producción</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Volumen Total</p>
                  <p className="font-black text-slate-900 tabular-nums leading-none">
                    {grupo.subtotalUds} <span className="text-[10px] text-slate-400 ml-0.5">UDS</span>
                  </p>
                </div>
                {mostrarPrecio && (
                  <div className="text-right border-l border-slate-100 pl-8">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valuación REF</p>
                    <p className="font-black text-emerald-600 tabular-nums leading-none">
                      ${grupo.subtotalPrecio.toLocaleString('es-CO')}
                    </p>
                  </div>
                )}
              </div>
            </button>

            {/* Matrix Table */}
            {isExpanded && (
              <div className="border-t border-slate-50 p-2 animate-in slide-in-from-top-4 duration-500">
                <div className="overflow-x-auto rounded-[28px] border border-slate-100 bg-slate-50/30">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-100/50">
                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] sticky left-0 bg-slate-100/50 backdrop-blur-sm z-10">
                          Color / Variante
                        </th>
                        {sinTallas ? (
                          <th className="px-4 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">CANT</th>
                        ) : (
                          tallas.map(t => (
                            <th key={t} className="px-2 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] min-w-[50px]">
                              {t}
                            </th>
                          ))
                        )}
                        <th className="px-4 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-l border-slate-200/50">Total</th>
                        {mostrarPrecio && (
                          <>
                            <th className="px-4 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">P. Unit</th>
                            <th className="px-4 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Subtotal</th>
                          </>
                        )}
                        <th className="px-6 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grupo.productos.map(p => {
                        const totalRow = calcularUnidades(p.cantidades)
                        const subtotalRow = totalRow * p.precio_unitario
                        return (
                          <tr key={p.producto_id} className="hover:bg-white transition-colors group/row">
                            <td className="px-6 py-3 sticky left-0 bg-white/80 group-hover/row:bg-white backdrop-blur-sm z-10">
                              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                                {p.color ?? 'Sin Color'}
                              </span>
                            </td>
                            {sinTallas ? (
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={p.cantidades['total'] || ''}
                                  onChange={e => onActualizarCantidad(p.producto_id, 'total', Math.max(0, parseInt(e.target.value) || 0))}
                                  className={INPUT_TALLA_CLASS}
                                />
                              </td>
                            ) : (
                              tallas.map(t => (
                                <td key={t} className="px-1 py-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={p.cantidades[t] || ''}
                                    onChange={e => onActualizarCantidad(p.producto_id, t, Math.max(0, parseInt(e.target.value) || 0))}
                                    className={INPUT_TALLA_CLASS}
                                  />
                                </td>
                              ))
                            )}
                            <td className="px-4 py-3 text-center border-l border-slate-200/30">
                              <span className="text-[10px] font-black text-slate-900 tabular-nums">{totalRow}</span>
                            </td>
                            {mostrarPrecio && (
                              <>
                                <td className="px-4 py-3 text-center">
                                  <div className="relative">
                                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-slate-400">$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      value={p.precio_unitario || ''}
                                      onChange={e => onActualizarPrecio?.(p.producto_id, Math.max(0, parseFloat(e.target.value) || 0))}
                                      className={INPUT_PRECIO_CLASS}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-[10px] font-black text-slate-900 tabular-nums">
                                    ${subtotalRow > 0 ? subtotalRow.toLocaleString('es-CO') : '—'}
                                  </span>
                                </td>
                              </>
                            )}
                            <td className="px-6 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => onRemover(p.producto_id)}
                                className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/row:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/80 border-t border-slate-200">
                        <td className="px-6 py-3 text-[9px] font-black text-slate-900 uppercase tracking-widest sticky left-0 bg-slate-100 backdrop-blur-sm z-10">
                          Total Talla
                        </td>
                        {sinTallas ? (
                          <td className="px-2 py-3 text-center text-[10px] font-black text-slate-900">
                            {totalesVerticales['total']}
                          </td>
                        ) : (
                          tallas.map(t => (
                            <td key={t} className="px-2 py-3 text-center text-[10px] font-black text-slate-900 tabular-nums">
                              {totalesVerticales[t] || '—'}
                            </td>
                          ))
                        )}
                        <td className="px-4 py-3 text-center text-[10px] font-black text-slate-900 tabular-nums border-l border-slate-200">
                          {grupo.subtotalUds}
                        </td>
                        {mostrarPrecio && <td colSpan={3} className="px-6 py-3 text-right text-[10px] font-black text-emerald-600 tabular-nums truncate">
                          ${grupo.subtotalPrecio.toLocaleString('es-CO')}
                        </td>}
                        {!mostrarPrecio && <td className="px-6 py-3" />}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Inline Add Color */}
                {onAgregarColor && opcionesAgregarColor?.[grupo.referencia] && (
                  opcionesAgregarColor[grupo.referencia].length > 0
                ) && (
                  <div className="mt-4 p-4 flex items-center justify-between gap-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Añadir Variante de Color:</p>
                    <div className="flex-1 max-w-xs relative bg-white border border-slate-100 rounded-2xl px-4 py-2 flex items-center gap-2 group/select hover:border-slate-300 transition-all">
                      <select
                        onChange={e => {
                          const val = e.target.value
                          if (val) {
                            onAgregarColor(val)
                            e.target.value = ''
                          }
                        }}
                        className="w-full bg-transparent text-[11px] font-black text-slate-900 uppercase tracking-tight outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Seleccionar Color...</option>
                        {opcionesAgregarColor[grupo.referencia].map(opt => (
                          <option key={opt.productoId} value={opt.productoId}>{opt.color ?? 'Genérico'}</option>
                        ))}
                      </select>
                      <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
