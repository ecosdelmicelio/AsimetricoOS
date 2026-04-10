'use client'

import { useState } from 'react'
import { ArrowRightLeft, Download, Upload } from 'lucide-react'
import { TrasladoForm } from '@/features/wms/components/traslado-form'
import { TrasladosHistorial } from '@/features/wms/components/traslados-historial'
import type { Bodega } from '@/features/wms/types'

type Tab = 'traslados' | 'ingresos' | 'salidas'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'traslados', label: 'Traslados', icon: ArrowRightLeft },
  { id: 'ingresos', label: 'Ingresos', icon: Download },
  { id: 'salidas', label: 'Salidas', icon: Upload },
]

interface Props {
  bodegas: Bodega[]
  bodegaSeleccionada: string | null
}

export function WMSTabs({ bodegas, bodegaSeleccionada }: Props) {
  const [tab, setTab] = useState<Tab>('traslados')

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

      {/* Content */}
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

      {tab === 'ingresos' && (
        <IngresosTab bodegas={bodegas} bodegaSeleccionada={bodegaSeleccionada} />
      )}

      {tab === 'salidas' && (
        <SalidasTab bodegas={bodegas} bodegaSeleccionada={bodegaSeleccionada} />
      )}
    </div>
  )
}

function IngresosTab({ bodegas, bodegaSeleccionada }: { bodegas: Bodega[]; bodegaSeleccionada: string | null }) {
  const [formData, setFormData] = useState({
    bodega_id: bodegaSeleccionada || '',
    cantidad: 1,
    unidad: 'unidades',
    notas: '',
  })

  const bodegaActual = bodegas.find(b => b.id === bodegaSeleccionada)

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">Registrar Ingreso</h3>

        <div>
          <label className="block text-sm font-medium mb-1">Bodega Destino</label>
          <select
            value={formData.bodega_id}
            onChange={e => setFormData({ ...formData, bodega_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
          >
            <option value="">Seleccionar...</option>
            {bodegas
              .filter(b => b.activo)
              .map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cantidad</label>
          <input
            type="number"
            min="1"
            value={formData.cantidad}
            onChange={e => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Unidad</label>
          <select
            value={formData.unidad}
            onChange={e => setFormData({ ...formData, unidad: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
          >
            <option>unidades</option>
            <option>kg</option>
            <option>metros</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notas</label>
          <textarea
            value={formData.notas}
            onChange={e => setFormData({ ...formData, notas: e.target.value })}
            placeholder="Notas opcionales..."
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
            rows={3}
          />
        </div>

        <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
          Crear Ingreso
        </button>
      </div>

      <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-sm">Historial de Ingresos</h3>
        <div className="text-center py-8 text-muted-foreground text-sm">
          {bodegaActual ? `No hay ingresos registrados en ${bodegaActual.nombre}` : 'Selecciona una bodega'}
        </div>
      </div>
    </div>
  )
}

function SalidasTab({ bodegas, bodegaSeleccionada }: { bodegas: Bodega[]; bodegaSeleccionada: string | null }) {
  const [formData, setFormData] = useState({
    bodega_id: bodegaSeleccionada || '',
    cantidad: 1,
    unidad: 'unidades',
    notas: '',
  })

  const bodegaActual = bodegas.find(b => b.id === bodegaSeleccionada)

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">Registrar Salida</h3>

        <div>
          <label className="block text-sm font-medium mb-1">Bodega Origen</label>
          <select
            value={formData.bodega_id}
            onChange={e => setFormData({ ...formData, bodega_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
          >
            <option value="">Seleccionar...</option>
            {bodegas
              .filter(b => b.activo)
              .map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cantidad</label>
          <input
            type="number"
            min="1"
            value={formData.cantidad}
            onChange={e => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Unidad</label>
          <select
            value={formData.unidad}
            onChange={e => setFormData({ ...formData, unidad: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
          >
            <option>unidades</option>
            <option>kg</option>
            <option>metros</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notas</label>
          <textarea
            value={formData.notas}
            onChange={e => setFormData({ ...formData, notas: e.target.value })}
            placeholder="Notas opcionales..."
            className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
            rows={3}
          />
        </div>

        <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
          Crear Salida
        </button>
      </div>

      <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-sm">Historial de Salidas</h3>
        <div className="text-center py-8 text-muted-foreground text-sm">
          {bodegaActual ? `No hay salidas registradas en ${bodegaActual.nombre}` : 'Selecciona una bodega'}
        </div>
      </div>
    </div>
  )
}
