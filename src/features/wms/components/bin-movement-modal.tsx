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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && activeOC) {
      loadItems()
    }
  }, [isOpen, activeOC])

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getOCItemsGrid(activeOC.id)
      setItems(data)
      
      // Inicializar cantidades con el total pendiente
      const initialQtys: Record<string, number> = {}
      data.forEach(item => {
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
      // Procesamos cada item que tenga cantidad > 0
      const promises = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = items.find(i => i.id === itemId)
          return processUnifiedMovement({
            mode: 'INGRESAR',
            sourceId: activeOC.id,
            targetId: targetBin.id,
            itemId: itemId.startsWith('GROUP|') ? undefined : itemId,
            cantidad: qty,
            metadata: item?.metadata,
            bodegaId: targetBin.bodega_id
          })
        })

      const results = await Promise.all(promises)
      const firstError = results.find(r => r.error)
      
      if (firstError) {
        setError(firstError.error)
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {items.map(item => (
                  <div key={item.id} className="p-5 bg-slate-50 border border-slate-100 rounded-[24px] flex items-center justify-between group hover:border-primary-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                        {item.icon === 'Shirt' ? <Shirt className="w-4 h-4 text-primary-600" /> : <Package className="w-4 h-4 text-slate-500" />}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-slate-800">{item.label}</span>
                          {item.price > 0 && (
                            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-200">
                              Val: ${item.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight whitespace-pre-line">{item.sublabel}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                       <span className="text-[9px] font-black text-slate-400 uppercase">Cantidad a recibir</span>
                       <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setQuantities(q => ({ ...q, [item.id]: Math.max(0, (q[item.id] || 0) - 1) }))}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-all font-black"
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            className="w-16 h-8 text-center bg-transparent border-b-2 border-slate-200 text-sm font-black focus:border-primary-500 outline-none"
                            value={quantities[item.id] || 0}
                            onChange={e => setQuantities(q => ({ ...q, [item.id]: parseInt(e.target.value) || 0 }))}
                          />
                          <button 
                            onClick={() => setQuantities(q => ({ ...q, [item.id]: (q[item.id] || 0) + 1 }))}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-all font-black"
                          >
                            +
                          </button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Unidades</span>
            <span className="text-lg font-black text-slate-800">
              {Object.values(quantities).reduce((a, b) => a + b, 0)} <span className="text-xs text-slate-400">ítems</span>
            </span>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-700"
            >
              Cancelar
            </button>
            <button 
              onClick={handleProcess}
              disabled={processing || loading || items.length === 0}
              className="px-10 py-3 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary-900/20 hover:bg-primary-700 active:scale-95 transition-all flex items-center gap-2"
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
