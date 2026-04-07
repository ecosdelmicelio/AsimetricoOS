'use client'

import { useState, useTransition } from 'react'
import { Package, CheckCircle2, AlertCircle, X, Edit2 } from 'lucide-react'
import { upsertReporteInsumos } from '@/features/liquidacion/services/liquidacion-actions'
import type { InsumoParaReporte } from '@/features/liquidacion/types'
import { cn } from '@/shared/lib/utils'

interface Props {
  opId: string
  insumos: InsumoParaReporte[]
  bloqueado?: boolean
  estadoActual?: string
  isEditing?: boolean
  onStartEdit?: () => void
  onEditComplete?: () => void
}

export function ReporteInsumosPanel({ 
  opId, 
  insumos, 
  bloqueado = false, 
  estadoActual,
  isEditing = false,
  onStartEdit,
  onEditComplete
}: Props) {
  const [isPending, startTransition] = useTransition()
  
  const [valores, setValores] = useState<Record<string, { cantidad_usada: number; desperdicio: number; notas: string }>>(() => {
    const init: Record<string, { cantidad_usada: number; desperdicio: number; notas: string }> = {}
    for (const ins of insumos) {
      const yaRegistrado = ins.ya_reportado || ins.cantidad_usada > 0
      init[`${ins.producto_id}:${ins.material_id}`] = {
        // Si ya está reportado usamos ese valor, si no usamos el BOM como sugerencia inicial
        cantidad_usada: yaRegistrado ? ins.cantidad_usada : ins.cantidad_bom,
        desperdicio: ins.desperdicio,
        notas: ins.notas ?? '',
      }
    }
    return init
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (insumos.length === 0) return null

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
        setTimeout(() => {
          setSuccess(false)
          if (onEditComplete) onEditComplete()
        }, 1500)
      }
    })
  }

  const yaReportado = insumos.some(i => i.ya_reportado)

  return (
    <>
      <button
        onClick={() => !bloqueado && onStartEdit && onStartEdit()}
        className="rounded-xl bg-slate-50 border border-slate-100 p-3 h-full flex items-center justify-between group hover:border-primary-200 hover:bg-white hover:shadow-md transition-all active:scale-[0.98] text-left w-full"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-sm",
            yaReportado 
              ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
              : "bg-white border-slate-200 text-slate-400 group-hover:text-primary-500 group-hover:border-primary-100"
          )}>
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                Reporte de Insumos
              </p>
              {yaReportado && (
                <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                  REALIZADO
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {yaReportado ? 'Consumo final reportado' : 'Pendiente por registrar consumo'}
            </p>
          </div>
        </div>
        <div className="text-slate-300 group-hover:text-primary-400 transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </div>
      </button>

      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-14 animate-in fade-in duration-200">
          {/* Industrial Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            onClick={() => onEditComplete && onEditComplete()}
          />
          
          <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-white rounded-[2.5rem] overflow-hidden flex flex-col border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] scale-in-center">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shadow-inner">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 leading-none">Consumo Real de Insumos</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Módulo de Liquidación Técnica</p>
                </div>
              </div>
              <button 
                onClick={() => onEditComplete && onEditComplete()}
                className="w-11 h-11 rounded-2xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all hover:rotate-90 hover:text-red-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-8 bg-slate-50/30 pb-28">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-4 items-start">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  <strong>IMPORTANTE:</strong> Reporta las cantidades reales consumidas durante la producción. Los valores BOM son teóricos. Un desvío mayor al 15% requiere una nota justificativa para el cierre de la OP.
                </p>
              </div>

              {[...porProducto.entries()].map(([productoId, grupo]) => (
                <div key={productoId} className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{grupo.nombre}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{grupo.cantidad} UNIDADES</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {grupo.insumos.map(ins => {
                      const key = `${productoId}:${ins.material_id}`
                      const val = valores[key]
                      const teorico = ins.cantidad_bom
                      const real = val?.cantidad_usada ?? 0
                      const desvio = teorico > 0 ? ((real - teorico) / teorico) * 100 : 0
                      const hayDesvio = Math.abs(desvio) > 15

                      return (
                        <div key={ins.material_id} className="bg-white border border-slate-100 rounded-[1.5rem] p-5 flex flex-col gap-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[14px] font-black text-slate-900 leading-tight uppercase tracking-tight">{ins.nombre}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1.5">{ins.unidad} • BOM TEÓRICO: {teorico.toFixed(2)}</p>
                            </div>
                            {hayDesvio && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-100">
                                <AlertCircle className="w-3 h-3" />
                                {desvio > 0 ? '+' : ''}{desvio.toFixed(1)}% Desvío
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CANTIDAD REAL</label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={val?.cantidad_usada ?? 0}
                                onChange={e => handleChange(productoId, ins.material_id, 'cantidad_usada', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-[14px] font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all shadow-inner"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DESPERDICIO (KG)</label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={val?.desperdicio ?? 0}
                                onChange={e => handleChange(productoId, ins.material_id, 'desperdicio', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-[14px] font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all shadow-inner"
                              />
                            </div>
                            <div className="col-span-2 space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">JUSTIFICACIÓN / NOTAS</label>
                              <input
                                type="text"
                                value={val?.notas ?? ''}
                                onChange={e => handleChange(productoId, ins.material_id, 'notas', e.target.value)}
                                placeholder="Notas operativas..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-[12px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all shadow-inner placeholder:text-slate-300"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 flex items-center justify-between gap-6 z-20">
              <div className="flex-1">
                {error && <p className="text-[11px] text-red-600 font-black uppercase tracking-widest">{error}</p>}
                {success && (
                  <div className="flex items-center gap-2 text-emerald-600 font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[11px] uppercase tracking-[0.2em]">Sincronización Exitosa</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onEditComplete && onEditComplete()}
                  className="px-6 py-3 rounded-[1.25rem] border border-slate-200 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={isPending}
                  className="px-8 py-3 rounded-[1.25rem] bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {yaReportado ? 'Actualizar Registro' : 'Confirmar Reporte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
