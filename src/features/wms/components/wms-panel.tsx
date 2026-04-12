'use client'

import { useState } from 'react'
import { Package, Repeat2 } from 'lucide-react'
import { BodegaFilterBar } from '@/features/wms/components/bodega-filter-bar'
import { InventarioTable } from '@/features/wms/components/inventario-table'
import { WMSTabs, type WMSTab } from '@/features/wms/components/wms-tabs'
import { TrasladoForm } from '@/features/wms/components/traslado-form'
import { TrasladosHistorial } from '@/features/wms/components/traslados-historial'
import { AjusteForm } from '@/features/wms/components/ajuste-form'
import { AjusteHistorial } from '@/features/wms/components/ajuste-historial'
import { PosicionesTab } from '@/features/wms/components/posiciones-tab'
import { MovementCommandCenter } from '@/features/wms/components/movement-command-center'
import { ZonasManagement } from '@/features/wms/components/zonas-management'
import { BinesManagement } from '@/features/wms/components/bines-management'
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
        <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-8">
          <TrasladoForm bodegas={bodegas} bodegaOrigen={bodegaSeleccionada || ''} />
          
          <div className="bg-neu-base border border-neu-300 rounded-3xl p-8 shadow-neu">
            <h3 className="font-bold text-xl mb-6 text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-500" />
              Historial de Traslados Recientes
            </h3>
            <TrasladosHistorial bodegaId={bodegaSeleccionada || undefined} />
          </div>
        </div>
      )}

      {/* VISTA: AJUSTES */}
      {activeTab === 'ajustes' && bodegaSeleccionada && (
        <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-8">
          <AjusteForm
            bodegaId={bodegaSeleccionada}
            onSuccess={() => setAjusteRefreshKey(k => k + 1)}
          />
          
          <div className="bg-neu-base border border-neu-300 rounded-3xl p-8 shadow-neu">
            <h3 className="font-bold text-xl mb-6 text-foreground flex items-center gap-2">
              <Repeat2 className="w-5 h-5 text-amber-500" />
              Historial de Ajustes de Inventario
            </h3>
            <AjusteHistorial
              bodegaId={bodegaSeleccionada}
              refreshKey={ajusteRefreshKey}
            />
          </div>
        </div>
      )}
      {/* VISTA: POSICIONES */}
      {activeTab === 'posiciones' && (
        <>
          <BodegaFilterBar
            bodegas={bodegas}
            bodegaSeleccionada={bodegaSeleccionada}
            onSelect={setBodegaSeleccionada}
          />
          <div className="flex-1 min-w-0 overflow-y-auto p-6">
            {bodegaSeleccionada ? (
              <PosicionesTab bodegaId={bodegaSeleccionada} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground italic">
                Selecciona una bodega para gestionar sus posiciones
              </div>
            )}
          </div>
        </>
      )}

      {/* VISTA: CENTRO DE MOVIMIENTOS (COMMAND CENTER) */}
      {activeTab === 'command_center' && (
        <div className="flex-1 min-h-0 bg-white">
          <MovementCommandCenter bodegas={bodegas} />
        </div>
      )}

      {/* VISTA: GESTIÓN DE ZONAS */}
      {activeTab === 'zonas' && (
        <div className="flex-1 min-w-0 overflow-y-auto bg-neu-bg">
          <ZonasManagement bodegas={bodegas} />
        </div>
      )}

      {/* VISTA: GESTIÓN DE BINES */}
      {activeTab === 'bines' && (
        <div className="flex-1 min-w-0 overflow-y-auto bg-neu-bg">
          <BinesManagement bodegas={bodegas} />
        </div>
      )}
    </div>
  )
}
