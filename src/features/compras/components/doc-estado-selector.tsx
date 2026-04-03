'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateEstadoDocumental } from '@/features/compras/services/compras-actions'
import type { EstadoDocumental } from '@/features/compras/types'

const OPTIONS: { value: EstadoDocumental; label: string; desc: string; color: string }[] = [
  { value: 'na',                 label: 'Sin afidávit',       desc: 'No aplica para esta compra',        color: 'text-gray-500' },
  { value: 'pendiente_afidavit', label: 'Afidávit pendiente', desc: 'Requiere afidávit, aún no cargado', color: 'text-yellow-700' },
  { value: 'cargado',            label: 'Afidávit cargado',   desc: 'Documentación completa',             color: 'text-green-700' },
]

interface Props {
  ocId: string
  estadoActual: EstadoDocumental
}

export function DocEstadoSelector({ ocId, estadoActual }: Props) {
  const [pending, startTransition] = useTransition()

  function handleChange(nuevo: EstadoDocumental) {
    if (nuevo === estadoActual) return
    startTransition(async () => {
      await updateEstadoDocumental(ocId, nuevo)
    })
  }

  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-foreground text-body-md">Estado documental</h2>
        {pending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={pending}
            className={`flex-1 text-left rounded-xl p-3 border-2 transition-all disabled:opacity-60 ${
              estadoActual === opt.value
                ? 'border-primary-500 bg-primary-50 shadow-neu-inset'
                : 'border-transparent bg-neu-base shadow-neu hover:shadow-neu-lg'
            }`}
          >
            <p className={`font-semibold text-body-sm ${opt.color}`}>{opt.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
