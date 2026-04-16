'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  Truck, Package, CheckCircle2, Clock, ArrowRight, Printer,
  FileText, MapPin, ClipboardList, Search, Filter, Box
} from 'lucide-react'
import { updateEstadoDespachoGlobal, type EstadoDespacho, type DespachoListItem } from '../services/despachos-actions'
import { Badge } from '@/shared/components/ui/badge'
import { formatCurrency, formatDate } from '@/shared/lib/utils'

interface Props {
  despachos: DespachoListItem[]
}

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
    <div className={`rounded-3xl border p-5 flex items-center gap-4 ${color}`}>
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
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoDespacho | ''>('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
      if (res.error) alert(res.error)
      setPendingId(null)
    })
  }

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Filtros */}
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
        <span className="text-body-xs text-muted-foreground ml-auto">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6 mt-4">
        {['preparacion', 'enviado', 'entregado', 'cancelado'].map(stateCode => {
          const st = stateCode as EstadoDespacho
          const colConfig = ESTADO_CONFIG[st]
          const items = filtered.filter(d => d.estado === st)
          
          return (
            <div key={st} className="flex flex-col bg-slate-50/50 rounded-[32px] border border-slate-200/60 shadow-sm min-w-0">
              {/* Header Columna */}
              <div className="p-5 flex items-center justify-between border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full shadow-inner shrink-0 ${colConfig.color.split(' ')[0]}`} />
                  <h3 className="font-black text-slate-700 text-sm tracking-tight truncate">{colConfig.label}</h3>
                </div>
                <span className="text-[10px] font-black text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-xl shrink-0">
                  {items.length}
                </span>
              </div>

              {/* Contenedor de Fichas */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar h-[60vh]">
                {items.map(desp => {
                  const isUpdating = isPending && pendingId === desp.id
                  
                  // Calcular abstract del detalle para mostrar la realidad
                  const details = desp.despacho_detalle || []
                  const previewNames = [...new Set(details.map((d: any) => d.productos?.nombre || 'Producto'))]
                  const previewStr = previewNames.slice(0, 2).join(' + ') + (previewNames.length > 2 ? '...' : '')
                  
                  return (
                    <div 
                      key={desp.id}
                      className="group rounded-3xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 relative overflow-hidden flex flex-col gap-3"
                    >
                      {/* Ficha Header */}
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <span className="font-black text-slate-800 text-sm tracking-tighter truncate block flex items-center gap-1.5">
                            <Truck className={`w-4 h-4 ${st === 'entregado' ? 'text-green-500' : 'text-primary-500'}`} />
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

                      {/* Logística Preview */}
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

                      {/* Guía & Track */}
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

                      {/* Config/Acciones Bottom */}
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
                              title={colConfig.nextLabel}
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
    </div>
  )
}
