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
  recibida:      { label: 'Recibida',      classes: 'bg-yellow-100 text-yellow-700' },
  en_inspeccion: { label: 'En Inspección', classes: 'bg-blue-100 text-blue-700' },
  aceptada:      { label: 'Aceptada ✓',   classes: 'bg-green-100 text-green-700' },
  rechazada:     { label: 'Rechazada ✗',  classes: 'bg-red-100 text-red-700' },
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
            onClick={() => onStartEdit?.()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest transition-all hover:bg-primary-600 shadow-lg shadow-slate-200 active:scale-95"
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
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 text-center">
          <p className="text-muted-foreground text-body-sm">Aún no hay entregas registradas.</p>
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
          <div key={entrega.id} className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
            {/* Cabecera entrega */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <div>
                <p className="font-semibold text-foreground text-body-sm">
                  Entrega #{entrega.numero_entrega}
                  <span className="text-muted-foreground font-normal ml-2">{formatDate(entrega.fecha_entrega)}</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {entrega.bin_codigo && (
                    <span className="text-xs font-mono text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                      {entrega.bin_codigo}
                    </span>
                  )}
                  {entrega.notas && (
                    <p className="text-xs text-muted-foreground">{entrega.notas}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-body-sm font-semibold text-foreground">{totalEntregado} uds</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.classes}`}>
                  {config.label}
                </span>
              </div>
            </div>

            {/* Matriz color × talla */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Referencia</th>
                    {tallasEntrega.map(t => (
                      <th key={t} className="text-center px-2 py-2 font-medium text-muted-foreground min-w-10">{t}</th>
                    ))}
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(filaMap.entries()).map(([key, fila]) => {
                    const totalFila = tallasEntrega.reduce((s, t) => s + (fila.cantidades[t] ?? 0), 0)
                    return (
                      <tr key={key} className="border-b border-black/5 last:border-0">
                        <td className="px-4 py-2">
                          <p className="font-mono font-semibold text-primary-700 text-xs">{fila.ref}</p>
                          {fila.nombre && <p className="text-muted-foreground text-[11px] leading-tight">{fila.nombre}</p>}
                        </td>
                        {tallasEntrega.map(t => (
                          <td key={t} className="px-2 py-2 text-center text-foreground">
                            {fila.cantidades[t] ? <span className="font-semibold">{fila.cantidades[t]}</span> : <span className="text-muted-foreground/30">—</span>}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right font-semibold text-foreground">{totalFila}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Botones FRI — solo para entregas recibidas y si OP en_entregas */}
            {entrega.estado === 'recibida' && ['en_terminado', 'entregada'].includes(estadoActual) && (
              <div className="px-5 py-3 border-t border-black/5 flex items-center gap-3">
                <p className="text-xs text-muted-foreground mr-auto">FRI:</p>
                <button
                  onClick={() => handleFRI(entrega.id, 'rechazada')}
                  disabled={isFriPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-red-500 hover:text-red-700 text-body-sm font-medium transition-all active:shadow-neu-inset disabled:opacity-40"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Rechazar
                </button>
                <button
                  onClick={() => handleFRI(entrega.id, 'aceptada')}
                  disabled={isFriPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-green-600 hover:text-green-800 text-body-sm font-medium transition-all active:shadow-neu-inset disabled:opacity-40"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isFriPending ? 'Procesando...' : 'Aceptar FRI'}
                </button>
              </div>
            )}

            {/* Liquidación — para entregas aceptadas */}
            {entrega.estado === 'aceptada' && (
              <div className="px-5 py-3 border-t border-black/5 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                {liquidacionesPorEntrega[entrega.id] ? (
                  <Link
                    href={`/liquidacion/${liquidacionesPorEntrega[entrega.id]}`}
                    className="text-xs text-primary-600 hover:underline font-medium"
                  >
                    Ver liquidación →
                  </Link>
                ) : (
                  <Link
                    href={`/liquidacion/nueva?op=${opId}&entrega=${entrega.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    Crear liquidación parcial
                  </Link>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
