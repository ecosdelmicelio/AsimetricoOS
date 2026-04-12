'use client'

import { useState } from 'react'
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  MapPin,
  Box
} from 'lucide-react'
import { processUnifiedMovement } from '@/features/wms/services/center-actions'

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
              Confirmar Movimiento
            </button>
            <button 
              onClick={onClose}
              disabled={processing}
              className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
            >
              Omitir y Volver
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
