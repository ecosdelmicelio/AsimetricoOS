'use client'

import { useState } from 'react'
import { ShoppingBag, Layers, Wrench, Package } from 'lucide-react'
import { ServiciosPanel } from '@/features/servicios/components/servicios-panel'
import { PageHeader } from '@/shared/components/page-header'
import type { ServicioOperativo, TipoServicioAtributo } from '@/features/servicios/types/servicios'

interface Props {
  productosContent: React.ReactNode
  materialesContent: React.ReactNode
  servicios?: ServicioOperativo[]
  atributosServicio?: TipoServicioAtributo[]
  tipos?: TipoServicioAtributo[]
  subtipos?: TipoServicioAtributo[]
  detalles?: TipoServicioAtributo[]
  ejecutoresServicios?: Array<{ id: string; nombre: string }>
}

type Tab = 'pt' | 'mp' | 'servicios'

const TABS: { id: Tab; label: string; sub: string; Icon: React.ElementType }[] = [
  { id: 'pt', label: 'Productos terminados',  sub: 'PT — Referencias y BOM', Icon: ShoppingBag },
  { id: 'mp', label: 'Materiales e insumos', sub: 'MP — Telas, hilos, accesorios', Icon: Layers },
  { id: 'servicios', label: 'Servicios', sub: 'Procesos operativos', Icon: Wrench },
]

export function ProductosTabs({
  productosContent,
  materialesContent,
  servicios = [],
  tipos = [],
  subtipos = [],
  detalles = [],
  ejecutoresServicios = [],
}: Props) {
  const [tab, setTab] = useState<Tab>('pt')

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Catálogo Industrial"
        subtitle="Referencias, materiales, insumos y servicios"
        icon={Package}
      />

      {/* Tabs Premium */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-4 px-6 py-4 rounded-[28px] transition-all min-w-[280px] group border-2 ${
              tab === t.id
                ? 'bg-white border-slate-900 shadow-xl shadow-slate-100 scale-[1.02]'
                : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 opacity-70 hover:opacity-100'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 ${
              tab === t.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'
            }`}>
              <t.Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className={`text-[11px] font-black uppercase tracking-widest leading-none mb-1.5 ${tab === t.id ? 'text-slate-900' : 'text-slate-400'}`}>
                {t.label}
              </p>
              <p className="text-[10px] text-slate-400 font-bold tracking-tight truncate uppercase opacity-80">{t.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'pt' && productosContent}
        {tab === 'mp' && materialesContent}
        {tab === 'servicios' && (
          <ServiciosPanel
            servicios={servicios}
            tipos={tipos}
            subtipos={subtipos}
            detalles={detalles}
            ejecutores={ejecutoresServicios}
          />
        )}
      </div>
    </div>
  )
}
