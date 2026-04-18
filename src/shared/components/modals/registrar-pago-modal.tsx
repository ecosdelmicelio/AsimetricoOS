'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/shared/components/modal'
import { registrarPago } from '@/features/configuracion/services/pagos-actions'
import { DollarSign, Calendar, Hash, FileText, CheckCircle2 } from 'lucide-react'
import type { MetodoPago, TipoDocumentoPago } from '@/features/configuracion/types/pagos'

interface Props {
  isOpen: boolean
  onClose: () => void
  documentoId?: string
  documentoTipo: TipoDocumentoPago
  terceroId: string
  terceroNombre: string
  montoSugerido?: number
  tipo: 'ingreso' | 'egreso'
}

export function RegistrarPagoModal({ 
  isOpen, 
  onClose, 
  documentoId, 
  documentoTipo, 
  terceroId, 
  terceroNombre,
  montoSugerido,
  tipo
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [monto, setMonto] = useState(montoSugerido?.toString() || '')
  const [metodo, setMetodo] = useState<MetodoPago>('transferencia')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const numMonto = parseFloat(monto)
    if (isNaN(numMonto) || numMonto <= 0) {
      setError('El monto debe ser un número mayor a cero.')
      return
    }

    startTransition(async () => {
      const result = await registrarPago({
        tipo,
        documento_tipo: documentoTipo,
        documento_id: documentoId,
        tercero_id: terceroId,
        monto: numMonto,
        metodo_pago: metodo,
        fecha_pago: fecha,
        referencia_bancaria: referencia,
        notas: notas.trim() || undefined
      })

      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tipo === 'ingreso' ? 'Registrar Recaudo (Cliente)' : 'Registrar Pago (Proveedor)'}
      description={`Registrar movimiento financiero para ${terceroNombre}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {/* Monto */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto del Pago</label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              required
              type="number"
              step="0.01"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Método */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Método</label>
            <select
              value={metodo}
              onChange={e => setMetodo(e.target.value as MetodoPago)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all capitalize"
            >
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="credito">Crédito / Cruzado</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha de Pago</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Referencia Bancaria */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Referencia / Comprobante</label>
          <div className="relative">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              placeholder="Ej: TRX-998822"
            />
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Observaciones</label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              placeholder="Detalles adicionales..."
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-[2] px-4 py-3 rounded-xl bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all disabled:opacity-50"
          >
            {isPending ? (
              'Guardando...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Registrar Movimiento
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
