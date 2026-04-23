'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, AlertTriangle, CheckCircle2, RefreshCw, Plus, Trash2, RotateCcw, Warehouse } from 'lucide-react'
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

  // Sincronizar bodegaSeleccionada cuando bodegaDestinoId cambia (por refresco del servidor)
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

  // Si ya está aprobada, mostrar resumen read-only
  if (aprobada && liquidacionAprobada) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-green-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-green-700 text-body-md">Liquidación Aprobada</h2>
          </div>
          {!confirmarAnulacion ? (
            <button
              onClick={() => setConfirmarAnulacion(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Anular liquidación
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-700 font-medium">¿Confirmar anulación?</span>
              <button
                onClick={handleAnular}
                disabled={anulando}
                className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {anulando ? 'Anulando...' : 'Sí, anular'}
              </button>
              <button
                onClick={() => setConfirmarAnulacion(false)}
                disabled={anulando}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
        {anulacionError && (
          <div className="mx-5 mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-body-sm">
            {anulacionError}
          </div>
        )}
        <div className="p-5 grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-green-100 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Costo Total</p>
            <p className="font-bold text-foreground text-body-md">{formatCOP(liquidacionAprobada.costo_total)}</p>
          </div>
          <div className="rounded-xl bg-white border border-green-100 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Unidades</p>
            <p className="font-bold text-foreground text-body-md">{liquidacionAprobada.cantidad_entregada} uds</p>
          </div>
          <div className="rounded-xl bg-green-100 border border-green-200 p-4 text-center">
            <p className="text-xs text-green-700 mb-1">CPP / prenda</p>
            <p className="font-bold text-green-700 text-body-md">{formatCOP(liquidacionAprobada.cpp ?? 0)}</p>
          </div>
        </div>
      </div>
    )
  }

  const hayDesvios = resumen.comparativo.some(l => Math.abs(l.porcentaje_desvio) > 10)

  return (
    <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground text-body-md">Liquidación de Costos</h2>
        </div>
        <button
          onClick={handleRecalcular}
          disabled={recalculando}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculando ? 'animate-spin' : ''}`} />
          Recalcular
        </button>
      </div>

      <div className="p-5 space-y-5">

        {/* Selector bodega destino — obligatorio antes de aprobar */}
        {!aprobada && (
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-blue-600" />
                <p className="font-semibold text-blue-700 text-body-sm">Bodega de Destino</p>
              </div>
              {bodegaSeleccionada && !editandoBodega && (
                <button
                  onClick={() => setEditandoBodega(true)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Cambiar
                </button>
              )}
            </div>
            {bodegaSeleccionada && !editandoBodega ? (
              <div className="flex items-center justify-between">
                <p className="text-body-sm text-blue-700 font-medium">
                  {bodegas.find(b => b.id === bodegaSeleccionada)?.nombre ?? 'Bodega'}
                </p>
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">✓ Configurada</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-body-sm text-blue-600">
                  Selecciona dónde ingresarán los productos terminados.
                </p>
                <div className="flex gap-2">
                  <select
                    value={bodegaSeleccionada}
                    onChange={e => setBodegaSeleccionada(e.target.value)}
                    className="flex-1 rounded-xl bg-white border border-blue-200 px-3 py-2 text-body-sm text-foreground outline-none"
                  >
                    <option value="">Selecciona una bodega...</option>
                    {bodegas.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleGuardarBodega}
                    disabled={!bodegaSeleccionada || guardandoBodega}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-body-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {guardandoBodega ? 'Guardando...' : 'Guardar'}
                  </button>
                  {editandoBodega && bodegaDestinoId && (
                    <button
                      onClick={() => setEditandoBodega(false)}
                      className="px-3 py-2 rounded-xl bg-blue-100 text-blue-600 text-body-sm hover:bg-blue-200 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
                {bodegaError && <p className="text-xs text-red-600">{bodegaError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Resumen de costos */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-neu-base shadow-neu-inset p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Tela</p>
            <p className="font-semibold text-foreground text-body-sm">{formatCOP(resumen.costo_tela)}</p>
          </div>
          <div className="rounded-xl bg-neu-base shadow-neu-inset p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Insumos</p>
            <p className="font-semibold text-foreground text-body-sm">{formatCOP(resumen.costo_insumos)}</p>
          </div>
          <div className="rounded-xl bg-neu-base shadow-neu-inset p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Servicios</p>
            <p className="font-semibold text-foreground text-body-sm">{formatCOP(resumen.costo_servicios)}</p>
          </div>
          <div className="rounded-xl bg-primary-50 border border-primary-100 p-3 text-center">
            <p className="text-xs text-primary-600 mb-1">CPP / prenda</p>
            <p className="font-bold text-primary-700 text-body-md">{formatCOP(resumen.cpp)}</p>
          </div>
        </div>

        {/* Resumen de Calidad y Mermas */}
        {resumen.calidad && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-600" />
                <p className="font-semibold text-slate-700 text-body-sm">Calidad y Mermas</p>
              </div>
              <span className="text-[10px] font-black uppercase text-slate-500 bg-white border border-slate-100 px-3 py-1 rounded-full">
                Merma Tolerada: {resumen.calidad.mermaToleradaPct}%
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Segundas</p>
                <p className="text-lg font-black text-slate-900 tabular-nums">{resumen.calidad.totalSegundas}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Rechazos</p>
                <p className="text-lg font-black text-slate-900 tabular-nums">{resumen.calidad.totalRechazadas}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tolerancia</p>
                <p className="text-lg font-black text-slate-500 tabular-nums">{Math.round(resumen.calidad.toleranciaUnidades)} uds</p>
              </div>
              <div className={cn(
                "p-3 rounded-xl border text-center",
                resumen.calidad.excesoMermas > 0 ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"
              )}>
                <p className={cn(
                  "text-[10px] font-black uppercase mb-1",
                  resumen.calidad.excesoMermas > 0 ? "text-rose-600" : "text-emerald-600"
                )}>Exceso</p>
                <p className={cn(
                  "text-lg font-black tabular-nums",
                  resumen.calidad.excesoMermas > 0 ? "text-rose-700" : "text-emerald-700"
                )}>{Math.round(resumen.calidad.excesoMermas)} uds</p>
              </div>
            </div>

            {resumen.calidad.excesoMermas > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center justify-between">
                <p className="text-xs text-rose-700 font-medium">
                  Impacto financiero estimado del exceso:
                </p>
                <p className="text-sm font-black text-rose-700">
                  {formatCOP(resumen.calidad.impactoFinanciero)}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-body-sm">
          <span className="text-muted-foreground">Costo total: <span className="font-semibold text-foreground">{formatCOP(resumen.costo_total)}</span></span>
          <span className="text-muted-foreground">{resumen.cantidad_entregada} uds entregadas</span>
        </div>

        {/* Servicios por Referencia */}
        <div className="space-y-2">
          <h3 className="text-body-sm font-semibold text-foreground">Servicios por Referencia</h3>
          {serviciosRef.length > 0 && (
            <div className="rounded-xl bg-neu-base shadow-neu-inset overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Referencia</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Servicio</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Cant.</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Tarifa</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {serviciosRef.map(s => (
                    <tr key={s.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-2 font-mono font-medium text-primary-700">{s.referencia}</td>
                      <td className="px-3 py-2 text-foreground">{s.nombre_servicio}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{s.cantidad}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatCOP(s.tarifa_unitaria)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-foreground">{formatCOP(s.costo_total)}</td>
                      <td className="px-2 py-2">
                        <button onClick={() => handleEliminarServicio(s.id)} disabled={srvPending} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Agregar nueva línea */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-32">
              <select
                value={nuevaLinea.producto_id}
                onChange={e => setNuevaLinea(p => ({ ...p, producto_id: e.target.value, nombre_servicio: '' }))}
                className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2 text-xs text-foreground outline-none"
              >
                <option value="">Referencia...</option>
                {lineasOP.map(p => (
                  <option key={p.producto_id} value={p.producto_id}>{p.referencia} – {p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-32">
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
                className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2 text-xs text-foreground outline-none disabled:opacity-50"
              >
                <option value="">Servicio...</option>
                {serviciosBOM
                  .filter(s => s.producto_id === nuevaLinea.producto_id)
                  .map(s => (
                    <option key={s.servicio_nombre} value={s.servicio_nombre}>{s.servicio_nombre}</option>
                  ))}
              </select>
            </div>
            <div className="w-24">
              <input
                type="number"
                placeholder="Cant."
                readOnly
                value={nuevaLinea.cantidad}
                className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2 text-xs text-muted-foreground outline-none cursor-default"
              />
            </div>
            <div className="w-28">
              <input
                type="number"
                placeholder="Tarifa unitaria"
                value={nuevaLinea.tarifa_unitaria}
                onChange={e => setNuevaLinea(p => ({ ...p, tarifa_unitaria: e.target.value }))}
                className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={handleAgregarServicio}
              disabled={srvPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 text-xs font-semibold transition-all active:shadow-neu-inset disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>
          {srvError && <p className="text-xs text-red-600">{srvError}</p>}
        </div>

        {/* CPP por Referencia */}
        {resumen.cpp_por_producto.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-body-sm font-semibold text-foreground">CPP por Referencia</h3>
            <div className="overflow-x-auto rounded-xl bg-neu-base shadow-neu-inset">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Referencia</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Uds</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Tela</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Insumos</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Servicios</th>
                    <th className="text-right px-4 py-2.5 font-medium text-primary-600">CPP</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.cpp_por_producto.map(p => (
                    <tr key={p.producto_id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground font-mono">{p.referencia}</p>
                        <p className="text-muted-foreground">{p.producto_nombre}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{p.unidades}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{formatCOP(p.costo_tela)}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{formatCOP(p.costo_insumos)}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{formatCOP(p.costo_servicios)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-primary-700">{formatCOP(p.cpp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Comparativo BOM vs Real */}
        {resumen.comparativo.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-body-sm font-semibold text-foreground">Comparativo BOM vs Real</h3>
              {hayDesvios && (
                <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  Hay desvíos &gt;10%
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl bg-neu-base shadow-neu-inset">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                    <th className="text-xs px-2 py-2.5 text-center font-medium text-muted-foreground">Tipo</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-20">BOM teórico</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-20">Real</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-20">Dif.</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground min-w-28">Costo total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.comparativo.map((linea, idx) => {
                    const hayDesvio = Math.abs(linea.porcentaje_desvio) > 10
                    return (
                      <tr key={idx} className={`border-b border-black/5 last:border-0 ${hayDesvio ? 'bg-yellow-50/50' : ''}`}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{linea.nombre}</p>
                          <p className="text-muted-foreground">{linea.unidad}</p>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            linea.tipo === 'tela' ? 'bg-blue-100 text-blue-700' :
                            linea.tipo === 'insumo' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {linea.tipo === 'tela' ? 'Tela' : linea.tipo === 'insumo' ? 'Insumo' : 'Servicio'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground">
                          {linea.teorico.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium text-foreground">
                          {linea.real.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {linea.diferencia !== 0 && (
                            <span className={`font-semibold ${hayDesvio ? 'text-yellow-700' : linea.diferencia > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {linea.diferencia > 0 ? '+' : ''}{linea.diferencia.toFixed(2)}
                              <span className="text-xs ml-1">({linea.porcentaje_desvio > 0 ? '+' : ''}{linea.porcentaje_desvio.toFixed(1)}%)</span>
                            </span>
                          )}
                          {linea.diferencia === 0 && <span className="text-green-500">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                          {formatCOP(linea.costo_total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-black/10 bg-gray-50">
                    <td colSpan={5} className="px-4 py-2.5 font-semibold text-foreground text-right">Total</td>
                    <td className="px-4 py-2.5 text-right font-bold text-foreground">{formatCOP(resumen.costo_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Alerta si no hay reporte de insumos */}
        {!hayReporteInsumos && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-body-sm text-yellow-700">
              Debes guardar el <strong>Reporte de Insumos</strong> antes de aprobar la liquidación.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-body-sm">
            {error}
          </div>
        )}

        {/* Botón aprobar */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleAprobar}
            disabled={isPending || !hayReporteInsumos}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-bold text-body-sm transition-all hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPending ? 'Aprobando...' : 'Aprobar Liquidación'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-right -mt-2">
          Al aprobar se descargará el inventario de la bodega del taller y la OP pasará a Liquidada.
        </p>
      </div>
    </div>
  )
}
