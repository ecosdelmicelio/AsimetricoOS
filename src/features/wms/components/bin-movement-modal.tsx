'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Package, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Shirt,
  Layers
} from 'lucide-react'
import { getOCItemsGrid, processUnifiedMovement } from '@/features/wms/services/center-actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  activeOC: any
  targetBin: any
  onSuccess: () => void
}

export function BinMovementModal({ isOpen, onClose, activeOC, targetBin, onSuccess }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loteProveedor, setLoteProveedor] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [markCompleted, setMarkCompleted] = useState(false)

  useEffect(() => {
    if (isOpen && activeOC) {
      loadItems()
      setMarkCompleted(false)
    }
  }, [isOpen, activeOC])

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getOCItemsGrid(activeOC.id)
      
      // DESGLOSE DE GRUPOS: Si un item es un grupo, lo expandimos a sus hijos (tallas)
      const flattenedItems: any[] = []
      data.forEach(item => {
        if (item.metadata?.isGroup && item.metadata?.children) {
          flattenedItems.push(...item.metadata.children)
        } else {
          flattenedItems.push(item)
        }
      })

      setItems(flattenedItems)
      
      // Inicializar cantidades con el total pendiente
      const initialQtys: Record<string, number> = {}
      flattenedItems.forEach(item => {
        initialQtys[item.id] = item.count
      })
      setQuantities(initialQtys)
    } catch (err: any) {
      setError('Error al cargar items de la OC')
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async () => {
    setProcessing(true)
    setError(null)
    
    try {
      const selectedItems = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = items.find(i => i.id === itemId)
          return {
            producto_id: item?.metadata?.producto_id || undefined,
            material_id: item?.metadata?.material_id || undefined,
            talla: item?.metadata?.talla || '...',
            cantidad: qty,
            precio_unitario: item?.price || 0,
            unidad: item?.metadata?.unidad || 'unidades',
            lote_proveedor: loteProveedor || undefined
          }
        })

      if (selectedItems.length === 0) {
        setError('Debes ingresar al menos una unidad')
        setProcessing(false)
        return
      }

      // Enviar todo en un solo lote para que si es NEW_BIN, cree un solo bin contenedor de todos
      const result = await processUnifiedMovement({
        mode: 'INGRESAR',
        sourceId: activeOC.id,
        targetId: targetBin.id,
        bodegaId: targetBin.bodega_id,
        cantidad: 0, // Ignorado porque usamos items array
        metadata: { label: items.find(i => quantities[i.id] > 0)?.label || 'CAJAS' },
        items: selectedItems as any
      })

      if (result && 'error' in result && result.error) {
        setError(result.error)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar movimiento')
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-600 rounded-2xl shadow-lg shadow-primary-100">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Confirmar Recepción OC</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{activeOC?.codigo}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{targetBin?.codigo}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
              <p className="text-[11px] font-black uppercase tracking-widest">Analizando contenido de OC...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lote Físico del Proveedor (Opcional)</label>
                <input
                  type="text"
                  value={loteProveedor}
                  onChange={(e) => setLoteProveedor(e.target.value)}
                  placeholder="Ej: LTR-2026-XQ..."
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all uppercase"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {Object.values(
                  items.reduce((acc: any, item) => {
                    const prodId = item.metadata?.producto_id || item.id;
                    if (!acc[prodId]) acc[prodId] = { ...item, originalLabel: item.label.split(' (')[0], groupChildren: [] };
                    acc[prodId].groupChildren.push(item);
                    return acc;
                  }, {})
                ).map((group: any) => (
                  <div key={group.id} className="p-5 bg-white border border-slate-200 shadow-sm rounded-[24px] flex flex-col gap-4 group-hover:border-primary-200 transition-all">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        {group.icon === 'Shirt' ? <Shirt className="w-4 h-4 text-primary-600" /> : <Package className="w-4 h-4 text-slate-500" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800">{group.originalLabel}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{group.sublabel.split(' — ')[0]}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {group.groupChildren.map((child: any) => (
                        <div key={child.id} className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-2xl p-2 min-w-[70px]">
                           <span className="text-[10px] font-black text-slate-500 uppercase leading-none">{child.metadata?.talla || child.label}</span>
                           <span className="text-[8px] font-bold text-slate-400 mb-1.5">${(child.price || 0).toLocaleString()}</span>
                           
                           <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg overflow-hidden w-full">
                              <button 
                                onClick={() => setQuantities(q => ({ ...q, [child.id]: Math.max(0, (q[child.id] || 0) - 1) }))}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all font-black"
                              >-</button>
                              <input 
                                type="number" 
                                className="w-8 h-6 text-center bg-transparent text-xs font-black focus:outline-none"
                                value={quantities[child.id] || 0}
                                onChange={e => setQuantities(q => ({ ...q, [child.id]: parseInt(e.target.value) || 0 }))}
                              />
                              <button 
                                onClick={() => setQuantities(q => ({ ...q, [child.id]: (q[child.id] || 0) + 1 }))}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all font-black"
                              >+</button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Unidades</span>
              <span className="text-lg font-black text-slate-800">
                {Object.values(quantities).reduce((a, b) => a + b, 0)} <span className="text-xs text-slate-400">ítems</span>
              </span>
            </div>
            
            <div className="flex flex-col pl-8 border-l border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Factura (Esperado)</span>
              <span className="text-lg font-black text-slate-800">
                ${items.reduce((acc, item) => acc + ((item.price || 0) * (item.count || 0)), 0).toLocaleString()}
              </span>
            </div>
            
            <div className="flex flex-col pl-8 border-l border-slate-200">
              <span className="text-[9px] font-black text-primary-500 uppercase tracking-widest">Valor Recepción Actual</span>
              <span className="text-lg font-black text-primary-700">
                ${Object.entries(quantities).reduce((acc, [id, qty]) => acc + (qty * (items.find(i => i.id === id)?.price || 0)), 0).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={processing}
              className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-700"
            >
              Cancelar
            </button>
            <button 
              onClick={handleProcess}
              disabled={processing || loading || items.length === 0}
              className="px-10 py-3 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary-900/20 hover:bg-primary-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Procesar Ingreso
            </button>
          </div>
        </div>

      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  )
}
