'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, AlertTriangle, CheckCircle2, RefreshCw, Plus, Trash2, RotateCcw, Warehouse } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { aprobarLiquidacion, anularLiquidacion, calcularResumenLiquidacion, upsertServicioRef, deleteServicioRef, guardarBodegaDestino } from '@/features/liquidacion/services/liquidacion-actions'
import type { ResumenLiquidacion, ServicioRef } from '@/features/liquidacion/types'

interface LineaProducto {
  producto_id: string
  referencia: string
  nombre: string
  unidades: number
}

interface Props {
  opId: string
  resumenInicial: ResumenLiquidacion
  serviciosRefIniciales: ServicioRef[]
  serviciosBOM: { producto_id: string; servicio_nombre: string; cantidad_bom: number }[]
  lineasOP: LineaProducto[]
  liquidacionAprobada?: {
    costo_total: number
    cpp: number | null
    cantidad_entregada: number
    fecha_aprobacion: string | null
  } | null
  hayReporteInsumos: boolean
  bodegas: { id: string; nombre: string }[]
  bodegaDestinoId: string | null
  opCodigo: string
}

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

export function LiquidacionPanel({ opId, resumenInicial, serviciosRefIniciales, serviciosBOM, lineasOP, liquidacionAprobada, hayReporteInsumos, bodegas, bodegaDestinoId, opCodigo }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [resumen, setResumen] = useState<ResumenLiquidacion>(resumenInicial)
  const [recalculando, setRecalculando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviciosRef, setServiciosRef] = useState<ServicioRef[]>(serviciosRefIniciales)
  const [nuevaLinea, setNuevaLinea] = useState<{ producto_id: string; nombre_servicio: string; tarifa_unitaria: string; cantidad: string }>({ producto_id: '', nombre_servicio: '', tarifa_unitaria: '', cantidad: '' })
  const [srvError, setSrvError] = useState<string | null>(null)
  const [srvPending, startSrvTransition] = useTransition()
  const [anulando, startAnularTransition] = useTransition()
  const [anulacionError, setAnulacionError] = useState<string | null>(null)
  const [confirmarAnulacion, setConfirmarAnulacion] = useState(false)
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState(bodegaDestinoId ?? '')
  const [editandoBodega, setEditandoBodega] = useState(!bodegaDestinoId)
  const [bodegaError, setBodegaError] = useState<string | null>(null)
  const [guardandoBodega, startBodegaTransition] = useTransition()

  const aprobada = !!liquidacionAprobada

  useEffect(() => {
    setBodegaSeleccionada(bodegaDestinoId ?? '')
    setEditandoBodega(!bodegaDestinoId)
  }, [bodegaDestinoId])

  function handleRecalcular() {
    setRecalculando(true)
    startTransition(async () => {
      const nuevo = await calcularResumenLiquidacion(opId)
      setResumen(nuevo)
      setRecalculando(false)
    })
  }

  function handleAgregarServicio() {
    setSrvError(null)
    if (!nuevaLinea.producto_id || !nuevaLinea.nombre_servicio || !nuevaLinea.tarifa_unitaria || !nuevaLinea.cantidad) {
      setSrvError('Completa todos los campos')
      return
    }
    const tarifa = parseFloat(nuevaLinea.tarifa_unitaria)
    const cantidad = parseFloat(nuevaLinea.cantidad)
    if (isNaN(tarifa) || isNaN(cantidad) || tarifa <= 0 || cantidad <= 0) {
      setSrvError('Tarifa y cantidad deben ser mayores a 0')
      return
    }
    startSrvTransition(async () => {
      const res = await upsertServicioRef(opId, { producto_id: nuevaLinea.producto_id, nombre_servicio: nuevaLinea.nombre_servicio, tarifa_unitaria: tarifa, cantidad })
      if (res.error) { setSrvError(res.error); return }
      const producto = lineasOP.find(p => p.producto_id === nuevaLinea.producto_id)
      const nueva: ServicioRef = { id: crypto.randomUUID(), producto_id: nuevaLinea.producto_id, producto_nombre: producto?.nombre ?? '', referencia: producto?.referencia ?? '', nombre_servicio: nuevaLinea.nombre_servicio, tarifa_unitaria: tarifa, cantidad, costo_total: tarifa * cantidad }
      setServiciosRef(prev => {
        const idx = prev.findIndex(s => s.producto_id === nuevaLinea.producto_id && s.nombre_servicio === nuevaLinea.nombre_servicio)
        return idx >= 0 ? prev.map((s, i) => i === idx ? { ...s, tarifa_unitaria: tarifa, cantidad, costo_total: tarifa * cantidad } : s) : [...prev, nueva]
      })
      setNuevaLinea({ producto_id: '', nombre_servicio: '', tarifa_unitaria: '', cantidad: '' })
      const nuevo = await calcularResumenLiquidacion(opId)
      setResumen(nuevo)
    })
  }

  function handleEliminarServicio(id: string) {
    startSrvTransition(async () => {
      await deleteServicioRef(id, opId)
      setServiciosRef(prev => prev.filter(s => s.id !== id))
      const nuevo = await calcularResumenLiquidacion(opId)
      setResumen(nuevo)
    })
  }

  function handleAprobar() {
    if (!bodegaSeleccionada) {
      setError('Debes configurar la bodega de destino antes de aprobar.')
      return
    }
    if (!hayReporteInsumos && resumen.comparativo.filter(l => l.tipo === 'insumo').length > 0) {
      setError('Debes guardar el reporte de insumos antes de aprobar la liquidación.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await aprobarLiquidacion(opId, bodegaSeleccionada)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleAnular() {
    setAnulacionError(null)
    startAnularTransition(async () => {
      const result = await anularLiquidacion(opId)
      if (result.error) {
        setAnulacionError(result.error)
        setConfirmarAnulacion(false)
      }
    })
  }

  function handleGuardarBodega() {
    if (!bodegaSeleccionada) return
    setBodegaError(null)
    startBodegaTransition(async () => {
      const result = await guardarBodegaDestino(opId, bodegaSeleccionada, opCodigo)
      if (result.error) {
        setBodegaError(result.error)
      } else {
        setEditandoBodega(false)
        router.refresh()
      }
    })
  }

  if (aprobada && liquidacionAprobada) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-emerald-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
               <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-emerald-800 uppercase tracking-tighter leading-none">Liquidación Aprobada</h2>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Auditada y cerrada</p>
            </div>
          </div>
          {!confirmarAnulacion ? (
            <button
              onClick={() => setConfirmarAnulacion(true)}
              className="px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
            >
              Anular liquidación
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-red-600 font-black uppercase tracking-widest animate-pulse">¿Confirmar anulación?</span>
              <button
                onClick={handleAnular}
                disabled={anulando}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
              >
                {anulando ? '...' : 'Sí, anular'}
              </button>
              <button
                onClick={() => setConfirmarAnulacion(false)}
                disabled={anulando}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Costo Total" value={formatCOP(liquidacionAprobada.costo_total)} icon={<DollarSign className="w-4 h-4 text-emerald-500" />} />
          <StatCard label="Unidades" value={`${liquidacionAprobada.cantidad_entregada} uds`} icon={<CheckCircle2 className="w-4 h-4 text-slate-400" />} />
          <div className="bg-emerald-600 rounded-3xl p-6 shadow-lg shadow-emerald-200 group hover:scale-[1.02] transition-transform">
             <span className="text-[9px] font-black text-emerald-100 uppercase tracking-widest block mb-1">CPP / Prenda</span>
             <p className="text-2xl font-black text-white leading-none">{formatCOP(liquidacionAprobada.cpp ?? 0)}</p>
          </div>
        </div>
      </div>
    )
  }

  const hayDesvios = resumen.comparativo.some(l => Math.abs(l.porcentaje_desvio) > 10)

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden w-full">
      
      {/* Header Unificado & Acciones (Premium Console) */}
      <div className="px-12 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center text-white shadow-2xl shadow-primary-500/40">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Liquidación Técnica OP: {opCodigo}</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-[0.3em]">Consolidado Industrial de Costos, Rentabilidad & Desvíos</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {!hayReporteInsumos && (
            <div className="flex items-center gap-3 text-amber-400 bg-white/5 px-5 py-3 rounded-2xl border border-white/10">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-[11px] font-black uppercase tracking-widest">Falta Reporte Insumos</span>
            </div>
          )}
          <div className="h-12 w-px bg-white/10" />
          <button
            onClick={handleRecalcular}
            disabled={recalculando}
            className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 hover:text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/5"
          >
            <RefreshCw className={cn("w-5 h-5", recalculando && "animate-spin")} />
          </button>
          <button
            onClick={handleAprobar}
            disabled={isPending || !hayReporteInsumos || !bodegaSeleccionada}
            className="px-12 py-4 rounded-2xl bg-emerald-500 text-white text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-10 disabled:grayscale"
          >
            {isPending ? 'Sincronizando...' : 'Aprobar Liquidación'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 divide-x divide-slate-100">
        
        {/* Columna 1: Financiero & CPPs (25%) */}
        <div className="col-span-3 p-10 space-y-10 bg-slate-50/50">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em]">Costo Consolidado</h3>
              <span className="text-lg font-black text-slate-900 tabular-nums">{formatCOP(resumen.costo_total)}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {resumen.cpp_por_producto.map((item, idx) => (
                <div key={idx} className={cn(
                  "p-8 rounded-[2.5rem] shadow-xl border transition-all duration-500 hover:scale-[1.02]",
                  resumen.cpp_por_producto.length === 1 
                    ? "bg-slate-900 text-white border-slate-800" 
                    : "bg-white text-slate-900 border-slate-100 shadow-slate-200/50"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn(
                      "text-[11px] font-black uppercase tracking-[0.2em]",
                      resumen.cpp_por_producto.length === 1 ? "text-slate-500" : "text-slate-400"
                    )}>CPP {item.referencia}</span>
                    <span className={cn(
                      "text-[10px] font-black px-3 py-1 rounded-full",
                      resumen.cpp_por_producto.length === 1 ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"
                    )}>{item.unidades} UDS</span>
                  </div>
                  <p className="text-3xl font-black leading-none tracking-tighter tabular-nums">{formatCOP(item.cpp)}</p>
                  {resumen.cpp_por_producto.length > 1 && (
                    <p className="text-[10px] font-black uppercase mt-4 text-slate-400 truncate tracking-tight">{item.producto_nombre}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 pt-8 border-t border-slate-200">
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Control Operativo</h3>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-100/50 flex items-center justify-between group hover:border-primary-200 transition-all">
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Bodega Destino</span>
                  {editandoBodega ? (
                    <select
                      value={bodegaSeleccionada}
                      onChange={e => setBodegaSeleccionada(e.target.value)}
                      className="bg-transparent text-sm font-black text-slate-900 outline-none w-full appearance-none cursor-pointer"
                    >
                      <option value="">Seleccionar bodega...</option>
                      {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{bodegas.find(b => b.id === bodegaSeleccionada)?.nombre ?? 'Pendiente de asignar'}</p>
                  )}
                </div>
                {!aprobada && (
                  <button 
                    onClick={() => editandoBodega ? handleGuardarBodega() : setEditandoBodega(true)} 
                    className="ml-4 px-4 py-2 rounded-xl bg-slate-50 text-[10px] font-black text-primary-600 uppercase border border-slate-100 hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all shadow-sm"
                  >
                    {editandoBodega ? 'Fijar' : 'Editar'}
                  </button>
                )}
              </div>
              
              {resumen.calidad && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-100/50 grid grid-cols-2 gap-8">
                  <div className="border-r border-slate-100 pr-6">
                    <span className="text-[11px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Segundas</span>
                    <p className="text-xl font-black text-slate-900 tabular-nums">{resumen.calidad.totalSegundas} <span className="text-[11px] text-slate-300 ml-1">UDS</span></p>
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Rechazos</span>
                    <p className="text-xl font-black text-slate-900 tabular-nums">{resumen.calidad.totalRechazadas} <span className="text-[11px] text-slate-300 ml-1">UDS</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna 2: Servicios (35%) */}
        <div className="col-span-4 flex flex-col h-full bg-white">
          <div className="px-10 py-8 bg-slate-50/40 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em]">Servicios Externos</h3>
            <span className="text-sm font-black text-slate-900 tabular-nums">{formatCOP(resumen.costo_servicios)}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {serviciosRef.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 group transition-colors duration-300">
                    <td className="px-10 py-6">
                      <span className="font-black text-primary-600 font-mono text-base block mb-2">{s.referencia}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">{s.nombre_servicio}</span>
                    </td>
                    <td className="px-6 py-6 text-right font-black text-slate-900 text-base tabular-nums">
                      {formatCOP(s.costo_total)}
                    </td>
                    <td className="px-10 py-6 text-right w-14">
                      {!aprobada && (
                        <button onClick={() => handleEliminarServicio(s.id)} className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-100">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!aprobada && (
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <select
                value={nuevaLinea.producto_id}
                onChange={e => setNuevaLinea(p => ({ ...p, producto_id: e.target.value, nombre_servicio: '' }))}
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
              >
                <option value="">Referencia...</option>
                {lineasOP.map(p => <option key={p.producto_id} value={p.producto_id}>{p.referencia}</option>)}
              </select>
              <select
                value={nuevaLinea.nombre_servicio}
                onChange={e => setNuevaLinea(p => ({ ...p, nombre_servicio: e.target.value }))}
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
              >
                <option value="">Servicio...</option>
                {serviciosBOM.filter(s => s.producto_id === nuevaLinea.producto_id).map(s => <option key={s.servicio_nombre} value={s.servicio_nombre}>{s.servicio_nombre}</option>)}
              </select>
              <button 
                onClick={handleAgregarServicio} 
                className="w-12 h-12 rounded-2xl bg-slate-900 text-white hover:bg-primary-600 transition-all flex items-center justify-center shadow-xl shadow-slate-900/20"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>

        {/* Columna 3: Desvíos & Impacto (40%) */}
        <div className="col-span-5 flex flex-col h-full bg-white">
          <div className="px-10 py-8 bg-slate-50/40 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.25em]">Impacto Insumos & Tela</h3>
            <span className="text-sm font-black text-slate-900 tabular-nums">{formatCOP(resumen.costo_tela + resumen.costo_insumos)}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] text-slate-400 font-black uppercase border-b border-slate-50">
                  <th className="px-10 py-4 text-left tracking-[0.15em]">Concepto</th>
                  <th className="px-6 py-4 text-center tracking-[0.15em]">Desvío</th>
                  <th className="px-10 py-4 text-right pr-16 tracking-[0.15em]">Costo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {resumen.comparativo.map((linea, idx) => {
                  const hayDesvio = Math.abs(linea.porcentaje_desvio) > 10
                  return (
                    <tr key={idx} className={cn("hover:bg-slate-50/50 transition-colors duration-300", hayDesvio && "bg-amber-50/20")}>
                      <td className="px-10 py-6">
                        <span className="font-black text-slate-900 text-base block leading-none mb-2">{linea.nombre}</span>
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{linea.unidad}</span>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={cn(
                          "px-4 py-1.5 rounded-xl font-black text-xs tracking-tighter shadow-sm border",
                          linea.diferencia === 0 ? "text-slate-300 bg-slate-50 border-slate-100" :
                          linea.diferencia > 0 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                          {linea.diferencia > 0 ? '+' : ''}{linea.porcentaje_desvio.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right font-black text-slate-900 tabular-nums pr-16 text-lg tracking-tighter">
                        {formatCOP(linea.costo_total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {error && <div className="px-10 py-4 bg-red-50 text-[12px] font-black text-red-600 uppercase text-center border-t border-red-100 animate-pulse">{error}</div>}
    </div>
  )
}

function StatCard({ label, value, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
       <div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
          <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
       </div>
       <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform">
          {icon}
       </div>
    </div>
  )
}

function StatCardSmall({ label, value }: any) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
       <p className="text-base font-black text-slate-900 leading-none">{value}</p>
    </div>
  )
}

function StatCardMini({ label, value }: any) {
  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
       <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">{label}</span>
       <p className="text-sm font-black text-slate-900 tabular-nums leading-none">{value}</p>
    </div>
  )
}
