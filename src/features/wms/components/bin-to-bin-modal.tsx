'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Box, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Package,
  MinusCircle,
  PlusCircle,
  ArrowRightLeft,
  ShoppingCart
} from 'lucide-react'
import { getBinItemsGrid, processUnifiedMovement } from '@/features/wms/services/center-actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  sourceBin: any
  targetBin: any
  onSuccess: () => void
}

export function BinToBinTransferModal({ isOpen, onClose, sourceBin, targetBin, onSuccess }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && sourceBin) {
      loadItems()
    }
  }, [isOpen, sourceBin])

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBinItemsGrid(sourceBin.id)
      setItems(data)
      
      // "Asi lo quiero": Cantidades totales por defecto para vaciado rápido
      const initialQtys: Record<string, number> = {}
      data.forEach(item => {
        initialQtys[item.id] = item.count || 0
      })
      setQuantities(initialQtys)
    } catch (err: any) {
      setError('Error al cargar contenido del bin origen')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQty = (itemId: string, delta: number, max: number) => {
    setQuantities(prev => {
      const newQty = Math.max(0, Math.min(max, (prev[itemId] || 0) + delta))
      return { ...prev, [itemId]: newQty }
    })
  }

  const handleProcess = async () => {
    setProcessing(true)
    setError(null)
    
    try {
      const itemsToMove = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = items.find(i => i.id === itemId)
          return {
            producto_id: item.metadata.producto_id,
            talla: item.metadata.talla,
            cantidad: qty,
            unidad: item.metadata.unidad || 'unidades'
          }
        })

      if (itemsToMove.length === 0) {
        throw new Error('Debes seleccionar al menos un producto para transferir')
      }

      const res = await processUnifiedMovement({
        mode: 'TRASLADAR',
        sourceId: sourceBin.id,
        targetId: targetBin.id,
        cantidad: 1, // Indica que usamos el array de items
        items: itemsToMove,
        bodegaId: sourceBin.bodega_id,
        notas: `Transferencia interna de items: ${sourceBin.codigo} -> ${targetBin.codigo}`
      })
      
      if (res && 'error' in res && res.error) {
        setError(res.error)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar transferencia')
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-300 font-sans">
        
        {/* Header - PRO Dynamic */}
        <div className="p-8 bg-slate-900 border-b border-slate-800 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-primary-600/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20">
              <ArrowRightLeft className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">Consola de Traslado Interno</h2>
              <div className="flex items-center gap-3 mt-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full w-fit">
                <span className="text-[10px] font-black text-primary-400 uppercase tracking-[0.2em]">{sourceBin?.codigo}</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">{targetBin?.codigo}</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Ítems Seleccionados</span>
            <span className="text-2xl font-black text-white mt-1">
              {Object.values(quantities).reduce((a, b) => a + b, 0)} <span className="text-sm font-bold text-slate-600 uppercase">un</span>
            </span>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Dynamic Two-Column Workspace */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT: SOURCE INVENTORY (60%) */}
          <div className="w-full lg:w-[60%] flex flex-col border-r border-slate-100 bg-slate-50/30">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                <Box className="w-4 h-4" /> Inventario en {sourceBin?.codigo}
              </h3>
              <button 
                onClick={() => {
                  const allQtys: Record<string, number> = {}
                  items.forEach(i => allQtys[i.id] = i.count)
                  setQuantities(allQtys)
                }}
                className="text-[9px] font-black text-primary-600 uppercase tracking-widest hover:text-primary-800 underline decoration-primary-200"
              >
                Mover todo el contenido
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escaneando contenido...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="py-20 text-center opacity-40">
                  <Package className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-bold text-sm tracking-tight text-slate-600">Este bin está vacío.</p>
                </div>
              ) : (
                items.map(item => (
                  <div 
                    key={item.id} 
                    className={`p-5 rounded-[32px] border transition-all flex items-center justify-between group ${quantities[item.id] > 0 ? 'bg-white border-primary-500 shadow-lg shadow-primary-500/5 ring-1 ring-primary-500/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                  >
                     <div className="flex items-center gap-5">
                       <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${quantities[item.id] > 0 ? 'bg-primary-500 border-primary-400 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                         {quantities[item.id] > 0 ? <CheckCircle2 className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                       </div>
                       <div>
                         <h4 className="text-[12px] font-black text-slate-800 uppercase leading-none">{item.label}</h4>
                         <div className="flex items-center gap-3 mt-2">
                           <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors ${(quantities[item.id] > 0) ? 'bg-primary-600 text-white border-primary-500' : 'bg-slate-900 text-white border-slate-800'}`}>
                             {item.metadata?.talla || 'U'}
                           </span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                             {item.metadata?.referencia || 'NO-REF'}
                           </span>
                         </div>
                       </div>
                     </div>

                     <div className="flex items-center gap-6">
                        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl p-1 gap-1">
                          <button 
                            onClick={() => handleUpdateQty(item.id, -1, item.count)}
                            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all shadow-sm active:scale-90"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <input 
                            type="number" 
                            className="w-12 text-center text-[14px] font-black outline-none bg-transparent text-slate-800"
                            value={quantities[item.id] || 0}
                            onChange={(e) => handleUpdateQty(item.id, parseInt(e.target.value || '0') - (quantities[item.id] || 0), item.count)}
                          />
                          <button 
                            onClick={() => handleUpdateQty(item.id, 1, item.count)}
                            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-green-50 text-slate-400 hover:text-green-500 rounded-xl transition-all shadow-sm active:scale-90"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-right min-w-[50px] border-l border-slate-200 pl-4">
                          <p className={`text-[12px] font-black ${quantities[item.id] >= item.count ? 'text-primary-600' : 'text-slate-800'}`}>{item.count}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">En Stock</p>
                        </div>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: TRANSFER SUMMARY / WAGON (40%) */}
          <div className="hidden lg:flex w-[40%] bg-slate-900 flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent" />
            
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary-500" /> Carrito de Traslado
              </h3>
              <button 
                onClick={() => setQuantities({})}
                className="text-[9px] font-black text-slate-600 uppercase hover:text-red-400 transition-colors"
              >
                Vaciar Carrito
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar-dark">
              {Object.entries(quantities).filter(([_, q]) => q > 0).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 text-center px-10">
                   <ArrowRightLeft className="w-12 h-12 mb-6 opacity-10" />
                   <p className="text-sm font-bold tracking-tight mb-2 uppercase text-slate-600">Nada seleccionado</p>
                   <p className="text-[10px] font-medium leading-relaxed italic">Usa los controles de la izquierda para llenar el carrito de traslado.</p>
                </div>
              ) : (
                Object.entries(quantities).filter(([_, q]) => q > 0).map(([itemId, qty]) => {
                  const item = items.find(i => i.id === itemId)
                  if (!item) return null
                  return (
                    <div key={itemId} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl animate-in slide-in-from-right-4 duration-300">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase truncate max-w-[140px]">{item.label}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-primary-400 uppercase tracking-widest">Talla {item.metadata?.talla}</span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full" />
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">{item.metadata?.referencia}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-white leading-none">+{qty}</span>
                        <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-1">Unidades</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Micro Stats Card */}
            {Object.entries(quantities).filter(([_, q]) => q > 0).length > 0 && (
              <div className="p-8 bg-slate-800/50 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Referencias Distintas</span>
                  <span className="text-[11px] font-black text-white">{new Set(Object.entries(quantities).filter(([_, q]) => q > 0).map(([id]) => items.find(i => i.id === id)?.label)).size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Total a Mover</span>
                  <span className="text-[11px] font-black text-primary-500 uppercase tracking-widest">
                    {Object.values(quantities).reduce((a, b) => a + b, 0)} Unidades
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar (Footer) */}
        <div className="p-8 bg-white border-t border-slate-100 flex gap-6 items-center">
          <div className="flex-1 hidden md:flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-[10px] font-medium text-slate-500 max-w-sm">
              Al confirmar, los ítems seleccionados se moverán del bin <span className="font-bold text-slate-800">{sourceBin?.codigo}</span> al bin <span className="font-bold text-slate-800">{targetBin?.codigo}</span>. Esta operación es atómica e inmediata.
            </p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={onClose} 
              className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-all border border-transparent hover:border-slate-100 rounded-3xl"
            >
              Cancelar
            </button>
            <button 
              onClick={handleProcess}
              disabled={processing || loading || Object.values(quantities).reduce((a, b) => a + b, 0) === 0}
              className="px-10 py-5 bg-slate-900 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-20 disabled:grayscale disabled:scale-100"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando Traslado...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>Confirmar y Ejecutar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  )
}
