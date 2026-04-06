'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEstadoOV, cancelOrdenVenta } from '@/features/ordenes-venta/services/ov-actions'
import type { EstadoOV } from '@/features/ordenes-venta/types'
import { XCircle } from 'lucide-react'

const TRANSICIONES: Record<EstadoOV, { label: string; siguiente: EstadoOV } | null> = {
  borrador:      { label: 'Confirmar Orden', siguiente: 'confirmada' },
  confirmada:    { label: 'Lanzar Producción', siguiente: 'en_produccion' },
  en_produccion: null,
  completada:    null,
  cancelada:     null,
}

interface Props {
  ovId: string
  estadoActual: string
  unidadesProducidas: number
  totalUnidades: number
}

export function OVActions({ ovId, estadoActual, unidadesProducidas, totalUnidades }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const transicionBase = TRANSICIONES[estadoActual as EstadoOV]
  
  // Intelligent transition refinement
  let transicion = transicionBase
  const produccionCompleta = totalUnidades > 0 && unidadesProducidas >= totalUnidades

  // Si ya se produjo todo, no tiene sentido "Lanzar Producción"
  if (estadoActual === 'confirmada' && produccionCompleta) {
    transicion = { label: 'Completar Orden', siguiente: 'completada' }
  }

  const puedeCancelar = estadoActual !== 'completada' && estadoActual !== 'cancelada'

  function handleTransicion() {
    if (!transicion) return
    startTransition(async () => {
      await updateEstadoOV(ovId, transicion.siguiente)
      router.refresh()
    })
  }

  function handleCancelar() {
    if (!confirm('¿Estás seguro de que deseas cancelar esta orden de venta? Esto también cancelará las OPs asociadas que no hayan terminado.')) return
    startTransition(async () => {
      await cancelOrdenVenta(ovId)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {puedeCancelar && (
        <button
          onClick={handleCancelar}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm"
          title="Cancelar Orden"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cancelar</span>
        </button>
      )}
      
      {transicion && (
        <button
          onClick={handleTransicion}
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-black text-[10px] uppercase tracking-[0.1em] transition-all hover:bg-primary-600 hover:border-primary-500 active:scale-95 shadow-xl shadow-slate-200/50"
        >
          {isPending ? 'Procesando...' : transicion.label}
        </button>
      )}
    </div>
  )
}
