'use client'

import React, { useState } from 'react'
import { Modal } from '@/shared/components/modal'
import { Input } from '@/shared/components/ui/input' // Assuming this exists or using raw inputs
import { Button } from '@/shared/components/ui/button'
import { DollarSign, Calendar, CreditCard, FileText } from 'lucide-react'
import type { CarteraItem } from '../types'
import { registrarPago } from '@/features/configuracion/services/pagos-actions'
import { formatCurrency } from '@/shared/lib/utils'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  item: CarteraItem | null
}

export function RegistrarPagoModal({ isOpen, onClose, onSuccess, item }: Props) {
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('transferencia')
  const [referencia, setReferencia] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  if (!item) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!monto || Number(monto) <= 0) {
      toast.error('Monto inválido')
      return
    }

    setLoading(true)
    const { error } = await registrarPago({
      documento_id: item.id,
      documento_tipo: item.documento_tipo,
      tipo: item.tipo,
      monto: Number(monto),
      metodo_pago: metodo,
      referencia_bancaria: referencia,
      fecha_pago: fecha,
      notas: notas,
      tercero_id: null // Opcional, el backend puede inferirlo o pasamos el ID si lo tuviéramos
    })

    setLoading(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Pago registrado con éxito')
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago / Abono">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Info Info */}
        <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Documento selecionado</p>
            <h4 className="text-sm font-black text-slate-900">{item.codigo}</h4>
            <p className="text-xs text-slate-500 font-medium">{item.tercero_nombre}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Saldo pendiente</p>
            <span className="text-sm font-black text-primary-600">{formatCurrency(item.saldo_pendiente)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monto a pagar</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                step="0.01"
                required
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-bold"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                required
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-medium"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Método de Pago</label>
             <div className="relative">
               <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <select 
                 className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-medium appearance-none"
                 value={metodo}
                 onChange={(e) => setMetodo(e.target.value)}
               >
                 <option value="transferencia">Transferencia</option>
                 <option value="efectivo">Efectivo</option>
                 <option value="tarjeta">Tarjeta</option>
                 <option value="cheque">Cheque</option>
               </select>
             </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Referencia / Comprobante</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-medium"
                placeholder="ID de Transacción"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas Adicionales</label>
          <textarea
            className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-medium min-h-[100px]"
            placeholder="Anotaciones sobre el pago..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] px-4 py-3 rounded-xl bg-primary-600 text-white text-sm font-black uppercase tracking-wider hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar Registro'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
