'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import { BodegaSelector } from '@/features/wms/components/bodega-selector'
import { BodegaBinesView } from '@/features/wms/components/bodega-bines-view'
import { TrasladoForm } from '@/features/wms/components/traslado-form'
import { TrasladosHistorial } from '@/features/wms/components/traslados-historial'
import type { Bodega } from '@/features/wms/types'

interface Props {
  bodegas: Bodega[]
}

export function WMSPanel({ bodegas }: Props) {
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState<string | null>(
    bodegas[0]?.id || null,
  )

  const bodegaActual = bodegas.find(b => b.id === bodegaSeleccionada)

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar: Selector de bodegas */}
      <div className="w-64 shrink-0 overflow-y-auto">
        <BodegaSelector
          bodegas={bodegas}
          bodegaSeleccionada={bodegaSeleccionada}
          onSelect={setBodegaSeleccionada}
        />
      </div>

      {/* Main: Vista de bines + traslados */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-6 pb-6">
        {bodegaActual ? (
          <>
            <BodegaBinesView bodega={bodegaActual} />

            {/* Formulario de traslado + historial */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold">Traslados</h3>
                <TrasladoForm bodegas={bodegas} bodegaOrigen={bodegaSeleccionada} />
              </div>

              <div className="bg-neu-base border border-neu-300 rounded-xl p-6">
                <TrasladosHistorial bodegaId={bodegaSeleccionada} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <Package className="w-12 h-12 mx-auto opacity-40" />
              <p>Selecciona una bodega para ver sus bines</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
