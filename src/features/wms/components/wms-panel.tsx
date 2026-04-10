'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import { BodegaFilterBar } from '@/features/wms/components/bodega-filter-bar'
import { InventarioTable } from '@/features/wms/components/inventario-table'
import { WMSTabs, type WMSTab } from '@/features/wms/components/wms-tabs'
import { TrasladoForm } from '@/features/wms/components/traslado-form'
import { TrasladosHistorial } from '@/features/wms/components/traslados-historial'
import { AjusteForm } from '@/features/wms/components/ajuste-form'
import { AjusteHistorial } from '@/features/wms/components/ajuste-historial'
import type { Bodega } from '@/features/wms/types'

interface Props {
  bodegas: Bodega[]
}

export function WMSPanel({ bodegas }: Props) {
  const [activeTab, setActiveTab] = useState<WMSTab>('inventario')
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState<string | null>(
    bodegas[0]?.id || null,
  )
  const [ajusteRefreshKey, setAjusteRefreshKey] = useState(0)

  const bodegaActual = bodegas.find(b => b.id === bodegaSeleccionada)

  return (
    <div className="flex flex-col h-full bg-neu-bg">
      {/* WMS Tabs - Controla la vista principal */}
      <WMSTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* VISTA: INVENTARIO (Default) */}
      {activeTab === 'inventario' && (
        <>
          {/* Filter Bar: Iconos de bodegas */}
          <BodegaFilterBar
            bodegas={bodegas}
            bodegaSeleccionada={bodegaSeleccionada}
            onSelect={setBodegaSeleccionada}
          />

          {/* Main content: Tabla de Inventario */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
            {bodegaActual ? (
              <>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{bodegaActual.nombre}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {bodegaActual.codigo} • Inventario de {bodegaActual.tipo.replace(/_/g, ' ')}
                  </p>
                </div>
                <InventarioTable bodegaId={bodegaActual.id} bodegaNombre={bodegaActual.nombre} />
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
        </>
      )}

      {/* VISTA: TRASLADOS */}
      {activeTab === 'traslados' && (
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-neu-base border border-neu-300 rounded-2xl p-6 space-y-4 shadow-neu">
              <h3 className="font-semibold text-lg">Crear Traslado</h3>
              <TrasladoForm bodegas={bodegas} bodegaOrigen={bodegaSeleccionada || ''} />
            </div>
            <div className="bg-neu-base border border-neu-300 rounded-2xl p-6 shadow-neu">
              <h3 className="font-semibold text-lg mb-4">Historial de Traslados</h3>
              <TrasladosHistorial bodegaId={bodegaSeleccionada || undefined} />
            </div>
          </div>
        </div>
      )}

      {/* VISTA: AJUSTES */}
      {activeTab === 'ajustes' && bodegaSeleccionada && (
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-neu-base border border-neu-300 rounded-2xl p-6 space-y-4 shadow-neu">
              <h3 className="font-semibold text-lg">Nuevo Ajuste</h3>
              <AjusteForm
                bodegaId={bodegaSeleccionada}
                onSuccess={() => setAjusteRefreshKey(k => k + 1)}
              />
            </div>
            <div className="bg-neu-base border border-neu-300 rounded-2xl p-6 shadow-neu overflow-y-auto max-h-[700px]">
              <h3 className="font-semibold text-lg mb-4">Historial de Ajustes</h3>
              <AjusteHistorial
                bodegaId={bodegaSeleccionada}
                refreshKey={ajusteRefreshKey}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
