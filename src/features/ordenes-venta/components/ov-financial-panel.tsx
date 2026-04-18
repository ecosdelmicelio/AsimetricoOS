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
  ArrowUpRight
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/shared/lib/utils'
import { RegistrarPagoModal } from '@/shared/components/modals/registrar-pago-modal'
import { updateFacturacion } from '@/features/configuracion/services/pagos-actions'
import type { OrdenVenta, EstadoPago } from '../types'
import type { Pago } from '@/features/configuracion/types/pagos'

interface Props {
  ov: any // Using any because Tables<'ordenes_venta'> might not have new fields yet in local types
  pagos: any[]
}

export function OVFinancialPanel({ ov, pagos }: Props) {
  const [isRegistrarModalOpen, setIsRegistrarModalOpen] = useState(false)
  const [isEditingFactura, setIsEditingFactura] = useState(false)
  
  // Local state for billing form
  const [numFactura, setNumFactura] = useState(ov.numero_factura || '')
  const [fechaFactura, setFechaFactura] = useState(ov.fecha_factura || '')
  const [plazo, setPlazo] = useState(ov.plazo_pago_dias?.toString() || '30')
  const [totalFacturado, setTotalFacturado] = useState(ov.total_facturado?.toString() || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveFactura = async () => {
    setIsSaving(true)
    try {
      await updateFacturacion('ov', ov.id, {
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

  const facturado = Number(ov.total_facturado) || 0
  const pagado = Number(ov.total_pagado) || 0
  const pendiente = facturado - pagado
  const porcentajeCobrado = facturado > 0 ? (pagado / facturado) * 100 : 0
  
  const estadoPago: EstadoPago = ov.estado_pago || 'pendiente'
  const isVencida = ov.fecha_vencimiento && new Date(ov.fecha_vencimiento) < new Date() && estadoPago !== 'pagada'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Resumen de Cartera */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 shadow-inner">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-emerald-500" />
              Estado de Cobranza (CxC)
            </h3>
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
              estadoPago === 'pagada' ? "bg-emerald-100 text-emerald-700" :
              estadoPago === 'parcial' ? "bg-amber-100 text-amber-700" :
              isVencida ? "bg-red-100 text-red-700 animate-pulse" : "bg-slate-200 text-slate-600"
            )}>
              {isVencida && <AlertCircle className="w-3 h-3" />}
              {isVencida ? 'FACTURA VENCIDA' : estadoPago}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Facturado</span>
              <p className="text-lg font-black text-slate-900 leading-none">{formatCurrency(facturado)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Cobrado</span>
              <p className="text-lg font-black text-emerald-600 leading-none">{formatCurrency(pagado)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-primary-100 shadow-sm">
              <span className="text-[8px] font-black text-primary-400 uppercase tracking-widest block mb-1">Saldo Pendiente</span>
              <p className="text-lg font-black text-primary-600 leading-none">{formatCurrency(pendiente)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">
              <span>Progreso de Recaudo</span>
              <span>{Math.round(porcentajeCobrado)}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner flex">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                style={{ width: `${porcentajeCobrado}%` }}
              />
            </div>
          </div>
        </div>

        {/* Historial de Pagos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial de Transacciones</h4>
            <button 
              onClick={() => setIsRegistrarModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              <Plus className="w-3 h-3" />
              Nuevo Recaudo
            </button>
          </div>
          
          <div className="space-y-2">
            {pagos.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Sin movimientos registrados</p>
              </div>
            ) : (
              pagos.map((p) => (
                <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                      <ArrowUpRight className="w-5 h-5" />
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
                  <div className="text-right sr-only sm:not-sr-only">
                    <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Registrado por</p>
                    <p className="text-[9px] font-bold text-slate-500">{p.profiles?.full_name || 'Sistema'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Configuración de Factura (Card Lateral) */}
      <div className="space-y-6">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-6 lg:sticky lg:top-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3 h-3 text-primary-500" />
              Detalle Comercial
            </h3>
            {!isEditingFactura && (
              <button 
                onClick={() => setIsEditingFactura(true)}
                className="text-[9px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest"
              >
                {ov.numero_factura ? 'Editar' : 'Facturar'}
              </button>
            )}
          </div>

          {!isEditingFactura ? (
            <div className="space-y-4">
              <FacturaItem label="Factura #" value={ov.numero_factura || '—'} icon={<Hash className="w-3 h-3 text-slate-400"/>} />
              <FacturaItem label="Fecha Factura" value={ov.fecha_factura ? formatDate(ov.fecha_factura) : '—'} icon={<Calendar className="w-3 h-3 text-slate-400"/>} />
              <FacturaItem label="Vencimiento" value={ov.fecha_vencimiento ? formatDate(ov.fecha_vencimiento) : '—'} icon={<Clock className={cn("w-3 h-3", isVencida ? "text-red-500" : "text-slate-400")}/>} />
              <FacturaItem label="Días Plazo" value={ov.plazo_pago_dias ? `${ov.plazo_pago_dias} días` : '30 días (Standard)'} icon={<TrendingUp className="w-3 h-3 text-slate-400"/>} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase">Número de Factura</label>
                <input 
                  type="text" 
                  value={numFactura} 
                  onChange={e => setNumFactura(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="Ej: FE-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase">Total Bruto Facturado</label>
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
                  <label className="text-[8px] font-black text-slate-500 uppercase">Plazo (Días)</label>
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
          
          {/* Quick Stats */}
          <div className="mt-8 pt-6 border-t border-slate-100">
             <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider">Cumplimiento Financiero</span>
             </div>
             <div className="space-y-3">
                <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-xl">
                  <span className="text-[8px] font-bold text-emerald-700 uppercase">Saldo Neto</span>
                  <span className="text-xs font-black text-emerald-700">{formatCurrency(pendiente)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <RegistrarPagoModal 
        isOpen={isRegistrarModalOpen}
        onClose={() => setIsRegistrarModalOpen(false)}
        documentoId={ov.id}
        documentoTipo="ov"
        terceroId={ov.cliente_id}
        terceroNombre={ov.terceros?.nombre || 'Cliente'}
        montoSugerido={pendiente > 0 ? pendiente : undefined}
        tipo="ingreso"
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

function TrendingUp(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
