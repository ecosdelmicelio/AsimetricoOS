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
    <div className="space-y-8">
      
      {/* 1. Encabezado y Resumen Crítico */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Liquidación de Costos</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Consolidado final de producción</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalcular}
              disabled={recalculando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", recalculando && "animate-spin")} />
              {recalculando ? 'Calculando...' : 'Recalcular'}
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCardSmall label="Costo Tela" value={formatCOP(resumen.costo_tela)} />
            <StatCardSmall label="Costo Insumos" value={formatCOP(resumen.costo_insumos)} />
            <StatCardSmall label="Costo Servicios" value={formatCOP(resumen.costo_servicios)} />
            <div className="bg-primary-600 rounded-[2rem] p-6 shadow-lg shadow-primary-200">
              <span className="text-[9px] font-black text-primary-100 uppercase tracking-widest block mb-1">CPP Final</span>
              <p className="text-2xl font-black text-white leading-none">{formatCOP(resumen.cpp)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Configuración Operativa (Bodega y Calidad) */}
      <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bodega */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Warehouse className="w-4 h-4 text-primary-500" />
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Configuración de Ingreso</h3>
            </div>
            
            {!editandoBodega ? (
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bodega de Destino</span>
                  <p className="text-sm font-black text-slate-900 uppercase">{bodegas.find(b => b.id === bodegaSeleccionada)?.nombre ?? 'No seleccionada'}</p>
                </div>
                {!aprobada && (
                  <button onClick={() => setEditandoBodega(true)} className="px-4 py-2 rounded-xl bg-slate-50 text-[9px] font-black text-primary-600 uppercase tracking-widest border border-slate-100 hover:bg-white transition-all">
                    Cambiar
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <select
                  value={bodegaSeleccionada}
                  onChange={e => setBodegaSeleccionada(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Seleccionar bodega...</option>
                  {bodegas.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
                <button
                  onClick={handleGuardarBodega}
                  disabled={!bodegaSeleccionada || guardandoBodega}
                  className="px-6 py-3 rounded-2xl bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary-200 disabled:opacity-50"
                >
                  {guardandoBodega ? '...' : 'Fijar'}
                </button>
              </div>
            )}
            {bodegaError && <p className="text-[9px] text-red-500 font-bold uppercase ml-2">{bodegaError}</p>}
          </div>

          {/* Calidad */}
          {resumen.calidad && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Balance de Calidad</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                   <span className="text-[9px] font-black text-slate-400 uppercase">Segundas</span>
                   <span className="text-lg font-black text-slate-900 tabular-nums">{resumen.calidad.totalSegundas}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                   <span className="text-[9px] font-black text-slate-400 uppercase">Rechazos</span>
                   <span className="text-lg font-black text-slate-900 tabular-nums">{resumen.calidad.totalRechazadas}</span>
                </div>
              </div>

              {resumen.calidad.excesoMermas > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-3xl p-4 flex items-center justify-between">
                  <span className="text-[9px] font-black text-red-600 uppercase">Exceso de Mermas</span>
                  <p className="text-sm font-black text-red-700">{Math.round(resumen.calidad.excesoMermas)} uds ({formatCOP(resumen.calidad.impactoFinanciero)})</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Detalle de Servicios */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicios Externos Registrados</h3>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Referencia</th>
                <th className="text-left px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Servicio</th>
                <th className="text-right px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                <th className="px-8 py-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {serviciosRef.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-primary-600 font-mono">{s.referencia}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1.5">{s.producto_nombre}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs font-bold text-slate-700">{s.nombre_servicio}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1.5">{s.cantidad} x {formatCOP(s.tarifa_unitaria)}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-black text-slate-900">{formatCOP(s.costo_total)}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {!aprobada && (
                      <button 
                        onClick={() => handleEliminarServicio(s.id)} 
                        disabled={srvPending}
                        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!aprobada && (
                <tr className="bg-slate-50/30">
                  <td colSpan={4} className="p-4">
                    <div className="flex gap-3 items-end">
                      <select
                        value={nuevaLinea.producto_id}
                        onChange={e => setNuevaLinea(p => ({ ...p, producto_id: e.target.value, nombre_servicio: '' }))}
                        className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      >
                        <option value="">Ref...</option>
                        {lineasOP.map(p => (
                          <option key={p.producto_id} value={p.producto_id}>{p.referencia}</option>
                        ))}
                      </select>
                      <select
                        value={nuevaLinea.nombre_servicio}
                        onChange={e => {
                          const nombre = e.target.value
                          const bomEntry = serviciosBOM.find(s => s.producto_id === nuevaLinea.producto_id && s.servicio_nombre === nombre)
                          const producto = lineasOP.find(p => p.producto_id === nuevaLinea.producto_id)
                          const cantidadAuto = bomEntry && producto ? String(bomEntry.cantidad_bom * producto.unidades) : ''
                          setNuevaLinea(p => ({ ...p, nombre_servicio: nombre, cantidad: cantidadAuto }))
                        }}
                        disabled={!nuevaLinea.producto_id}
                        className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      >
                        <option value="">Servicio...</option>
                        {serviciosBOM
                          .filter(s => s.producto_id === nuevaLinea.producto_id)
                          .map(s => (
                            <option key={s.servicio_nombre} value={s.servicio_nombre}>{s.servicio_nombre}</option>
                          ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Tarifa"
                        value={nuevaLinea.tarifa_unitaria}
                        onChange={e => setNuevaLinea(p => ({ ...p, tarifa_unitaria: e.target.value }))}
                        className="w-32 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      />
                      <button
                        onClick={handleAgregarServicio}
                        disabled={srvPending}
                        className="px-6 py-2 rounded-xl bg-primary-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary-200"
                      >
                        Agregar
                      </button>
                    </div>
                    {srvError && <p className="text-[9px] text-red-500 font-bold uppercase mt-2 ml-2">{srvError}</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Comparativo BOM vs Real */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Análisis de Desvíos (BOM vs Real)</h3>
          {hayDesvios && (
            <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-widest">
              Desvíos Críticos
            </span>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Insumo</th>
                <th className="text-center px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">BOM</th>
                <th className="text-center px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Real</th>
                <th className="text-center px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Diferencia</th>
                <th className="text-right px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {resumen.comparativo.map((linea, idx) => {
                const hayDesvio = Math.abs(linea.porcentaje_desvio) > 10
                return (
                  <tr key={idx} className={cn("group transition-colors", hayDesvio && "bg-amber-50/10")}>
                    <td className="px-8 py-4">
                      <p className="font-black text-slate-900 text-sm leading-none">{linea.nombre}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{linea.unidad} • {linea.tipo.toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-4 text-center tabular-nums text-slate-500 font-bold">{linea.teorico.toFixed(2)}</td>
                    <td className="px-4 py-4 text-center font-black text-slate-900 tabular-nums">{linea.real.toFixed(2)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg",
                        linea.diferencia === 0 ? "text-slate-300" :
                        linea.diferencia > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {linea.diferencia > 0 ? '+' : ''}{linea.porcentaje_desvio.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right font-black text-slate-900">{formatCOP(linea.costo_total)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-slate-900">
               <tr>
                  <td colSpan={4} className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Costo Consolidado de Producción</td>
                  <td className="px-8 py-6 text-right font-black text-white text-xl">{formatCOP(resumen.costo_total)}</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Acción Final */}
      {!aprobada && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-10 flex flex-col items-center gap-6 text-center">
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Cierre de Liquidación</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Asegúrate de haber revisado todos los desvíos y servicios registrados</p>
          </div>

          {!hayReporteInsumos && (
            <div className="bg-amber-50 border border-amber-100 px-6 py-3 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Reporte de insumos pendiente</span>
            </div>
          )}

          <button
            onClick={handleAprobar}
            disabled={isPending || !hayReporteInsumos || !bodegaSeleccionada}
            className="w-full max-w-md py-5 rounded-3xl bg-emerald-600 text-white text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
          >
            {isPending ? 'Procesando Cierre...' : 'Aprobar Liquidación Final'}
          </button>
          
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] max-w-xs">
            Esta acción regularizará inventarios y cerrará la orden de producción permanentemente.
          </p>
          
          {error && <p className="text-[10px] text-red-600 font-black uppercase">{error}</p>}
        </div>
      )}
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
