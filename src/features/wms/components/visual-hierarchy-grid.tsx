'use client'

import React from 'react'
import { 
  Warehouse, 
  LayoutGrid, 
  MapPin, 
  Box, 
  Package, 
  Shirt, 
  FileText, 
  ChevronLeft,
  Search,
  PlusCircle,
  Truck,
  ShoppingCart
} from 'lucide-react'

export type HierarchyLevel = 
  | 'BODEGAS' 
  | 'ZONAS' 
  | 'POSICIONES' 
  | 'BINES' 
  | 'ITEMS' 
  | 'PURCHASE_ORDERS' 
  | 'SALES_ORDERS' 
  | 'REASONS'

export interface GridItem {
  id: string
  label: string
  sublabel?: string
  icon?: string
  count?: number
  type?: string
  isSelected?: boolean
}

interface Props {
  items: GridItem[]
  level: HierarchyLevel
  onSelect: (item: GridItem) => void
  onBack?: () => void
  loading?: boolean
  title?: string
  breadcrumb?: string[]
}

const getIcon = (level: HierarchyLevel, iconName?: string) => {
  if (iconName === 'PlusCircle') return <PlusCircle className="w-8 h-8" />
  if (iconName === 'Trash2') return <PlusCircle className="w-8 h-8 text-red-500" /> // Placeholder for Trash
  
  switch (level) {
    case 'BODEGAS': return <Warehouse className="w-8 h-8" />
    case 'ZONAS': return <LayoutGrid className="w-8 h-8" />
    case 'POSICIONES': return <MapPin className="w-8 h-8" />
    case 'BINES': return <Box className="w-8 h-8" />
    case 'ITEMS': return <Shirt className="w-8 h-8" />
    case 'PURCHASE_ORDERS': return <ShoppingCart className="w-8 h-8" />
    case 'SALES_ORDERS': return <Truck className="w-8 h-8" />
    case 'REASONS': return <FileText className="w-8 h-8" />
    default: return <Package className="w-8 h-8" />
  }
}

export function VisualHierarchyGrid({ 
  items, 
  level, 
  onSelect, 
  onBack, 
  loading,
  title,
  breadcrumb = []
}: Props) {
  return (
    <div className="flex flex-col h-full bg-neu-100 rounded-3xl border-2 border-neu-300 shadow-neu-inset overflow-hidden">
      {/* Header del Panel */}
      <div className="p-4 bg-neu-200 border-b border-neu-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-primary-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">{title || level}</h4>
            <div className="flex items-center gap-1 mt-0.5">
              {breadcrumb.map((b, i) => (
                <React.Fragment key={i}>
                  <span className="text-[10px] font-bold text-foreground max-w-[80px] truncate">{b}</span>
                  {i < breadcrumb.length - 1 && <span className="text-neu-400 text-[10px]">/</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-8 pr-3 py-1.5 bg-white border border-neu-300 rounded-lg text-[10px] outline-none focus:ring-2 focus:ring-primary-300 w-32"
          />
        </div>
      </div>

      {/* Grid de Iconos */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground italic space-y-2 opacity-50">
            <Package className="w-12 h-12" />
            <p className="text-xs">No hay elementos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`flex flex-col items-center justify-center gap-3 p-4 border-2 rounded-3xl transition-all group text-center
                  ${item.isSelected 
                    ? 'bg-primary-50 border-primary-600 shadow-sm ring-4 ring-primary-100' 
                    : 'bg-white border-transparent hover:border-primary-400 hover:shadow-neu'}
                `}
              >
                <div className={`p-4 rounded-2xl transition-colors
                  ${item.isSelected ? 'bg-primary-600 text-white' : 'bg-neu-100 group-hover:bg-primary-50 group-hover:text-primary-600'}
                `}>
                  {getIcon(level, item.icon)}
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black uppercase tracking-tight text-foreground line-clamp-1">
                    {item.label}
                  </div>
                  {item.sublabel && (
                    <div className="text-[9px] font-bold text-muted-foreground truncate max-w-full">
                      {item.sublabel}
                    </div>
                  )}
                  {item.count !== undefined && (
                    <div className="mt-1 inline-block px-2 py-0.5 bg-neu-200 rounded-lg text-[9px] font-black text-neu-600">
                      {item.count} items
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
