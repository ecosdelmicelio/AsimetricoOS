'use client'

import Link from 'next/link'
import {
  Truck, Package, CheckCircle2, Clock, ArrowRight, Printer,
  FileText, MapPin, ClipboardList, Search, Filter, Box,
  ArrowDownCircle, PlayCircle, BarChart3, X, Save, Zap, AlertCircle
} from 'lucide-react'
import { 
  updateEstadoDespachoGlobal, 
  type EstadoDespacho, 
  type DespachoListItem,
  getColaReciboProduccion,
  getColaAlistamientoVentas,
  getBinesDisponiblesRecibo,
  asignarBinesLote,
  reciboRapidoOP
} from '../services/despachos-actions'
import { Badge } from '@/shared/components/ui/badge'
import { cn, formatCurrency, formatDate } from '@/shared/lib/utils'
import { useEffect, useState, useMemo, useTransition } from 'react'

interface Props {
  despachos: DespachoListItem[]
}

const TABS = [
  { id: 'alistamiento', label: 'Alistamiento', icon: PlayCircle,      color: 'text-blue-600',  bg: 'bg-blue-50' },
  { id: 'monitor',      label: 'Monitor',      icon: BarChart3,       color: 'text-slate-600', bg: 'bg-slate-50' },
]

const ESTADO_CONFIG: Record<EstadoDespacho, { label: string; color: string; next?: EstadoDespacho; nextLabel?: string }> = {
  preparacion: {
    label: 'En Preparación',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    next: 'enviado',
    nextLabel: 'Marcar Enviado',
  },
  enviado: {
    label: 'Enviado',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    next: 'entregado',
    nextLabel: 'Marcar Entregado',
  },
  entregado: {
    label: 'Entregado',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
}

function StatCard({ label, value, subtext, icon: Icon, color }: { label: string; value: string | number; subtext?: string; icon: React.ElementType; color: string }) {
  return (
    <div className={cn("rounded-3xl border p-5 flex items-center gap-4 transition-all hover:scale-[1.02]", color)}>
      <div className="p-3.5 rounded-2xl bg-white/60 shadow-sm">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-black tracking-tighter leading-none">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-80">{label}</p>
        {subtext && <p className="text-[9px] font-bold mt-0.5 opacity-60 leading-tight">{subtext}</p>}
      </div>
    </div>
  )
}

export function DespachosList({ despachos }: Props) {
  const [activeTab, setActiveTab] = useState<'alistamiento' | 'monitor'>('monitor')
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoDespacho | ''>('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  
  // Colas de trabajo
  const [colaRecibo, setColaRecibo] = useState<any[]>([])
  const [colaAlistamiento, setColaAlistamiento] = useState<any[]>([])
  const [binesDisponibles, setBinesDisponibles] = useState<any[]>([])
  
  const [opRecibo, setOpRecibo] = useState<any | null>(null)
  const [opReciboRapido, setOpReciboRapido] = useState<any | null>(null)
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMsg])

  useEffect(() => {
    async function loadQueues() {
      const [recibo, alistamiento, bines] = await Promise.all([
        getColaReciboProduccion(),
        getColaAlistamientoVentas(),
        getBinesDisponiblesRecibo()
      ])
      setColaRecibo(recibo)
      setColaAlistamiento(alistamiento)
      setBinesDisponibles(bines)
    }
    loadQueues()
  }, [])

  const stats = useMemo(() => {
    const totalDespachado = despachos.filter(d => d.estado === 'entregado').reduce((s, d) => s + (d.total_valor || 0), 0)
    const totalEnRuta = despachos.filter(d => ['preparacion', 'enviado'].includes(d.estado)).reduce((s, d) => s + (d.total_valor || 0), 0)
    const unidadesEntregadas = despachos.filter(d => d.estado === 'entregado').reduce((s, d) => s + (d.total_unidades || 0), 0)
    const bultosTotales = despachos.filter(d => d.estado !== 'cancelado').reduce((s, d) => s + (d.total_bultos || 0), 0)

    return { totalDespachado, totalEnRuta, unidadesEntregadas, bultosTotales }
  }, [despachos])

  const filtered = useMemo(() => {
    let result = despachos
    if (filtroEstado) {
      result = result.filter(d => d.estado === filtroEstado)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(d =>
        d.ov_codigo.toLowerCase().includes(q) ||
        d.cliente_nombre.toLowerCase().includes(q) ||
        (d.guia_seguimiento?.toLowerCase().includes(q) ?? false) ||
        (d.transportadora?.toLowerCase().includes(q) ?? false)
      )
    }
    return result
  }, [despachos, filtroEstado, search])

  const handleAdvanceEstado = (despacho: DespachoListItem) => {
    const config = ESTADO_CONFIG[despacho.estado]
    if (!config.next) return

    setPendingId(despacho.id)
    startTransition(async () => {
      const res = await updateEstadoDespachoGlobal(despacho.id, config.next!)
      if (res.error) setErrorMsg(res.error)
      setPendingId(null)
    })
  }

  const handleReciboRapido = (op: any) => {
    setOpReciboRapido(op)
  }

  const confirmReciboRapido = async () => {
    if (!opReciboRapido) return
    
    // Generar nombre de bin sugerido: OP + Cliente (compacto)
    const clienteLimpio = opReciboRapido.cliente.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
    const binSugerido = `${opReciboRapido.op_codigo}-${clienteLimpio}`
    
    startTransition(async () => {
      const payload = opReciboRapido.items.map((i: any) => ({ kardex_id: i.id }))
      const res = await reciboRapidoOP(opReciboRapido.op_id, binSugerido, payload)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        const [recibo, alistamiento] = await Promise.all([
          getColaReciboProduccion(),
          getColaAlistamientoVentas()
        ])
        setColaRecibo(recibo)
        setColaAlistamiento(alistamiento)
        setOpReciboRapido(null)
      }
    })
  }

  const handleGuardarRecibo = async () => {
    if (!opRecibo) return
    
    const payload = Object.entries(asignaciones).map(([kardex_id, bin_id]) => ({
      kardex_id,
      bin_id
    })).filter(a => a.bin_id)

    if (payload.length === 0) {
      setErrorMsg('Debes asignar al menos un bin')
      return
    }

    startTransition(async () => {
      const res = await asignarBinesLote(payload)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        // Refresh local
        setOpRecibo(null)
        setAsignaciones({})
        const [recibo, alistamiento] = await Promise.all([
          getColaReciboProduccion(),
          getColaAlistamientoVentas()
        ])
        setColaRecibo(recibo)
        setColaAlistamiento(alistamiento)
      }
    })
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="animate-in fade-in slide-in-from-top-4 fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
          <AlertCircle className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Premium Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-[32px] w-fit border border-slate-200">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-5 py-2.5 rounded-[24px] flex items-center gap-2.5 transition-all duration-300",
                isActive 
                  ? "bg-white shadow-md border border-slate-100 scale-105" 
                  : "hover:bg-slate-200/50 text-slate-400"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                isActive ? tab.bg : "bg-transparent"
              )}>
                <Icon className={cn("w-4 h-4", isActive ? tab.color : "text-slate-400")} />
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isActive ? "text-slate-800" : "text-slate-400"
                )}>
                  {tab.label}
                </span>
                {tab.id === 'recibo' && colaRecibo.length > 0 && (
                  <span className="text-[8px] font-bold text-amber-500 mt-0.5">{colaRecibo.length} PENDIENTES</span>
                )}
                {tab.id === 'alistamiento' && colaAlistamiento.length > 0 && (
                  <span className="text-[8px] font-bold text-blue-500 mt-0.5">{colaAlistamiento.length} ÓRDENES</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {activeTab === 'monitor' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
            <StatCard 
              label="Valor Despachado (Ent)" 
              value={formatCurrency(stats.totalDespachado)} 
              subtext="Capital efectivizado"
              icon={CheckCircle2} 
              color="border-green-200 bg-green-50 text-green-800" 
            />
            <StatCard 
              label="Capital en Ruta" 
              value={formatCurrency(stats.totalEnRuta)} 
              subtext="Prep. o Enviado (Pendiente)"
              icon={Truck} 
              color="border-amber-200 bg-amber-50 text-amber-800" 
            />
            <StatCard 
              label="Unidades Entregadas" 
              value={`${stats.unidadesEntregadas} uds`} 
              subtext="Rendimiento del periodo"
              icon={Package} 
              color="border-blue-200 bg-blue-50 text-blue-800" 
            />
            <StatCard 
              label="Tráfico Logístico" 
              value={`${stats.bultosTotales} bultos`} 
              subtext="Volumen despachado vivo"
              icon={Box} 
              color="border-slate-200 bg-slate-50 text-slate-800" 
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar OV, cliente, guía..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/10 bg-white text-body-sm outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value as EstadoDespacho | '')}
                className="px-3 py-2.5 rounded-xl border border-black/10 bg-white text-body-sm outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="preparacion">En Preparación</option>
                <option value="enviado">Enviado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6 mt-4 animate-in fade-in zoom-in-95">
            {['preparacion', 'enviado', 'entregado', 'cancelado'].map(stateCode => {
              const st = stateCode as EstadoDespacho
              const colConfig = ESTADO_CONFIG[st]
              const items = filtered.filter(d => d.estado === st)
              
              return (
                <div key={st} className="flex flex-col bg-slate-50/50 rounded-[32px] border border-slate-200/60 shadow-sm min-w-0">
                  <div className="p-5 flex items-center justify-between border-b border-slate-200/50">
                    <div className="flex items-center gap-3">
                      <span className={cn("w-3 h-3 rounded-full shadow-inner shrink-0", colConfig.color.split(' ')[0])} />
                      <h3 className="font-black text-slate-700 text-sm tracking-tight truncate">{colConfig.label}</h3>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-xl shrink-0">
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar h-[60vh]">
                    {items.map(desp => {
                      const isUpdating = isPending && pendingId === desp.id
                      const details = desp.despacho_detalle || []
                      const previewNames = [...new Set(details.map((d: any) => d.productos?.nombre || 'Producto'))]
                      const previewStr = previewNames.slice(0, 2).join(' + ') + (previewNames.length > 2 ? '...' : '')
                      
                      return (
                        <div 
                          key={desp.id}
                          className="group rounded-3xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 relative overflow-hidden flex flex-col gap-3"
                        >
                          <div className="flex justify-between items-start">
                            <div className="min-w-0">
                              <span className="font-black text-slate-800 text-sm tracking-tighter truncate block flex items-center gap-1.5">
                                <Truck className={cn("w-4 h-4", st === 'entregado' ? 'text-green-500' : 'text-primary-500')} />
                                DESP-{desp.id.slice(0, 8).toUpperCase()}
                              </span>
                              <p className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider truncate" title={desp.cliente_nombre}>
                                {desp.cliente_nombre}
                              </p>
                            </div>
                            <Link
                              href={`/ordenes-venta/${desp.ov_id}`}
                              className="text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest shrink-0 bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 transition-colors"
                            >
                              {desp.ov_codigo}
                            </Link>
                          </div>

                          <div className="flex items-center gap-1.5 mb-1 -mt-1">
                            <span className="text-xl font-black text-slate-800 tracking-tighter">
                              {formatCurrency(desp.total_valor)}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Valor Venta</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col gap-1">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contenido Real</p>
                               <p className="text-[9px] font-bold text-slate-600 uppercase leading-tight line-clamp-2">
                                 {previewStr || 'Sin detalle de ítems'}
                               </p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Volumen</p>
                               <p className="text-[10px] font-black text-slate-800 leading-none">
                                 {desp.total_bultos} Bultos / {desp.total_unidades} Uds
                               </p>
                            </div>
                          </div>

                          {desp.transportadora && (
                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                              <MapPin className="w-3 h-3 text-primary-500 shrink-0" />
                              <span className="truncate">{desp.transportadora}</span>
                              {desp.guia_seguimiento && (
                                <>
                                  <span className="opacity-50">•</span>
                                  <span className="truncate font-mono text-slate-700">{desp.guia_seguimiento}</span>
                                </>
                              )}
                            </div>
                          )}

                          <div className="mt-1 pt-3 flex items-center justify-between border-t border-slate-100">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/ordenes-venta/reportes/packlist/${desp.id}`}
                                target="_blank"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                title="Imprimir Packlist"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">{formatDate(desp.fecha_despacho).substring(0,6)}</span>
                              {colConfig.next && (
                                <button
                                  onClick={() => handleAdvanceEstado(desp)}
                                  disabled={isUpdating}
                                  className="flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 text-[8px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                                >
                                  {isUpdating ? '...' : (
                                    <>
                                      {colConfig.nextLabel?.split(' ')[1]}
                                      <ArrowRight className="w-2.5 h-2.5" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {items.length === 0 && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200/60 rounded-3xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Sin despachos
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'recibo' && (
        <div className="animate-in fade-in slide-in-from-left-2 p-8 bg-white rounded-[40px] border border-slate-100 shadow-sm min-h-[600px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">Recibo de Producción</h2>
              <p className="text-slate-500 text-sm mt-1">Asigna una ubicación física a los productos terminados que salen del taller.</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
               <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Pendientes de Ubicación</span>
               <span className="text-2xl font-black text-amber-700 tracking-tighter">{colaRecibo.length} OPs</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {colaRecibo.map(op => (
              <div key={op.op_id} className="p-6 rounded-[32px] border border-slate-100 bg-slate-50/50 flex flex-col gap-4 group hover:border-amber-200 hover:bg-white hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-amber-500 rounded-xl text-white">
                        <Box className="w-4 h-4" />
                     </div>
                     <span className="font-black text-lg tracking-tighter text-slate-800">{op.op_codigo}</span>
                   </div>
                   <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-none">{op.items.length} SKUs</Badge>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orden de Venta</p>
                   <p className="text-xs font-bold text-slate-700">{op.ov_codigo} — {op.cliente}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleReciboRapido(op)}
                    className="py-3 rounded-2xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" /> Rápido
                  </button>
                  <button 
                    onClick={() => setOpRecibo(op)}
                    className="py-3 rounded-2xl bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Asignar <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {colaRecibo.length === 0 && (
               <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                  <ArrowDownCircle className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                  <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No hay producción pendiente de recibo</p>
               </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'alistamiento' && (
        <div className="animate-in fade-in slide-in-from-right-2 p-8 bg-white rounded-[40px] border border-slate-100 shadow-sm min-h-[600px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">Alistamiento de Ventas</h2>
              <p className="text-slate-500 text-sm mt-1">Gestiona los despachos de las órdenes que ya tienen stock disponible en bines.</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-right">
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Listas para Despacho</span>
               <span className="text-2xl font-black text-blue-700 tracking-tighter">{colaAlistamiento.length} OVs</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {colaAlistamiento.map(ov => (
              <div key={ov.id} className="p-6 rounded-[32px] border border-slate-100 bg-slate-50/50 flex flex-col gap-4 group hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-blue-600 rounded-xl text-white">
                        <Truck className="w-4 h-4" />
                     </div>
                     <span className="font-black text-lg tracking-tighter text-slate-800">{ov.codigo}</span>
                   </div>
                   <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-none">{ov.items_listos}/{ov.total_items_ov} Listos</Badge>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                   <p className="text-xs font-bold text-slate-700">{ov.cliente}</p>
                   <p className="text-[8px] font-bold text-slate-400 mt-1">{formatDate(ov.fecha)}</p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <Link 
                    href={`/despachos/nuevo?ov_id=${ov.id}`}
                    className="w-full py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                  >
                    Preparar Envío <Package className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
            {colaAlistamiento.length === 0 && (
               <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                  <Package className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                  <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No hay ventas listas para alistamiento</p>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Recibo (Slide-over / Dialog) */}
      {opRecibo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpRecibo(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-800">Recibir {opRecibo.op_codigo}</h3>
                <p className="text-slate-500 text-sm">Asigna el bin físico para cada SKU recibido de producción.</p>
              </div>
              <button onClick={() => setOpRecibo(null)} className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 flex-1 overflow-y-auto max-h-[60vh] space-y-6">
              {opRecibo.items.map((item: any) => (
                <div key={item.kardex_id} className="p-5 rounded-[24px] border border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800 tracking-tight">{item.referencia} — {item.nombre}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{item.color} • Talla {item.talla}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-800 tracking-tighter leading-none">{item.cantidad}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unidades</p>
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors">
                      <MapPin className="w-full h-full" />
                    </div>
                    <select
                      value={asignaciones[item.kardex_id] || ''}
                      onChange={(e) => setAsignaciones(prev => ({ ...prev, [item.kardex_id]: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none"
                    >
                      <option value="">Seleccionar Bin...</option>
                      {binesDisponibles.map(bin => (
                        <option key={bin.id} value={bin.id}>{bin.codigo}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
               <button onClick={() => setOpRecibo(null)} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                 Cancelar
               </button>
               <button 
                 disabled={isPending}
                 onClick={handleGuardarRecibo}
                 className="px-8 py-4 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
               >
                 <Save className="w-4 h-4" /> {isPending ? 'Guardando...' : 'Confirmar Recibo'}
               </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Recibo Rápido (Confirmación Estilizada) */}
      {opReciboRapido && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setOpReciboRapido(null)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl p-10 max-w-md w-full space-y-6 border border-white/20 overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Zap className="w-32 h-32 text-amber-500" />
            </div>
            
            <div className="w-16 h-16 rounded-[24px] bg-amber-50 flex items-center justify-center relative">
              <Zap className="w-8 h-8 text-amber-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Recibo Rápido</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">OP: {opReciboRapido.op_codigo}</p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-amber-500" />
                 <p className="text-[11px] font-bold text-slate-600">Se creará el bin: <span className="font-black text-slate-900">
                   {opReciboRapido.op_codigo}-{opReciboRapido.cliente.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}
                 </span></p>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-amber-500" />
                 <p className="text-[11px] font-bold text-slate-600">Se asignarán <span className="font-black text-slate-900">{opReciboRapido.items.length} SKUs</span> automáticamente.</p>
               </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setOpReciboRapido(null)}
                disabled={isPending}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReciboRapido}
                disabled={isPending}
                className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
              >
                {isPending ? 'Procesando...' : 'Confirmar Recibo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
