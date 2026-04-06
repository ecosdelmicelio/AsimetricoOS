'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateEstadoOV, cancelOrdenVenta } from '@/features/ordenes-venta/services/ov-actions'
import type { EstadoOV } from '@/features/ordenes-venta/types'
import { XCircle } from 'lucide-react'

const TRANSICIONES: Record<EstadoOV, { label: string; siguiente: EstadoOV } | null> = {
  borrador:      { label: 'Confirmar Orden', siguiente: 'confirmada' },
  confirmada:    { label: 'Lanzar Producción', siguiente: 'en_produccion' },
  en_produccion: null,
  terminada:     null,
  despachada:    null,
  entregada:     null,
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

  const [showConfirm, setShowConfirm] = useState(false)

  function handleTransicion() {
    if (!transicion) return
    
    // Si la transición es lanzar producción, redirigimos al formulario de OP para que se cree el registro
    if (transicion.siguiente === 'en_produccion') {
      router.push(`/ordenes-produccion/nueva?ov=${ovId}`)
      return
    }

    startTransition(async () => {
      await updateEstadoOV(ovId, transicion.siguiente)
      router.refresh()
    })
  }

  function handleCancelar() {
    startTransition(async () => {
      const result = await cancelOrdenVenta(ovId)
      
      if (result.error) {
        alert(`No se pudo cancelar la orden: ${result.error}`)
        setShowConfirm(false)
        return
      }
      
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {puedeCancelar && (
        <div className="flex items-center gap-1">
          {showConfirm ? (
            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold text-[9px] uppercase tracking-wider hover:bg-slate-50 transition-all"
              >
                Atrás
              </button>
              <button
                onClick={handleCancelar}
                disabled={isPending}
                className="px-3 py-2 rounded-lg bg-red-600 text-white font-black text-[9px] uppercase tracking-wider hover:bg-red-700 transition-all shadow-sm flex items-center gap-1"
              >
                {isPending ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm"
              title="Cancelar Orden"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cancelar</span>
            </button>
          )}
        </div>
      )}
      
      {!showConfirm && transicion && (
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
