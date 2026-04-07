'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import Link from 'next/link'
import type { EntregaConDetalle } from '@/features/entregas/types'
import { resolverFRI } from '@/features/entregas/services/entregas-actions'
import { EntregaForm, type LineaOPSimple } from './entrega-form'
import { formatDate, sortTallas } from '@/shared/lib/utils'

const ESTADO_CONFIG = {
  recibida:      { label: 'Recibida',      classes: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  en_inspeccion: { label: 'En Inspección', classes: 'bg-blue-50 text-blue-700 border-blue-100' },
  aceptada:      { label: 'Aceptada',      classes: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  rechazada:     { label: 'Rechazada',     classes: 'bg-red-50 text-red-700 border-red-100' },
}


interface Props {
  opId: string
  opCodigo: string
  estadoActual: string
  entregas: EntregaConDetalle[]
  lineasOP: LineaOPSimple[]
  totalUnidadesOP: number
  liquidacionesPorEntrega: Record<string, string>  // entregaId → liquidacionId
  puedeEntregar?: boolean
  isEditing?: boolean
  onStartEdit?: () => void
  onEditComplete?: () => void
}

const ESTADOS_ACTIVOS = ['en_terminado', 'entregada', 'liquidada']

export function EntregasPanel({ 
  opId, 
  opCodigo, 
  estadoActual, 
  entregas, 
  lineasOP, 
  totalUnidadesOP, 
  liquidacionesPorEntrega,
  puedeEntregar = true,
  isEditing = false,
  onStartEdit,
  onEditComplete
}: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [friPending, startFriTransition] = useTransition()
  const [friLoading, setFriLoading] = useState<string | null>(null)

  if (!ESTADOS_ACTIVOS.includes(estadoActual) && entregas.length === 0) {
    return null
  }

  // Calcular unidades aceptadas
  const unidadesAceptadas = entregas
    .filter(e => e.estado === 'aceptada')
    .reduce((s, e) => s + e.entrega_detalle.reduce((ss, d) => ss + d.cantidad_entregada, 0), 0)

  const progresoPct = totalUnidadesOP > 0 ? Math.min(100, Math.round((unidadesAceptadas / totalUnidadesOP) * 100)) : 0

  // Total entregado (sin rechazadas) — si llega al tope de la OP, no se puede crear nueva entrega
  const totalUnidadesEntregadas = entregas
    .filter(e => e.estado !== 'rechazada')
    .reduce((s, e) => s + e.entrega_detalle.reduce((ss, d) => ss + d.cantidad_entregada, 0), 0)
  const ordenCompleta = totalUnidadesOP > 0 && totalUnidadesEntregadas >= totalUnidadesOP

  function handleFRI(entregaId: string, resultado: 'aceptada' | 'rechazada') {
    setFriLoading(entregaId)
    startFriTransition(async () => {
      await resolverFRI(entregaId, opId, resultado)
      setFriLoading(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground text-body-md">Entregas</h2>
        </div>
        {puedeEntregar && (estadoActual === 'en_terminado' || estadoActual === 'entregada') && !isEditing && (
          <button
            onClick={() => !ordenCompleta && onStartEdit?.()}
            disabled={ordenCompleta}
            title={ordenCompleta ? 'La orden ya fue entregada en su totalidad' : undefined}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest transition-all hover:bg-primary-600 shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <Plus className="w-4 h-4" />
            Nueva Entrega
          </button>
        )}
      </div>

      {/* Formulario nueva entrega OVERLAY */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-14 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            onClick={() => onEditComplete?.()}
          />
          <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-white rounded-[2.5rem] overflow-hidden flex flex-col border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] scale-in-center">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shadow-inner">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 leading-none">Registrar Nueva Entrega</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Orden de Producción: {opCodigo}</p>
                </div>
              </div>
              <button 
                onClick={() => onEditComplete?.()}
                className="w-11 h-11 rounded-2xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all hover:rotate-90 hover:text-red-500"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-slate-50/30">
              <div className="bg-white rounded-[2rem] border border-slate-100 p-8 lg:p-10 shadow-sm">
                <EntregaForm
                  opId={opId}
                  lineasOP={lineasOP}
                  onSuccess={() => { onEditComplete?.(); router.refresh() }}
                  onCancel={() => onEditComplete?.()}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de entregas */}
      {entregas.length === 0 && !showForm && (
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aún no hay entregas registradas.</p>
        </div>
      )}

      {entregas.map(entrega => {
        const config = ESTADO_CONFIG[entrega.estado] ?? ESTADO_CONFIG.recibida
        const totalEntregado = entrega.entrega_detalle.reduce((s, d) => s + d.cantidad_entregada, 0)
        const isFriPending = friPending && friLoading === entrega.id

        // Construir matriz: filas = referencia, columnas = tallas (ordenadas)
        const tallasEntrega = sortTallas([...new Set(entrega.entrega_detalle.map(d => d.talla))])
        const filaMap = new Map<string, { ref: string; nombre: string; cantidades: Record<string, number> }>()
        for (const d of entrega.entrega_detalle) {
          const ref = d.productos?.referencia ?? '—'
          const nombre = d.productos?.nombre ?? ''
          const key = ref
          if (!filaMap.has(key)) filaMap.set(key, { ref, nombre, cantidades: {} })
          filaMap.get(key)!.cantidades[d.talla] = (filaMap.get(key)!.cantidades[d.talla] ?? 0) + d.cantidad_entregada
        }

        return (
          <div key={entrega.id} className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
            {/* Cabecera entrega */}
            <div className="flex items-center gap-3 p-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm flex-shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                    Entrega #{entrega.numero_entrega}
                  </p>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${config.classes}`}>
                    {config.label.toUpperCase()}
                  </span>
                  {entrega.bin_codigo && (
                    <span className="text-[8px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full border border-primary-100 font-mono">
                      {entrega.bin_codigo}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  {formatDate(entrega.fecha_entrega)}
                  {entrega.notas && <span className="normal-case font-normal"> • {entrega.notas}</span>}
                </p>
              </div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter flex-shrink-0">
                {totalEntregado} uds
              </p>
            </div>

            {/* Matriz color × talla */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-3 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Referencia</th>
                    {tallasEntrega.map(t => (
                      <th key={t} className="text-center px-2 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest min-w-8">{t}</th>
                    ))}
                    <th className="text-right px-3 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(filaMap.entries()).map(([key, fila]) => {
                    const totalFila = tallasEntrega.reduce((s, t) => s + (fila.cantidades[t] ?? 0), 0)
                    return (
                      <tr key={key} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2">
                          <p className="font-mono font-black text-primary-700 text-[9px] uppercase">{fila.ref}</p>
                          {fila.nombre && <p className="text-slate-400 text-[8px] font-bold uppercase tracking-tight leading-tight">{fila.nombre}</p>}
                        </td>
                        {tallasEntrega.map(t => (
                          <td key={t} className="px-2 py-2 text-center">
                            {fila.cantidades[t]
                              ? <span className="text-[9px] font-black text-slate-900">{fila.cantidades[t]}</span>
                              : <span className="text-slate-200 text-[9px]">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right text-[9px] font-black text-slate-900">{totalFila}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Botones FRI — solo para entregas recibidas y si OP en_entregas */}
            {entrega.estado === 'recibida' && ['en_terminado', 'entregada'].includes(estadoActual) && (
              <div className="px-3 py-2.5 border-t border-slate-100 flex items-center gap-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-auto">FRI</p>
                <button
                  onClick={() => handleFRI(entrega.id, 'rechazada')}
                  disabled={isFriPending}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-red-500 hover:border-red-200 hover:bg-red-50 text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                >
                  <XCircle className="w-3 h-3" />
                  Rechazar
                </button>
                <button
                  onClick={() => handleFRI(entrega.id, 'aceptada')}
                  disabled={isFriPending}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-green-600 hover:border-green-200 hover:bg-green-50 text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                >
                  <CheckCircle className="w-3 h-3" />
                  {isFriPending ? 'Procesando...' : 'Aceptar FRI'}
                </button>
              </div>
            )}

            {/* Liquidación — solo si ya existe */}
            {entrega.estado === 'aceptada' && liquidacionesPorEntrega[entrega.id] && (
              <div className="px-3 py-2.5 border-t border-slate-100 flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-slate-400" />
                <Link
                  href={`/liquidacion/${liquidacionesPorEntrega[entrega.id]}`}
                  className="text-[8px] font-black text-primary-600 hover:text-primary-800 uppercase tracking-widest transition-colors"
                >
                  Ver Liquidación →
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
