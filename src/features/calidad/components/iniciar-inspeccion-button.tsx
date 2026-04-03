'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PlayCircle, RefreshCw, Loader2 } from 'lucide-react'
import { createInspeccion } from '@/features/calidad/services/calidad-actions'
import type { TipoInspeccion } from '@/features/calidad/types'

interface Props {
  op_id: string
  tipo:  TipoInspeccion
  ciclo?: number
}

export function IniciarInspeccionButton({ op_id, tipo, ciclo = 1 }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await createInspeccion(op_id, tipo)
      router.refresh()
    })
  }

  const isReInspeccion = ciclo > 1
  const tipoLabel = tipo === 'dupro' ? 'DuPro' : 'FRI'
  const label = isReInspeccion
    ? `Iniciar re-inspección #${ciclo}`
    : `Iniciar inspección ${tipoLabel}`

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-body-sm transition-all disabled:opacity-50 ${
        isReInspeccion
          ? 'bg-orange-500 hover:bg-orange-600 text-white'
          : 'bg-primary-600 hover:bg-primary-700 text-white'
      }`}
    >
      {pending
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : isReInspeccion
          ? <RefreshCw className="w-4 h-4" />
          : <PlayCircle className="w-4 h-4" />
      }
      {label}
    </button>
  )
}
