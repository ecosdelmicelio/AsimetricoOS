'use client'

import { Package } from 'lucide-react'
import type { Bodega } from '@/features/wms/types'

interface Props {
  bodegas: Bodega[]
  bodegaSeleccionada: string | null
  onSelect: (id: string) => void
}

export function BodegaSelector({
  bodegas,
  bodegaSeleccionada,
  onSelect,
}: Props) {
  const bodegasActivas = bodegas.filter(b => b.activo)

  return (
    <div className="bg-neu-base rounded-xl border border-neu-300 p-4 h-full overflow-auto space-y-2">
      <h3 className="font-semibold text-sm px-2 mb-4">Bodegas</h3>

      {bodegasActivas.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-8">
          No hay bodegas activas
        </div>
      ) : (
        bodegasActivas.map(bodega => (
          <button
            key={bodega.id}
            onClick={() => onSelect(bodega.id)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
              bodegaSeleccionada === bodega.id
                ? 'bg-primary-100 border border-primary-300 text-primary-900 font-medium'
                : 'hover:bg-neu-200 border border-transparent text-foreground'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-4 h-4 shrink-0" />
              <div className="min-w-0 overflow-hidden">
                <p className="font-medium truncate">{bodega.nombre}</p>
                <p className="text-xs text-muted-foreground">{bodega.codigo}</p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  )
}
