'use client'

import { Warehouse } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Bodega } from '@/features/wms/types'

interface Props {
  bodegas: Bodega[]
  bodegaSeleccionada: string | null
  onSelect: (bodegaId: string) => void
}

export function BodegaFilterBar({ bodegas, bodegaSeleccionada, onSelect }: Props) {
  return (
    <div className="bg-neu-base border-b border-neu-300 px-6 py-4 overflow-x-auto">
      <div className="flex gap-3 min-w-min">
        {bodegas.map(bodega => (
          <button
            key={bodega.id}
            onClick={() => onSelect(bodega.id)}
            className={cn(
              'flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all shrink-0',
              bodegaSeleccionada === bodega.id
                ? 'bg-primary-100 border-2 border-primary-500 text-primary-700'
                : 'bg-neu-base border-2 border-neu-300 text-muted-foreground hover:border-primary-300'
            )}
          >
            <Warehouse className="w-6 h-6" />
            <div className="text-center">
              <p className="text-xs font-semibold">{bodega.codigo}</p>
              <p className="text-[10px] text-muted-foreground">{bodega.nombre}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
