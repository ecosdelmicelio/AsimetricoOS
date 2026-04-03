'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import Link from 'next/link'
import type { EntregaConDetalle } from '@/features/entregas/types'
import { resolverFRI } from '@/features/entregas/services/entregas-actions'
import { EntregaForm, type LineaOPSimple } from './entrega-form'
import { formatDate } from '@/shared/lib/utils'

const ESTADO_CONFIG = {
  recibida:      { label: 'Recibida',      classes: 'bg-yellow-100 text-yellow-700' },
  en_inspeccion: { label: 'En Inspección', classes: 'bg-blue-100 text-blue-700' },
  aceptada:      { label: 'Aceptada ✓',   classes: 'bg-green-100 text-green-700' },
  rechazada:     { label: 'Rechazada ✗',  classes: 'bg-red-100 text-red-700' },
}

interface Props {
  opId: string
  estadoActual: string
  entregas: EntregaConDetalle[]
  lineasOP: LineaOPSimple[]
  totalUnidadesOP: number
  liquidacionesPorEntrega: Record<string, string>  // entregaId → liquidacionId
}

export function EntregasPanel({ opId, estadoActual, entregas, lineasOP, totalUnidadesOP, liquidacionesPorEntrega }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [friPending, startFriTransition] = useTransition()
  const [friLoading, setFriLoading] = useState<string | null>(null)

  if (estadoActual !== 'en_entregas' && estadoActual !== 'completada' && entregas.length === 0) {
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
        {estadoActual === 'en_entregas' && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-muted-foreground hover:text-foreground text-body-sm font-medium transition-all active:shadow-neu-inset"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Entrega
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-body-sm text-muted-foreground">Unidades aceptadas</p>
          <p className="text-body-sm font-semibold text-foreground">
            {unidadesAceptadas} / {totalUnidadesOP}
          </p>
        </div>
        <div className="w-full h-2 rounded-full bg-neu-base shadow-neu-inset overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-500"
            style={{ width: `${progresoPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{progresoPct}% completado</p>
      </div>

      {/* Formulario nueva entrega */}
      {showForm && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4">
          <p className="font-semibold text-foreground text-body-sm">Nueva Entrega</p>
          <EntregaForm
            opId={opId}
            lineasOP={lineasOP}
            onSuccess={() => { setShowForm(false); router.refresh() }}
            onCancel={() => setShowForm(false)}
          />
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

        return (
          <div key={entrega.id} className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
            {/* Cabecera entrega */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <div>
                <p className="font-semibold text-foreground text-body-sm">
                  Entrega #{entrega.numero_entrega}
                  <span className="text-muted-foreground font-normal ml-2">{formatDate(entrega.fecha_entrega)}</span>
                </p>
                {entrega.notas && (
                  <p className="text-xs text-muted-foreground mt-0.5">{entrega.notas}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-body-sm font-semibold text-foreground">{totalEntregado} uds</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.classes}`}>
                  {config.label}
                </span>
              </div>
            </div>

            {/* Detalle (chips) */}
            <div className="px-5 py-3 flex flex-wrap gap-2">
              {entrega.entrega_detalle.map(d => (
                <div
                  key={d.id}
                  className="flex items-center gap-1.5 rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5"
                >
                  <span className="text-xs font-mono text-primary-600">{d.productos?.referencia}</span>
                  <span className="text-xs text-muted-foreground">{d.talla}</span>
                  <span className="text-xs font-semibold text-foreground">×{d.cantidad_entregada}</span>
                </div>
              ))}
            </div>

            {/* Botones FRI — solo para entregas recibidas y si OP en_entregas */}
            {entrega.estado === 'recibida' && estadoActual === 'en_entregas' && (
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
