'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Wrench, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Package,
  PlusCircle,
  MinusCircle
} from 'lucide-react'
import { getBinItemsGrid, getAdjustmentReasons, processUnifiedMovement } from '@/features/wms/services/center-actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  bin: any
  onSuccess: () => void
}

export function BinAdjustmentModal({ isOpen, onClose, bin, onSuccess }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [reasons, setReasons] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [adjustmentType, setAdjustmentType] = useState<'entrada' | 'salida'>('salida')
  const [reasonId, setReasonId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && bin) {
      loadData()
    }
  }, [isOpen, bin])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [gridItems, adjReasons] = await Promise.all([
        getBinItemsGrid(bin.id),
        getAdjustmentReasons()
      ])
      setItems(gridItems)
      setReasons(adjReasons)
      if (gridItems.length > 0) setSelectedItem(gridItems[0])
      if (adjReasons.length > 0) setReasonId(adjReasons[0].id)
    } catch (err: any) {
      setError('Error al cargar datos del bin')
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async () => {
    if (!selectedItem || !reasonId) return
    setProcessing(true)
    setError(null)
    
    try {
      const res = await processUnifiedMovement({
        mode: 'AJUSTAR',
        sourceId: 'N/A', 
        targetId: bin.id,
        itemId: selectedItem.id,
        cantidad: quantity,
        notas: notes || `Ajuste manual: ${selectedItem.label}`,
        bodegaId: bin.bodega_id,
        metadata: {
          producto_id: selectedItem.id,
          talla: selectedItem.sublabel?.split(' — ')[0],
          adjustmentType: adjustmentType
        }
      })
      
      if (res.error) {
        setError(res.error)
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar ajuste')
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-300 font-sans">
        
        {/* Header */}
        <div className="p-6 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-700 rounded-xl shadow-inner">
              <Wrench className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Ajustar Inventario</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Bin: {bin?.codigo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-full transition-all">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p className="text-[11px] font-bold">{error}</p>
            </div>
          ) : (
            <>
              {/* Selector de Item */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Producto en Bin</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[11px] font-black outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedItem?.id}
                  onChange={e => setSelectedItem(items.find(i => i.id === e.target.value))}
                >
                  {items.map(i => <option key={i.id} value={i.id}>{i.label} — {i.sublabel}</option>)}
                </select>
              </div>

              {/* Toggle Tipo */}
              <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={() => setAdjustmentType('salida')}
                  className={`py-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${adjustmentType === 'salida' ? 'bg-red-50 border-red-500 text-red-600 shadow-md' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}
                 >
                   <MinusCircle className="w-5 h-5" />
                   <span className="text-[9px] font-black uppercase tracking-widest italic">Salida / Merma</span>
                 </button>
                 <button 
                  onClick={() => setAdjustmentType('entrada')}
                  className={`py-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${adjustmentType === 'entrada' ? 'bg-green-50 border-green-500 text-green-600 shadow-md' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}
                 >
                   <PlusCircle className="w-5 h-5" />
                   <span className="text-[9px] font-black uppercase tracking-widest italic">Entrada / Hallazgo</span>
                 </button>
              </div>

              {/* Cantidad y Motivo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Cantidad</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[13px] font-black text-center outline-none focus:ring-2 focus:ring-primary-500"
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Motivo</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-black outline-none"
                    value={reasonId}
                    onChange={e => setReasonId(e.target.value)}
                  >
                    {reasons.filter(r => r.tipo === adjustmentType).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em]">Observaciones</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-bold outline-none h-20 resize-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Explica el motivo del ajuste..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancelar</button>
          <button 
            onClick={handleProcess}
            disabled={processing || loading || items.length === 0}
            className={`flex-1 py-3 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${adjustmentType === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${processing ? 'opacity-50' : ''}`}
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar Ajuste
          </button>
        </div>
      </div>
    </div>
  )
}
