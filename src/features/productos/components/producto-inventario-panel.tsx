'use client'

import { useState } from 'react'
import { InventarioPTProducto } from './inventario-pt-producto'
import { HistorialPTFiltrable } from '@/features/kardex/components/historial-pt-filtrable'
import type { SaldoPT, HistorialPT } from '@/features/kardex/services/kardex-actions'

interface Props {
  saldosPT: SaldoPT[]
  historialPT: HistorialPT[]
  bodegas: Array<{ id: string; nombre: string }>
  tiposMovimiento: Array<{ id: string; codigo: string; nombre: string }>
}

export function ProductoInventarioPanel({
  saldosPT,
  historialPT,
  bodegas,
  tiposMovimiento,
}: Props) {
  const [activeTab, setActiveTab] = useState<'inventario' | 'movimientos'>('inventario')

  const tabs = [
    { id: 'inventario', label: 'Inventario', count: null },
    { id: 'movimientos', label: 'Movimientos', count: historialPT.length },
  ] as const

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b-2 border-black/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-body-sm font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-foreground border-primary-600'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-1.5 inline-block px-2 py-0.5 rounded bg-black/5 text-xs font-medium">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'inventario' && (
          <InventarioPTProducto saldos={saldosPT} bodegas={bodegas} />
        )}

        {activeTab === 'movimientos' && (
          <HistorialPTFiltrable
            historial={historialPT}
            bodegas={bodegas}
            tiposMovimiento={tiposMovimiento}
            productos={[]}
          />
        )}
      </div>
    </div>
  )
}
