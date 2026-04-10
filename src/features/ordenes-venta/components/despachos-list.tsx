'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  Truck, Package, CheckCircle2, Clock, ArrowRight, Printer,
  FileText, MapPin, ClipboardList, Search, Filter
} from 'lucide-react'
import { updateEstadoDespachoGlobal, type EstadoDespacho, type DespachoListItem } from '../services/despachos-actions'
import { Badge } from '@/shared/components/ui/badge'
import { formatDate } from '@/shared/lib/utils'

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

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${color}`}>
      <div className="p-3 rounded-xl bg-white/60">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">{label}</p>
      </div>
    </div>
  )
}

export function DespachosList({ despachos }: Props) {
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoDespacho | ''>('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const stats = useMemo(() => ({
    total: despachos.length,
    preparacion: despachos.filter(d => d.estado === 'preparacion').length,
    enviados: despachos.filter(d => d.estado === 'enviado').length,
    entregados: despachos.filter(d => d.estado === 'entregado').length,
  }), [despachos])

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
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={Package} color="border-black/10 bg-neu-50 text-foreground" />
        <StatCard label="En Preparación" value={stats.preparacion} icon={Clock} color="border-amber-200 bg-amber-50 text-amber-700" />
        <StatCard label="Enviados" value={stats.enviados} icon={Truck} color="border-blue-200 bg-blue-50 text-blue-700" />
        <StatCard label="Entregados" value={stats.entregados} icon={CheckCircle2} color="border-green-200 bg-green-50 text-green-700" />
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

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-black/5 py-20 text-center bg-white/50">
          <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">No hay despachos</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(desp => {
            const config = ESTADO_CONFIG[desp.estado]
            const isUpdating = isPending && pendingId === desp.id

            return (
              <div
                key={desp.id}
                className="rounded-2xl bg-white border border-black/5 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-black/[0.015]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center shadow-sm">
                      <Truck className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm font-mono tracking-tight">
                          DESP-{desp.id.slice(0, 8).toUpperCase()}
                        </span>
                        <Badge className={`text-[9px] font-black uppercase border ${config.color} bg-transparent`}>
                          {config.label}
                        </Badge>
                        <Link
                          href={`/ordenes-venta/${desp.ov_id}`}
                          className="text-[10px] font-bold text-primary-600 hover:underline uppercase"
                        >
                          {desp.ov_codigo}
                        </Link>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        {formatDate(desp.fecha_despacho)} · {desp.tipo_envio === 'interno' ? 'Entrega Propia' : 'Flota Externa'}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    {config.next && (
                      <button
                        onClick={() => handleAdvanceEstado(desp)}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? '...' : (
                          <>
                            <ArrowRight className="w-3 h-3" />
                            {config.nextLabel}
                          </>
                        )}
                      </button>
                    )}
                    <Link
                      href={`/ordenes-venta/reportes/packlist/${desp.id}`}
                      target="_blank"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-black/10 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:bg-black/5 transition-colors"
                    >
                      <Printer className="w-3 h-3" />
                      Packlist
                    </Link>
                    <Link
                      href={`/ordenes-venta/reportes/packlist/${desp.id}`}
                      target="_blank"
                      className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Cliente</p>
                    <p className="text-xs font-bold truncate">{desp.cliente_nombre}</p>
                    {desp.cliente_nit && (
                      <p className="text-[10px] text-muted-foreground font-mono">{desp.cliente_nit}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Transporte</p>
                    <p className="text-xs font-bold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary-500" />
                      {desp.transportadora || 'N/A'}
                    </p>
                    {desp.guia_seguimiento && (
                      <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        <ClipboardList className="w-2.5 h-2.5" />
                        {desp.guia_seguimiento}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Bultos / Unidades</p>
                    <p className="text-sm font-black">
                      <span className="text-foreground">{desp.total_bultos}</span>
                      <span className="text-muted-foreground font-medium text-xs"> bultos</span>
                    </p>
                    <p className="text-[10px] text-primary-600 font-bold">{desp.total_unidades} unidades</p>
                  </div>
                  <div className="flex items-end justify-end">
                    <Link
                      href={`/ordenes-venta/${desp.ov_id}`}
                      className="inline-flex items-center gap-1.5 text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-wider group"
                    >
                      Ver OV
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
