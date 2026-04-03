'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEstadoOV } from '@/features/ordenes-venta/services/ov-actions'
import type { EstadoOV } from '@/features/ordenes-venta/types'

const TRANSICIONES: Record<EstadoOV, { label: string; siguiente: EstadoOV } | null> = {
  borrador:      { label: 'Confirmar OV', siguiente: 'confirmada' },
  confirmada:    { label: 'Enviar a Producción', siguiente: 'en_produccion' },
  en_produccion: null,
  completada:    null,
  cancelada:     null,
}

interface Props {
  ovId: string
  estadoActual: string
}

export function OVActions({ ovId, estadoActual }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const transicion = TRANSICIONES[estadoActual as EstadoOV]

  if (!transicion) return null

  function handleTransicion() {
    startTransition(async () => {
      await updateEstadoOV(ovId, transicion!.siguiente)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleTransicion}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg disabled:opacity-60 shrink-0"
    >
      {isPending ? 'Actualizando...' : transicion.label}
    </button>
  )
}
