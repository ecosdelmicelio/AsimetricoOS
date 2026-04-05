'use client'

import { useState, useTransition } from 'react'
import { Package } from 'lucide-react'
import { upsertReporteInsumos } from '@/features/liquidacion/services/liquidacion-actions'
import type { InsumoParaReporte } from '@/features/liquidacion/types'

interface Props {
  opId: string
  insumos: InsumoParaReporte[]
  bloqueado?: boolean
}

export function ReporteInsumosPanel({ opId, insumos, bloqueado = false }: Props) {
  const [isPending, startTransition] = useTransition()
  // Key: `${producto_id}:${material_id}`
  const [valores, setValores] = useState<Record<string, { cantidad_usada: number; desperdicio: number; notas: string }>>(() => {
    const init: Record<string, { cantidad_usada: number; desperdicio: number; notas: string }> = {}
    for (const ins of insumos) {
      init[`${ins.producto_id}:${ins.material_id}`] = {
        cantidad_usada: ins.cantidad_usada,
        desperdicio: ins.desperdicio,
        notas: ins.notas ?? '',
      }
    }
    return init
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (insumos.length === 0) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-5">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground text-body-md">Reporte de Insumos</h2>
        </div>
        <p className="text-body-sm text-muted-foreground">
          No hay insumos adicionales para reportar en esta OP. Los insumos de corte ya están incluidos en el reporte de corte.
        </p>
      </div>
    )
  }

  // Agrupar por producto_id
  const porProducto = new Map<string, { nombre: string; cantidad: number; insumos: InsumoParaReporte[] }>()
  for (const ins of insumos) {
    if (!porProducto.has(ins.producto_id)) {
      porProducto.set(ins.producto_id, { nombre: ins.producto_nombre, cantidad: ins.cantidad_producto, insumos: [] })
    }
    porProducto.get(ins.producto_id)!.insumos.push(ins)
  }

  function handleChange(productoId: string, materialId: string, field: 'cantidad_usada' | 'desperdicio' | 'notas', value: string) {
    const key = `${productoId}:${materialId}`
    setValores(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === 'notas' ? value : parseFloat(value) || 0,
      },
    }))
    setSuccess(false)
  }

  function handleGuardar() {
    setError(null)
    const lineas = insumos.map(ins => {
      const key = `${ins.producto_id}:${ins.material_id}`
      return {
        producto_id: ins.producto_id,
        material_id: ins.material_id,
        cantidad_usada: valores[key]?.cantidad_usada ?? 0,
        desperdicio: valores[key]?.desperdicio ?? 0,
        notas: valores[key]?.notas || undefined,
      }
    })

    startTransition(async () => {
      const result = await upsertReporteInsumos(opId, lineas)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground text-body-md">Reporte de Insumos</h2>
        </div>
        {bloqueado && (
          <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded-lg">Liquidación aprobada</span>
        )}
      </div>

      <div className="p-5 space-y-5">
        <p className="text-body-sm text-muted-foreground">
          Reporta la cantidad real usada de cada insumo por referencia. Los valores del BOM son una referencia teórica.
        </p>

        {[...porProducto.entries()].map(([productoId, grupo]) => (
          <div key={productoId} className="space-y-2">
            {/* Header de producto */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{grupo.nombre}</span>
              <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">{grupo.cantidad} uds</span>
            </div>

            {/* Tabla de insumos de este producto */}
            <div className="overflow-x-auto rounded-xl bg-neu-base shadow-neu-inset">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Insumo</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-20">BOM teórico</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-24">Cant. usada</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-24">Desperdicio</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground min-w-32">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.insumos.map(ins => {
                    const key = `${productoId}:${ins.material_id}`
                    const val = valores[key]
                    const teorico = ins.cantidad_bom
                    const real = val?.cantidad_usada ?? 0
                    const desvio = teorico > 0 ? ((real - teorico) / teorico) * 100 : 0
                    const hayDesvio = Math.abs(desvio) > 10

                    return (
                      <tr key={ins.material_id} className="border-b border-black/5 last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{ins.nombre}</p>
                          <p className="text-muted-foreground">{ins.unidad}</p>
                        </td>
                        <td className="px-3 py-3 text-center text-muted-foreground">
                          {teorico.toFixed(2)}
                        </td>
                        <td className="px-3 py-3">
                          <div className={`rounded-lg shadow-neu-inset px-2 py-1.5 ${hayDesvio ? 'bg-yellow-50 border border-yellow-200' : 'bg-neu-base'}`}>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={val?.cantidad_usada ?? 0}
                              onChange={e => handleChange(productoId, ins.material_id, 'cantidad_usada', e.target.value)}
                              disabled={bloqueado}
                              className="w-full bg-transparent text-foreground outline-none text-center disabled:opacity-60"
                            />
                          </div>
                          {hayDesvio && (
                            <p className="text-center mt-0.5 text-yellow-600 font-semibold">
                              {desvio > 0 ? '+' : ''}{desvio.toFixed(1)}%
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={val?.desperdicio ?? 0}
                              onChange={e => handleChange(productoId, ins.material_id, 'desperdicio', e.target.value)}
                              disabled={bloqueado}
                              className="w-full bg-transparent text-foreground outline-none text-center disabled:opacity-60"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2 py-1.5">
                            <input
                              type="text"
                              value={val?.notas ?? ''}
                              onChange={e => handleChange(productoId, ins.material_id, 'notas', e.target.value)}
                              disabled={bloqueado}
                              placeholder="Opcional..."
                              className="w-full bg-transparent text-foreground outline-none disabled:opacity-60 placeholder:text-muted-foreground"
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {!bloqueado && (
          <div className="flex items-center justify-between pt-1">
            {success && <p className="text-green-600 text-body-sm font-medium">✓ Guardado correctamente</p>}
            {error && <p className="text-red-600 text-body-sm">{error}</p>}
            {!success && !error && <span />}
            <button
              onClick={handleGuardar}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60 hover:shadow-neu-lg"
            >
              {isPending ? 'Guardando...' : insumos.some(i => i.ya_reportado) ? 'Actualizar reporte' : 'Guardar reporte'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
