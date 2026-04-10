'use client'

import { useState } from 'react'
import { ArrowRightLeft, SlidersHorizontal } from 'lucide-react'
import { TrasladoForm } from '@/features/wms/components/traslado-form'
import { TrasladosHistorial } from '@/features/wms/components/traslados-historial'
import { AjusteForm } from '@/features/wms/components/ajuste-form'
import { AjusteHistorial } from '@/features/wms/components/ajuste-historial'
import type { Bodega } from '@/features/wms/types'

type Tab = 'traslados' | 'ajustes'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'traslados', label: 'Traslados', icon: ArrowRightLeft },
  { id: 'ajustes', label: 'Ajustes', icon: SlidersHorizontal },
]

interface Props {
  bodegas: Bodega[]
  bodegaSeleccionada: string | null
}

export function WMSTabs({ bodegas, bodegaSeleccionada }: Props) {
  const [tab, setTab] = useState<Tab>('traslados')
  const [ajusteRefreshKey, setAjusteRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                tab === t.id
                  ? 'bg-neu-base shadow-neu-inset border-2 border-primary-400'
                  : 'bg-neu-base shadow-neu border-2 border-transparent hover:shadow-neu-lg'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${tab === t.id ? 'text-primary-600' : 'text-muted-foreground'}`}
              />
              <span className={`text-sm font-medium ${tab === t.id ? 'text-primary-700' : 'text-foreground'}`}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content: Traslados */}
      {tab === 'traslados' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold">Crear Traslado</h3>
            <TrasladoForm bodegas={bodegas} bodegaOrigen={bodegaSeleccionada || ''} />
          </div>
          <div className="bg-neu-base border border-neu-300 rounded-xl p-6">
            <TrasladosHistorial bodegaId={bodegaSeleccionada || undefined} />
          </div>
        </div>
      )}

      {/* Content: Ajustes */}
      {tab === 'ajustes' && bodegaSeleccionada && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-sm">Nuevo Ajuste</h3>
            <AjusteForm
              bodegaId={bodegaSeleccionada}
              onSuccess={() => setAjusteRefreshKey(k => k + 1)}
            />
          </div>
          <div className="bg-neu-base border border-neu-300 rounded-xl p-6 overflow-y-auto max-h-[600px]">
            <AjusteHistorial
              bodegaId={bodegaSeleccionada}
              refreshKey={ajusteRefreshKey}
            />
          </div>
        </div>
      )}
    </div>
  )
}
