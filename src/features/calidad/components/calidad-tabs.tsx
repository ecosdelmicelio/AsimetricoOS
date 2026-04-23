'use client'

import { useState } from 'react'
import { Factory, Package, BarChart3, Settings2 } from 'lucide-react'

interface Props {
  produccion: React.ReactNode
  recepciones: React.ReactNode
  analitica: React.ReactNode
  configuracion: React.ReactNode
}

type Tab = 'produccion' | 'recepciones' | 'analitica' | 'configuracion'

export function CalidadTabs({ produccion, recepciones, analitica, configuracion }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('produccion')

  const TABS = [
    { id: 'produccion', label: 'Producción', icon: Factory, sub: 'DuPro & FRI' },
    { id: 'recepciones', label: 'Ingreso Materiales', icon: Package, sub: 'Cuarentena' },
    { id: 'analitica', label: 'Inteligencia', icon: BarChart3, sub: 'Pareto & Rankings' },
    { id: 'configuracion', label: 'Configuración', icon: Settings2, sub: 'Defectos y Mermas' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] transition-all text-left ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                : 'bg-white border border-slate-100 text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              activeTab === tab.id ? 'bg-white/10' : 'bg-slate-50'
            }`}>
              <tab.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">
                {tab.sub}
              </p>
              <p className="text-sm font-black uppercase tracking-tighter leading-none">
                {tab.label}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="transition-all duration-300">
        {activeTab === 'produccion' && produccion}
        {activeTab === 'recepciones' && recepciones}
        {activeTab === 'analitica' && analitica}
        {activeTab === 'configuracion' && configuracion}
      </div>
    </div>
  )
}
