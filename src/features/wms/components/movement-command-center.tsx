'use client'

import { useState, useEffect } from 'react'
import { 
  Package, 
  ArrowRightLeft, 
  ShoppingCart, 
  Truck, 
  Repeat2, 
  AlertCircle,
  Plus,
  Box,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { VisualHierarchyGrid, type HierarchyLevel, type GridItem } from './visual-hierarchy-grid'
import { 
  getCenterPendingPurchases, 
  getCenterPendingSales, 
  getWarehouseHierarchy, 
  getAdjustmentReasons,
  getOCItemsGrid,
  getOVItemsGrid,
  getBinItemsGrid,
  getSuggestedBinesForOVGrid,
  processUnifiedMovement
} from '@/features/wms/services/center-actions'
import type { Bodega } from '@/features/wms/types'

type MovementMode = 'INGRESAR' | 'TRASLADAR' | 'DESPACHAR' | 'AJUSTAR'

interface PanelState {
  level: HierarchyLevel
  id?: string
  breadcrumb: string[]
  items: GridItem[]
}

interface Props {
  bodegas: Bodega[]
}

export function MovementCommandCenter({ bodegas }: Props) {
  const [mode, setMode] = useState<MovementMode>('TRASLADAR')
  const [loading, setLoading] = useState(false)
  
  // Estados de los Paneles
  const [source, setSource] = useState<PanelState>({ level: 'BODEGAS', breadcrumb: [], items: [] })
  const [target, setTarget] = useState<PanelState>({ level: 'BODEGAS', breadcrumb: [], items: [] })

  const [ajusteTipo, setAjusteTipo] = useState<'entrada' | 'salida'>('salida')
  const [activeBodegaId, setActiveBodegaId] = useState<string>(bodegas[0]?.id || '')

  // Selección final
  const [sourceSelection, setSourceSelection] = useState<GridItem | null>(null)
  const [targetSelection, setTargetSelection] = useState<GridItem | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState<number>(1)
  const [precioValidado, setPrecioValidado] = useState<number>(0)
  const [notas, setNotas] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [showValidation, setShowValidation] = useState(false)

  // Inicialización o Cambio de Modo
  useEffect(() => {
    setSourceSelection(null)
    setTargetSelection(null)
    setActiveOrderId(null)
    resetPanels()
  }, [mode, ajusteTipo, activeBodegaId])

  const resetPanels = async () => {
    setLoading(true)
    
    // Configuración inicial según modo
    if (mode === 'INGRESAR') {
      const ocs = await getCenterPendingPurchases()
      setSource({
        level: 'PURCHASE_ORDERS',
        breadcrumb: ['Ingresos'],
        items: ocs.map(oc => ({
          id: oc.id,
          label: oc.codigo,
          sublabel: oc.terceros?.nombre || 'Proveedor Desconocido',
          icon: 'ShoppingCart'
        }))
      })
      setTarget({
        level: 'BODEGAS',
        breadcrumb: ['Destino'],
        items: bodegas.map(b => ({ id: b.id, label: b.nombre, sublabel: b.codigo }))
      })
    } else if (mode === 'TRASLADAR') {
      const warehouseItems = bodegas.map(b => ({ id: b.id, label: b.nombre, sublabel: b.codigo }))
      setSource({ level: 'BODEGAS', breadcrumb: ['Origen'], items: warehouseItems })
      setTarget({ level: 'BODEGAS', breadcrumb: ['Destino'], items: warehouseItems })
    } else if (mode === 'DESPACHAR') {
      const ovs = await getCenterPendingSales()
      setSource({
        level: 'SALES_ORDERS',
        breadcrumb: ['Despachos (OV)'],
        items: ovs.map(ov => ({
          id: ov.id,
          label: ov.codigo,
          sublabel: ov.terceros?.nombre || 'Cliente',
          icon: 'Truck'
        }))
      })
      setTarget({
        level: 'BODEGAS',
        breadcrumb: ['Origen Mercancía'],
        items: bodegas.map(b => ({ id: b.id, label: b.nombre, sublabel: b.codigo }))
      })
    } else if (mode === 'AJUSTAR') {
      const reasons = await getAdjustmentReasons()
      
      if (ajusteTipo === 'salida') {
        setSource({
          level: 'BODEGAS',
          breadcrumb: ['Mercancía a Ajustar'],
          items: bodegas.map(b => ({ id: b.id, label: b.nombre, sublabel: b.codigo }))
        })
        setTarget({
          level: 'REASONS',
          breadcrumb: ['Motivo de Salida'],
          items: reasons.filter(r => r.tipo === 'salida').map(r => ({ id: r.id, label: r.nombre, icon: r.icono, type: r.tipo }))
        })
      } else {
        setSource({
          level: 'REASONS',
          breadcrumb: ['Motivo de Entrada'],
          items: reasons.filter(r => r.tipo === 'entrada').map(r => ({ id: r.id, label: r.nombre, icon: r.icono, type: r.tipo }))
        })
        setTarget({
          level: 'BODEGAS',
          breadcrumb: ['Ubicación Destino'],
          items: bodegas.map(b => ({ id: b.id, label: b.nombre, sublabel: b.codigo }))
        })
      }
    }
    
    setLoading(false)
  }

  // Lógica de Navegación "Hacia Abajo"
  const handleSelect = async (panel: 'source' | 'target', item: GridItem) => {
    const currentState = panel === 'source' ? source : target
    const setState = panel === 'source' ? setSource : setTarget
    
    setLoading(true)
    let nextLevel: HierarchyLevel = currentState.level
    let nextItems: GridItem[] = []
    // Si ya estamos en el nivel terminal o es un elemento de acción final (ITEMS, REASONS, BINES)
    if (currentState.level === 'ITEMS' || currentState.level === 'REASONS' || currentState.level === 'BINES') {
      setState(prev => ({ ...prev, id: item.id })) // Marcamos el ID activo
      if (panel === 'source') {
        setSourceSelection(item)
        setCantidad(item.count || 1)
        setPrecioValidado(item.price || 0)
      } else {
        setTargetSelection(item)
      }
      setLoading(false)
      return
    }

    try {
      if (currentState.level === 'BODEGAS') {
        setActiveBodegaId(item.id)
        const hierarchy = await getWarehouseHierarchy(item.id)
        if (hierarchy.zonas.length > 0) {
          nextLevel = 'ZONAS'
          nextItems = hierarchy.zonas.map(z => ({ id: z.id, label: z.nombre, sublabel: z.codigo }))
        } else {
          nextLevel = 'POSICIONES'
          nextItems = hierarchy.posiciones.map(p => ({ 
            id: p.id, 
            label: p.nombre || p.codigo, 
            sublabel: p.codigo, 
            count: (p as any).bines_count 
          }))
        }
      } else if (currentState.level === 'ZONAS') {
        const hierarchy = await getWarehouseHierarchy(activeBodegaId)
        nextLevel = 'POSICIONES'
        nextItems = hierarchy.posiciones
          .filter(p => p.zona_id === item.id)
          .map(p => ({ id: p.id, label: p.nombre || p.codigo, sublabel: p.codigo, count: (p as any).bines_count }))
      } else if (currentState.level === 'POSICIONES') {
        const hierarchy = await getWarehouseHierarchy(activeBodegaId)
        nextLevel = 'BINES'
        
        const existingBines = hierarchy.bines
          .filter(b => b.posicion_id === item.id)
          .map(b => ({ id: b.id, label: b.codigo, sublabel: b.es_fijo ? '🔒 FIJO' : '📦 MOVIBLE', icon: 'Box' }))
        
        // Inyectar opción de nuevo bin si estamos ingresando
        if (mode === 'INGRESAR') {
          nextItems = [
            { 
              id: `NEW_BIN|${item.id}|${item.label}`, // Encapsulamos ID de posición y nombre para el generador
              label: 'Crear Nuevo Bin', 
              sublabel: `En ${item.label}`, 
              icon: 'PlusCircle',
              type: 'NEW_BIN_ACTION' 
            },
            ...existingBines
          ]
        } else {
          nextItems = existingBines
        }
      } else if (currentState.level === 'BINES') {
        nextLevel = 'ITEMS'
        nextItems = await getBinItemsGrid(item.id)
      } else if (currentState.level === 'PURCHASE_ORDERS') {
        setActiveOrderId(item.id)
        nextLevel = 'ITEMS'
        nextItems = await getOCItemsGrid(item.id)
      } else if (currentState.level === 'SALES_ORDERS') {
        setActiveOrderId(item.id)
        nextLevel = 'ITEMS'
        nextItems = await getOVItemsGrid(item.id)
        
        // Bonus: Si estamos despachando, el panel derecho puede sugerir bines automáticamente
        if (panel === 'source' && mode === 'DESPACHAR') {
          const suggested = await getSuggestedBinesForOVGrid(item.id)
          setTarget(prev => ({
            ...prev,
            level: suggested.length > 0 ? 'BINES' : prev.level,
            breadcrumb: suggested.length > 0 ? ['Bines Sugeridos'] : prev.breadcrumb,
            items: suggested.length > 0 ? suggested : prev.items
          }))
        }
      }
      
      setState({
        level: nextLevel,
        id: item.id,
        breadcrumb: [...currentState.breadcrumb, item.label],
        items: nextItems
      })
    } catch (err) {
      console.error('Error navigating hierarchy:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = (panel: 'source' | 'target') => {
    // Para simplificar por ahora, retroceder al estado inicial del modo
    resetPanels()
  }

  const handleConfirm = async () => {
    if (processing) return
    setProcessing(true)
    
    try {
      const res = await processUnifiedMovement({
        mode,
        sourceId: activeOrderId || source.id || '',
        targetId: targetSelection?.id || target.id || '',
        itemId: sourceSelection?.id,
        cantidad,
        precioUnitario: precioValidado,
        notas,
        bodegaId: activeBodegaId,
        metadata: sourceSelection?.metadata
      })

      if ((res as any).error) {
        alert(`Error: ${(res as any).error}`)
      } else {
        alert('Movimiento procesado con éxito')
        setSourceSelection(null)
        setTargetSelection(null)
        setCantidad(1)
        resetPanels()
      }
    } catch (err: any) {
      alert(`Error crítico: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-neu-bg p-4 space-y-4">
      {/* Menu Superior de Modos */}
      <div className="flex items-center justify-between bg-neu-base border border-neu-300 rounded-3xl p-3 shadow-neu">
        <div className="flex bg-neu-200 p-1.5 rounded-2xl gap-1">
          <ModeButton 
            active={mode === 'INGRESAR'} 
            onClick={() => setMode('INGRESAR')} 
            icon={<TrendingUp className="w-4 h-4" />} 
            label="Ingresar" 
            color="primary"
          />
          <ModeButton 
            active={mode === 'TRASLADAR'} 
            onClick={() => setMode('TRASLADAR')} 
            icon={<Repeat2 className="w-4 h-4" />} 
            label="Trasladar" 
            color="amber"
          />
          <ModeButton 
            active={mode === 'DESPACHAR'} 
            onClick={() => setMode('DESPACHAR')} 
            icon={<TrendingDown className="w-4 h-4" />} 
            label="Despachar" 
            color="purple"
          />
          <ModeButton 
            active={mode === 'AJUSTAR'} 
            onClick={() => setMode('AJUSTAR')} 
            icon={<AlertCircle className="w-4 h-4" />} 
            label="Ajustar" 
            color="red"
          />
        </div>

        {mode === 'AJUSTAR' && (
          <div className="flex bg-neu-200 p-1 rounded-2xl gap-1">
            <button 
              onClick={() => setAjusteTipo('entrada')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ajusteTipo === 'entrada' ? 'bg-white shadow-sm text-primary-600' : 'text-muted-foreground hover:bg-white/50'}`}
            >
              📥 Entrada
            </button>
            <button 
              onClick={() => setAjusteTipo('salida')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ajusteTipo === 'salida' ? 'bg-white shadow-sm text-red-600' : 'text-muted-foreground hover:bg-white/50'}`}
            >
              📤 Salida
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 px-4">
          <div className="text-right">
            <h2 className="text-sm font-black uppercase text-foreground leading-none">Command Center WMS</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Unified Movement Interface</p>
          </div>
          <div className="p-2 bg-neu-100 rounded-xl">
            <Package className="w-5 h-5 text-primary-500" />
          </div>
        </div>
      </div>

      {/* Grid Dual de Navegación */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <VisualHierarchyGrid 
          title="ORIGEN / FUENTE"
          level={source.level}
          items={source.items.map(i => ({ ...i, isSelected: i.id === sourceSelection?.id }))}
          breadcrumb={source.breadcrumb}
          onSelect={(item) => handleSelect('source', item)}
          onBack={source.breadcrumb.length > 1 ? () => handleBack('source') : undefined}
          loading={loading}
        />

        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="w-14 h-14 bg-white border-4 border-neu-200 rounded-full flex items-center justify-center shadow-neu animate-pulse">
            <ArrowRightLeft className="w-6 h-6 text-primary-600" />
          </div>
        </div>

        <VisualHierarchyGrid 
          title="DESTINO / UBICACIÓN"
          level={target.level}
          items={target.items.map(i => ({ ...i, isSelected: i.id === targetSelection?.id }))}
          breadcrumb={target.breadcrumb}
          onSelect={(item) => handleSelect('target', item)}
          onBack={target.breadcrumb.length > 1 ? () => handleBack('target') : undefined}
          loading={loading}
        />
      </div>

      {/* Barra de Confirmación / Validación Inferior */}
      <div className="bg-white border-2 border-primary-100 rounded-3xl p-6 shadow-neu-lg animate-in slide-in-from-bottom-4 duration-500">
        {mode === 'INGRESAR' && sourceSelection && targetSelection ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 flex items-center gap-6">
              <div className="p-4 bg-primary-100 rounded-2xl">
                <ShoppingCart className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-1">Validación de Ingreso</span>
                <span className="text-sm font-black text-foreground truncate max-w-[300px]">{sourceSelection.label}</span>
                <span className="text-[10px] font-bold text-muted-foreground">{sourceSelection.sublabel}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 bg-neu-100 p-2 rounded-2xl">
              <div className="flex flex-col gap-1 px-4">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Cantidad Recibida</label>
                <input 
                  type="number" 
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-24 bg-transparent border-b-2 border-primary-300 outline-none font-black text-lg text-primary-700 focus:border-primary-600 transition-all"
                />
                <span className="text-[8px] font-bold text-amber-600">Esperado: {sourceSelection.count}</span>
              </div>

              <div className="h-10 w-px bg-neu-300 hidden md:block" />

              <div className="flex flex-col gap-1 px-4">
                <label className="text-[9px] font-black uppercase text-muted-foreground">Valor Unitario ($)</label>
                <input 
                  type="number" 
                  value={precioValidado}
                  onChange={(e) => setPrecioValidado(Number(e.target.value))}
                  className="w-32 bg-transparent border-b-2 border-primary-300 outline-none font-black text-lg text-emerald-700 focus:border-primary-600 transition-all"
                />
                <span className="text-[8px] font-bold text-emerald-600">Pactado: ${sourceSelection.price}</span>
              </div>
            </div>

            <button 
              onClick={handleConfirm}
              disabled={processing}
              className="px-12 py-4 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 transition-all shadow-md active:scale-95 flex items-center gap-3"
            >
              {processing ? 'Procesando...' : 'Confirmar e Ingresar'}
              <Plus className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <LocationSummary 
                label="Origen" 
                path={source.breadcrumb} 
                selection={sourceSelection?.label}
                icon={<Box className="w-5 h-5 text-amber-500" />}
              />
              <ChevronRight className="w-6 h-6 text-neu-300" />
              <LocationSummary 
                label="Destino" 
                path={target.breadcrumb} 
                selection={targetSelection?.label}
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {mode !== 'AJUSTAR' && (
                <div className="flex-1 md:w-32 group">
                  <input 
                    type="number" 
                    placeholder="Cant."
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-neu-100 border-2 border-transparent rounded-2xl outline-none font-black text-center text-lg transition-all focus:border-primary-400 focus:bg-white shadow-neu-inset"
                  />
                </div>
              )}
              <button 
                onClick={handleConfirm}
                disabled={processing || (!sourceSelection && mode !== 'AJUSTAR') || !targetSelection}
                className="flex-1 md:flex-none px-10 py-3 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? 'Procesando...' : 'Confirmar Movimiento'}
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ModeButton({ active, onClick, icon, label, color }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color: string }) {
  const colorClasses = {
    primary: active ? 'bg-primary-600 text-white' : 'text-primary-600 hover:bg-white',
    amber: active ? 'bg-amber-500 text-white' : 'text-amber-600 hover:bg-white',
    purple: active ? 'bg-purple-600 text-white' : 'text-purple-600 hover:bg-white',
    red: active ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-white',
  }
  
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      {icon}
      {label}
    </button>
  )
}

function LocationSummary({ label, path, selection, icon }: { label: string, path: string[], selection?: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-3 bg-neu-100 rounded-2xl">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-black text-foreground truncate max-w-[200px]">
          {selection || path[path.length - 1] || 'Sin selección'}
        </p>
      </div>
    </div>
  )
}
