'use client'

import { useState } from 'react'
import { 
  DollarSign, 
  FileText, 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  ArrowDownRight,
  TrendingUp
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/shared/lib/utils'
import { RegistrarPagoModal } from '@/shared/components/modals/registrar-pago-modal'
import { updateFacturacion } from '@/features/configuracion/services/pagos-actions'
import type { EstadoPago } from '@/features/ordenes-venta/types'

interface Props {
  oc: any 
  pagos: any[]
}

export function OCFinancialPanel({ oc, pagos }: Props) {
  const [isRegistrarModalOpen, setIsRegistrarModalOpen] = useState(false)
  const [isEditingFactura, setIsEditingFactura] = useState(false)
  
  const [numFactura, setNumFactura] = useState(oc.numero_factura_proveedor || '')
  const [fechaFactura, setFechaFactura] = useState(oc.fecha_factura_proveedor || '')
  const [plazo, setPlazo] = useState(oc.plazo_pago_dias?.toString() || '30')
  const [totalFacturado, setTotalFacturado] = useState(oc.total_facturado?.toString() || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveFactura = async () => {
    setIsSaving(true)
    try {
      await updateFacturacion('oc', oc.id, {
        numero_factura: numFactura,
        fecha_factura: fechaFactura,
        plazo_pago_dias: parseInt(plazo),
        total_facturado: parseFloat(totalFacturado) || 0
      })
      setIsEditingFactura(false)
    } finally {
      setIsSaving(false)
    }
  }

  const facturado = Number(oc.total_facturado) || 0
  const pagado = Number(oc.total_pagado) || 0
  const pendiente = facturado - pagado
  const porcentajePagado = facturado > 0 ? (pagado / facturado) * 100 : 0
  
  const estadoPago: EstadoPago = oc.estado_pago || 'pendiente'
  const isVencida = oc.fecha_vencimiento && new Date(oc.fecha_vencimiento) < new Date() && estadoPago !== 'pagada'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 shadow-inner">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-red-500" />
              Estado de Cuentas por Pagar (CxP)
            </h3>
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
              estadoPago === 'pagada' ? "bg-emerald-100 text-emerald-700" :
              estadoPago === 'parcial' ? "bg-amber-100 text-amber-700" :
              isVencida ? "bg-red-100 text-red-700 animate-pulse" : "bg-slate-200 text-slate-600"
            )}>
              {isVencida && <AlertCircle className="w-3 h-3" />}
              {isVencida ? 'VENCIDA' : estadoPago}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Monto de Factura</span>
              <p className="text-lg font-black text-slate-900 leading-none">{formatCurrency(facturado)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Pagado</span>
              <p className="text-lg font-black text-emerald-600 leading-none">{formatCurrency(pagado)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
              <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block mb-1">Saldo Pendiente</span>
              <p className="text-lg font-black text-red-600 leading-none">{formatCurrency(pendiente)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">
              <span>Progreso de Pago</span>
              <span>{Math.round(porcentajePagado)}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner flex">
              <div 
                className="h-full bg-primary-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                style={{ width: `${porcentajePagado}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagos Realizados</h4>
            <button 
              disabled={facturado <= 0}
              onClick={() => setIsRegistrarModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
              Notificar Pago
            </button>
          </div>
          
          <div className="space-y-2">
            {pagos.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Sin pagos registrados</p>
              </div>
            ) : (
              pagos.map((p) => (
                <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                      <ArrowDownRight className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm leading-tight">{formatCurrency(p.monto)}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" /> {formatDate(p.fecha_pago)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5" /> {p.metodo_pago}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3 h-3 text-red-500" />
              Detalle Proveedor
            </h3>
            {!isEditingFactura && (
              <button 
                onClick={() => setIsEditingFactura(true)}
                className="text-[9px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest"
              >
                {oc.numero_factura_proveedor ? 'Editar' : 'Ingresar'}
              </button>
            )}
          </div>

          {!isEditingFactura ? (
            <div className="space-y-4">
              <FacturaItem label="Factura #" value={oc.numero_factura_proveedor || '—'} icon={<Hash className="w-3 h-3 text-slate-400"/>} />
              <FacturaItem label="Fecha Factura" value={oc.fecha_factura_proveedor ? formatDate(oc.fecha_factura_proveedor) : '—'} icon={<Calendar className="w-3 h-3 text-slate-400"/>} />
              <FacturaItem label="Vencimiento" value={oc.fecha_vencimiento ? formatDate(oc.fecha_vencimiento) : '—'} icon={<Clock className={cn("w-3 h-3", isVencida ? "text-red-500" : "text-slate-400")}/>} />
              <FacturaItem label="Días Plazo" value={oc.plazo_pago_dias ? `${oc.plazo_pago_dias} días` : '30 días'} icon={<TrendingUp className="w-3 h-3 text-slate-400"/>} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase">Factura del Proveedor</label>
                <input 
                  type="text" 
                  value={numFactura} 
                  onChange={e => setNumFactura(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="Ej: FAC-4455"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase">Valor Facturado (Inc. IVA)</label>
                <input 
                  type="number" 
                  value={totalFacturado} 
                  onChange={e => setTotalFacturado(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase">Fecha</label>
                  <input 
                    type="date" 
                    value={fechaFactura} 
                    onChange={e => setFechaFactura(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase">Días Plazo</label>
                  <input 
                    type="number" 
                    value={plazo} 
                    onChange={e => setPlazo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsEditingFactura(false)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-[9px] font-black uppercase text-slate-500"
                >
                  Cancelar
                </button>
                <button 
                  disabled={isSaving}
                  onClick={handleSaveFactura}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary-600 text-white text-[9px] font-black uppercase shadow-lg shadow-primary-200 disabled:opacity-50"
                >
                  {isSaving ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <RegistrarPagoModal 
        isOpen={isRegistrarModalOpen}
        onClose={() => setIsRegistrarModalOpen(false)}
        documentoId={oc.id}
        documentoTipo="oc"
        terceroId={oc.proveedor_id}
        terceroNombre={oc.terceros?.nombre || 'Proveedor'}
        montoSugerido={pendiente > 0 ? pendiente : undefined}
        tipo="egreso"
      />
    </div>
  )
}

function FacturaItem({ label, value, icon }: any) {
  return (
    <div className="flex items-center justify-between py-1 px-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xs font-black text-slate-900">{value}</span>
    </div>
  )
}
