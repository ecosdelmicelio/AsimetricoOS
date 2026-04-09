'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import { BodegaFilterBar } from '@/features/wms/components/bodega-filter-bar'
import { InventarioTable } from '@/features/wms/components/inventario-table'
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
    <div className="flex flex-col h-full bg-neu-bg">
      {/* Filter Bar: Iconos de bodegas */}
      <BodegaFilterBar
        bodegas={bodegas}
        bodegaSeleccionada={bodegaSeleccionada}
        onSelect={setBodegaSeleccionada}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
        {bodegaActual ? (
          <>
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{bodegaActual.nombre}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {bodegaActual.codigo} • Inventario de {bodegaActual.tipo.replace(/_/g, ' ')}
              </p>
            </div>

            {/* Inventario Table */}
            <InventarioTable bodegaId={bodegaActual.id} bodegaNombre={bodegaActual.nombre} />

            {/* Traslados */}
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
              <p>Selecciona una bodega para ver su inventario</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
