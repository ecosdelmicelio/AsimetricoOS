'use client'

import { useState } from 'react'
import { ShoppingBag, Layers } from 'lucide-react'

interface Props {
  productosContent: React.ReactNode
  materialesContent: React.ReactNode
}

type Tab = 'pt' | 'mp'

const TABS: { id: Tab; label: string; sub: string; Icon: React.ElementType }[] = [
  { id: 'pt', label: 'Productos terminados',  sub: 'PT — Referencias y BOM', Icon: ShoppingBag },
  { id: 'mp', label: 'Materiales e insumos', sub: 'MP — Telas, hilos, accesorios', Icon: Layers },
]

export function ProductosTabs({ productosContent, materialesContent }: Props) {
  const [tab, setTab] = useState<Tab>('pt')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display-xs font-heading text-foreground font-bold">ADN de Productos</h1>
        <p className="text-muted-foreground text-body-sm mt-1">Catálogo de referencias, materiales e insumos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
              tab === t.id
                ? 'bg-neu-base shadow-neu-inset border-2 border-primary-400'
                : 'bg-neu-base shadow-neu border-2 border-transparent hover:shadow-neu-lg'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              tab === t.id ? 'bg-primary-100' : 'bg-neu-base shadow-neu-inset'
            }`}>
              <t.Icon className={`w-4 h-4 ${tab === t.id ? 'text-primary-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className={`text-body-sm font-semibold ${tab === t.id ? 'text-primary-700' : 'text-foreground'}`}>
                {t.label}
              </p>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'pt' && productosContent}
        {tab === 'mp' && materialesContent}
      </div>
    </div>
  )
}
