'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  MapPin,
  Box,
  Package
} from 'lucide-react'
import { processUnifiedMovement, getBinItemsGrid } from '@/features/wms/services/center-actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  sourceBin: any
  targetPos: any
  onSuccess: () => void
}

export function TransferConfirmationModal({ isOpen, onClose, sourceBin, targetPos, onSuccess }: Props) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && sourceBin?.id) {
      setLoading(true)
      getBinItemsGrid(sourceBin.id).then(data => {
        setItems(data)
        setLoading(false)
      })
    }
  }, [isOpen, sourceBin])

  const handleConfirm = async () => {
    setProcessing(true)
    setError(null)
    
    try {
      const res = await processUnifiedMovement({
        mode: 'TRASLADAR',
        sourceId: sourceBin.id,
        targetId: targetPos.id, // En modo TRASLADAR interpretamos targetId como posicion destino si es bin completo
        bodegaId: sourceBin.bodega_id,
        cantidad: 0 // 0 indica "Bin completo" para este modo unificado
      })
      
      if (res.error) {
        setError(res.error)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar traslado')
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[48px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col p-8 animate-in zoom-in-95 duration-300 font-sans">
        
        <div className="flex flex-col items-center text-center gap-6">
          <div className="p-4 bg-primary-100 rounded-full">
            <Box className="w-8 h-8 text-primary-600 animate-pulse" />
          </div>
          
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">¿Confirmar Traslado?</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Movimiento de Bulto Completo</p>
          </div>

          <div className="w-full bg-slate-50 rounded-[32px] p-6 border border-slate-100 flex items-center justify-between gap-4">
             <div className="flex flex-col items-center gap-2">
               <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm">
                 <Box className="w-5 h-5 text-slate-400" />
               </div>
               <span className="text-[10px] font-black text-slate-800">{sourceBin?.codigo}</span>
             </div>

             <ArrowRight className="w-5 h-5 text-primary-500 animate-in slide-in-from-left-4 repeat-infinite duration-1000" />

             <div className="flex flex-col items-center gap-2">
               <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200">
                 <MapPin className="w-5 h-5 text-white" />
               </div>
               <span className="text-[10px] font-black text-primary-600">{targetPos?.nombre || targetPos?.codigo}</span>
             </div>
          </div>

          {/* LISTA DE CONTENIDO PARA AUDITORIA RAPIDA */}
          <div className="w-full bg-slate-100/50 rounded-3xl p-4 border border-slate-200/50">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left">Resumen de Contenido</p>
             <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                {loading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary-500" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase italic">Verificando items...</span>
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-[9px] font-bold text-slate-400 uppercase italic py-2">Bin Vacío</p>
                ) : (
                  items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-left">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-700 uppercase leading-none">{item.label}</span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 tracking-tight">Talla {item.metadata.talla} · {item.metadata.referencia}</span>
                       </div>
                       <span className="text-[10px] font-black text-primary-600">x{item.count}</span>
                    </div>
                  ))
                )}
             </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-left">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-[10px] font-bold">{error}</p>
            </div>
          )}

          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={handleConfirm}
              disabled={processing}
              className="w-full py-4 bg-slate-800 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar Movimiento Completo
            </button>
            <button 
              onClick={() => {
                onClose()
                // Disparamos un evento personalizado o usamos un callback para abrir el otro modal
                window.dispatchEvent(new CustomEvent('OPEN_PARTIAL_TRANSFER', { 
                  detail: { sourceBin, targetPos } 
                }))
              }}
              disabled={processing}
              className="w-full py-4 border-2 border-primary-500 text-primary-600 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              Escoger items/tallas
            </button>
            <button 
              onClick={onClose}
              disabled={processing}
              className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
