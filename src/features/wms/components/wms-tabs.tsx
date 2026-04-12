import { ArrowRightLeft, SlidersHorizontal, Package, Map as MapIcon, Repeat2, LayoutGrid, Layers } from 'lucide-react'

export type WMSTab = 'inventario' | 'command_center' | 'traslados' | 'ajustes' | 'infraestructura'

const TABS: { id: WMSTab; label: string; icon: React.ElementType }[] = [
  { id: 'inventario',     label: 'Inventario',        icon: Package },
  { id: 'command_center', label: 'Centro Movimientos', icon: ArrowRightLeft },
  { id: 'infraestructura', label: 'Mapa Ubicaciones',  icon: MapIcon },
  { id: 'traslados',      label: 'Traslados (Antiguo)', icon: Repeat2 },
  { id: 'ajustes',        label: 'Ajustes (Antiguo)',   icon: SlidersHorizontal },
]

interface Props {
  activeTab: WMSTab
  onTabChange: (tab: WMSTab) => void
}

export function WMSTabs({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex gap-2 px-6 py-4 bg-neu-bg border-b border-neu-300">
      {TABS.map(t => {
        const Icon = t.icon
        const isActive = activeTab === t.id
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all ${
              isActive
                ? 'bg-neu-base shadow-neu-inset border-2 border-primary-400'
                : 'bg-neu-base shadow-neu border-2 border-transparent hover:shadow-neu-lg hover:border-neu-300'
            }`}
          >
            <Icon
              className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-muted-foreground'}`}
            />
            <span className={`text-sm font-medium ${isActive ? 'text-primary-700' : 'text-foreground'}`}>
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
