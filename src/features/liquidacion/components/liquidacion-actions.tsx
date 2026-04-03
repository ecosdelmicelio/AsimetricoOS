'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { aprobarLiquidacion } from '@/features/liquidacion/services/liquidacion-actions'

interface Props {
  liquidacionId: string
  estado: string
}

export function LiquidacionActions({ liquidacionId, estado }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (estado !== 'pendiente') return null

  function handleAprobar() {
    startTransition(async () => {
      await aprobarLiquidacion(liquidacionId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleAprobar}
      disabled={pending}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-body-sm hover:bg-green-700 transition-all disabled:opacity-50"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
      Aprobar liquidación
    </button>
  )
}
