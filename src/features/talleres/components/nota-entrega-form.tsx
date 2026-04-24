'use client'

import { useState } from 'react'
import { Package, X, Send, Plus, Minus } from 'lucide-react'
import { createEntrega } from '@/features/entregas/services/entregas-actions'
import { toast } from 'sonner'
import { cn } from '@/shared/lib/utils'

interface Props {
  op: any
  onClose: () => void
  onSuccess: () => void
}

export function NotaEntregaForm({ op, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [lineas, setLineas] = useState<any[]>(
    op.productos.map((p: any) => ({
      producto_id: p.producto.id,
      nombre: p.producto.nombre,
      referencia: p.producto.referencia,
      talla: 'Única', // Simplificado por ahora, idealmente vendría de op_detalle
      cantidad_asignada: p.cantidad_asignada,
      cantidad_entregada: 0
    }))
  )

  const handleUpdateQty = (idx: number, delta: number) => {
    setLineas(prev => prev.map((l, i) => {
      if (i === idx) {
        const newVal = Math.max(0, Math.min(l.cantidad_asignada, l.cantidad_entregada + delta))
        return { ...l, cantidad_entregada: newVal }
      }
      return l
    }))
  }

  const handleSubmit = async () => {
    const total = lineas.reduce((acc, l) => acc + l.cantidad_entregada, 0)
    if (total === 0) return toast.error('Debes entregar al menos una unidad')

    setLoading(true)
    try {
      const res = await createEntrega({
        op_id: op.id,
        fecha_entrega: new Date().toISOString().split('T')[0],
        notas: `Despacho autogestionado por taller`,
        lineas: lineas.map(l => ({
          producto_id: l.producto_id,
          talla: l.talla,
          cantidad_entregada: l.cantidad_entregada
        }))
      })

      if (res.error) throw new Error(res.error)
      toast.success('Nota de entrega generada correctamente')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Error al generar entrega')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Nueva Nota de Entrega</p>
            <h2 className="text-3xl font-black uppercase tracking-tighter">OP-{op.codigo}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-10 space-y-8">
          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
            {lineas.map((l, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase">{l.nombre}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{l.referencia} • Pendiente: {l.cantidad_asignada}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleUpdateQty(idx, -1)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-black text-slate-900 tabular-nums w-12 text-center">
                    {l.cantidad_entregada}
                  </span>
                  <button 
                    onClick={() => handleUpdateQty(idx, 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Unidades</p>
              <p className="text-3xl font-black text-slate-900">
                {lineas.reduce((acc, l) => acc + l.cantidad_entregada, 0)}
              </p>
            </div>
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="px-8 py-4 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-primary-600 transition-all shadow-xl disabled:opacity-50"
            >
              {loading ? 'Procesando...' : (
                <>
                  Generar Despacho <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
