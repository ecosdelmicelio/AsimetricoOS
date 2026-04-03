'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createLiquidacion, getOPsCompletadasSinLiquidacion } from '@/features/liquidacion/services/liquidacion-actions'
import { formatCurrency } from '@/shared/lib/utils'
import type { OPCompletadaSinLiquidacion } from '@/features/liquidacion/types'

interface EntregaPreseleccionada {
  id: string
  op_id: string
  numero_entrega: number
  totalUnidades: number
}

interface Props {
  ops: OPCompletadaSinLiquidacion[]
  opPreseleccionada?: string
  entregaPreseleccionada?: EntregaPreseleccionada
}

export function LiquidacionForm({ ops, opPreseleccionada, entregaPreseleccionada }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [opId, setOpId] = useState(entregaPreseleccionada?.op_id ?? opPreseleccionada ?? '')
  const [costoServicio, setCostoServicio] = useState('')
  const [penalidades, setPenalidades] = useState('')
  const [unidades, setUnidades] = useState(
    entregaPreseleccionada ? String(entregaPreseleccionada.totalUnidades) : ''
  )

  // Pre-fill penalidades when OP is selected
  const opSeleccionada = ops.find(op => op.id === opId)
  useEffect(() => {
    if (opSeleccionada) {
      setPenalidades(String(opSeleccionada.penalidades_estimadas))
    }
  }, [opId, opSeleccionada])

  const costoNum = parseFloat(costoServicio) || 0
  const penalidadesNum = parseFloat(penalidades) || 0
  const unidadesNum = parseInt(unidades) || 0
  const costoTotal = costoNum - penalidadesNum
  const costoUnitario = unidadesNum > 0 ? costoTotal / unidadesNum : 0

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createLiquidacion({
        op_id: opId,
        entrega_id: entregaPreseleccionada?.id,
        costo_servicio_taller: costoNum,
        penalidades_calidad: penalidadesNum,
        unidades_aprobadas: unidadesNum,
        notas: (new FormData(e.currentTarget).get('notas') as string) || undefined,
      })

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        router.push(`/liquidacion/${result.data.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Banner entrega preseleccionada */}
      {entregaPreseleccionada ? (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-body-sm font-semibold text-blue-700">
            Liquidación parcial · Entrega #{entregaPreseleccionada.numero_entrega}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            {entregaPreseleccionada.totalUnidades} unidades aceptadas
          </p>
        </div>
      ) : (
        /* Seleccionar OP (solo cuando no viene de entrega) */
        <div className="space-y-1.5">
          <label className="text-body-sm text-muted-foreground">Orden de Producción *</label>
          <select
            value={opId}
            onChange={e => setOpId(e.target.value)}
            required
            className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 text-body-sm text-foreground focus:outline-none"
          >
            <option value="">Seleccionar OP completada...</option>
            {ops.map(op => (
              <option key={op.id} value={op.id}>
                {op.codigo} — {op.taller} · {op.cliente}
              </option>
            ))}
          </select>
          {ops.length === 0 && (
            <p className="text-muted-foreground text-body-sm">
              No hay OPs completadas sin liquidación
            </p>
          )}
        </div>
      )}

      {/* Info OP seleccionada */}
      {opSeleccionada && !entregaPreseleccionada && (
        <div className="rounded-xl bg-neu-base shadow-neu-inset px-4 py-3 text-body-sm space-y-1">
          <p className="text-foreground font-medium">{opSeleccionada.codigo}</p>
          <p className="text-muted-foreground">{opSeleccionada.taller} · {opSeleccionada.cliente}</p>
          {opSeleccionada.penalidades_estimadas > 0 && (
            <p className="text-orange-600 font-medium">
              Penalidades estimadas: {formatCurrency(opSeleccionada.penalidades_estimadas)}
            </p>
          )}
        </div>
      )}

      {/* Costo servicio */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Costo servicio taller *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-body-sm">$</span>
          <input
            type="number"
            min={0}
            step={0.01}
            required
            value={costoServicio}
            onChange={e => setCostoServicio(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl bg-neu-base shadow-neu-inset pl-6 pr-3 py-2.5 text-body-sm text-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Penalidades */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Penalidades por calidad</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-body-sm">$</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={penalidades}
            onChange={e => setPenalidades(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl bg-neu-base shadow-neu-inset pl-6 pr-3 py-2.5 text-body-sm text-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Unidades aprobadas */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Unidades aprobadas *</label>
        <input
          type="number"
          min={0}
          required
          value={unidades}
          onChange={e => setUnidades(e.target.value)}
          placeholder="0"
          className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 text-body-sm text-foreground focus:outline-none"
        />
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Notas</label>
        <textarea
          name="notas"
          rows={2}
          placeholder="Observaciones..."
          className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 text-body-sm text-foreground focus:outline-none resize-none"
        />
      </div>

      {/* Resumen calculado */}
      {(costoNum > 0 || penalidadesNum > 0) && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-4 space-y-2">
          <h3 className="text-body-sm font-semibold text-foreground">Resumen</h3>
          <div className="space-y-1 text-body-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo servicio</span>
              <span className="font-medium">{formatCurrency(costoNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Penalidades</span>
              <span className="font-medium text-red-600">- {formatCurrency(penalidadesNum)}</span>
            </div>
            <div className="flex justify-between border-t border-black/5 pt-1 mt-1">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-foreground">{formatCurrency(costoTotal)}</span>
            </div>
            {unidadesNum > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Costo unitario</span>
                <span>{formatCurrency(costoUnitario)} / ud</span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-body-sm">{error}</p>}

      <button
        type="submit"
        disabled={pending || !opId}
        className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Crear liquidación
      </button>
    </form>
  )
}
