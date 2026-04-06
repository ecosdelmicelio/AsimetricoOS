'use client'

import React, { useMemo } from 'react'
import { 
  Package, Factory, CheckCircle2, Truck, Calendar, Clock, 
  MapPin, ClipboardList, Info, ArrowUpRight, LucideIcon, 
  ChevronRight, Box, AlertCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import { Badge } from '@/shared/components/ui/badge'

interface Props {
  ov: any
  ops: any[]
  despachos: any[]
}

export function OVTrackerContent({ ov, ops, despachos }: Props) {
  // 1. Calcular progreso de producción
  const productionSummary = useMemo(() => {
    if (ops.length === 0) return { percent: 0, status: 'Pendiente de inicio' }
    
    // Simplificación: promediar progreso de las OPs (si hubiera un campo progreso; si no, por estado)
    const estadoWeights: Record<string, number> = {
      'programada': 10,
      'en_corte': 30,
      'en_confeccion': 60,
      'en_terminado': 80,
      'en_entregas': 90,
      'liquidada': 95,
      'completada': 100,
    }
    
    const sum = ops.reduce((acc, op) => acc + (estadoWeights[op.estado] || 0), 0)
    const avg = Math.round(sum / ops.length)
    
    let statusText = 'Producción en curso'
    if (avg >= 90) statusText = 'Terminando fabricación'
    if (avg >= 100) statusText = 'Fabricación completa'
    
    return { percent: avg, status: statusText }
  }, [ops])

  // 2. Definir estados del Stepper
  const steps = [
    { id: 'borrador', label: 'Orden Recibida', icon: ClipboardList, active: true },
    { id: 'confirmada', label: 'Confirmada', icon: CheckCircle2, active: ov.estado !== 'borrador' && ov.estado !== 'cancelada' },
    { id: 'en_produccion', label: 'En Producción', icon: Factory, active: ov.estado === 'en_produccion' || ov.estado === 'completada' },
    { id: 'despachada', label: 'Enviada', icon: Truck, active: despachos.length > 0 },
    { id: 'no_entrgada', label: 'Entregada', icon: MapPin, active: despachos.some(d => d.estado === 'entregado') },
  ]

  const currentStepIndex = steps.filter(s => s.active).length - 1

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Status Stepper (Glassmorphism inspired) */}
      <section className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 md:p-12 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 transition-all group-hover:scale-110" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isCompleted = idx < currentStepIndex
            const isActive = idx === currentStepIndex
            const isPending = idx > currentStepIndex
            
            return (
              <div key={step.id} className="flex-1 flex flex-row md:flex-col items-center gap-4 text-center group cursor-default">
                <div className={`
                  relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-500
                  ${isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-100' : ''}
                  ${isActive ? 'bg-primary-600 text-white shadow-xl shadow-primary-200 scale-110 ring-4 ring-primary-50' : ''}
                  ${isPending ? 'bg-slate-100 text-slate-300' : ''}
                `}>
                  <Icon className={`${isActive ? 'w-6 h-6 md:w-8 md:h-8' : 'w-5 h-5 md:w-7 md:h-7'} transition-transform group-hover:scale-110`} />
                  
                  {/* Connectors (Mobile: hidden, Desktop: visible) */}
                  {idx < steps.length - 1 && (
                    <div className={`hidden md:block absolute left-full top-1/2 w-full h-1 -translate-y-1/2 -z-10 transition-colors duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-slate-100'}`} />
                  )}
                </div>
                <div className="text-left md:text-center mt-0 md:mt-4">
                  <p className={`text-xs font-black uppercase tracking-widest mb-1 ${
                    isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-slate-400'
                  }`}>
                    {idx + 1}. {step.label}
                  </p>
                  <span className={`text-[10px] md:text-xs font-medium ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                    {isActive ? 'En este paso' : isCompleted ? 'Completado' : 'Próximamente'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lado izquierdo: Info & Producción */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Info Principal Card */}
          <div className="bg-white rounded-[2rem] shadow-lg shadow-slate-200/40 p-8 border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary-600" />
                Resumen de Orden
              </h3>
              <Badge className="bg-primary-50 text-primary-700 border-primary-100 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                {ov.estado.replace('_',' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <DataSnippet label="Estado" value={ov.estado.toUpperCase()} icon={Info} color="slate" />
              <DataSnippet label="Entrega Est." value={formatDate(ov.fecha_entrega)} icon={Calendar} color="amber" />
              <DataSnippet label="Total Items" value={ov.ov_detalle?.reduce((s:number,d:any)=>s+d.cantidad,0)} icon={Box} color="primary" />
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Precio Pactado</p>
                <div className="text-body-sm font-black text-slate-600">CONFIDENCIAL</div>
              </div>
            </div>
          </div>

          {/* Producción Tracker */}
          <div className="bg-white rounded-[2rem] shadow-lg shadow-slate-200/40 p-8 border border-slate-100 overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Factory className="w-5 h-5 text-primary-600" />
                Avance en Talleres
              </h3>
              <span className="text-2xl font-black text-primary-600">{productionSummary.percent}%</span>
            </div>

            <div className="space-y-6">
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div 
                  className="h-full bg-primary-600 rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                  style={{ width: `${productionSummary.percent}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-400" />
                {productionSummary.status} · {ops.length} órdenes de producción activas
              </p>

              <div className="grid gap-3 pt-4">
                {ops.map((op: any) => (
                  <div key={op.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white shadow-sm">
                        <Factory className="w-4 h-4 text-primary-600" />
                      </div>
                      <span className="text-sm font-black text-slate-700">{op.codigo}</span>
                    </div>
                    <Badge variant="outline" className="bg-white uppercase text-[10px] font-black tracking-wider text-slate-500">
                      {op.estado.replace('_',' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lado derecho: Despachos & Logística */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-300 p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600 rounded-full blur-[80px] -mr-16 -mt-16 opacity-30" />
            
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2 relative z-10">
              <Truck className="w-5 h-5 text-primary-400" />
              Logística de Despacho
            </h3>

            {despachos.length === 0 ? (
              <div className="py-10 text-center relative z-10">
                <Package className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-semibold text-slate-400">Preparando tus productos para envío</p>
                <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">En cola de empaque</p>
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                {despachos.map((desp: any) => (
                  <div key={desp.id} className="p-5 rounded-3xl bg-white/10 hover:bg-white/15 transition-all border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-0.5">Despacho</p>
                        <p className="text-sm font-black font-mono">#{desp.id.slice(0,8).toUpperCase()}</p>
                      </div>
                      <Badge className="bg-green-500 text-white border-0 font-black px-3 py-0.5 text-[9px] uppercase tracking-wider">
                        {desp.estado}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-xs">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">Enviado el {formatDate(desp.fecha_despacho)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <Truck className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-100 font-bold">{desp.transportadora || 'Envío Directo'}</span>
                      </div>
                      {desp.guia_seguimiento && (
                        <div className="flex items-center gap-3 text-xs">
                          <MapPin className="w-4 h-4 text-primary-400" />
                          <span className="text-primary-400 font-black font-mono tracking-wider tracking:widest">GUÍA: {desp.guia_seguimiento}</span>
                        </div>
                      )}
                    </div>

                    {desp.guia_seguimiento && (
                      <button className="w-full py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary-900/50 flex items-center justify-center gap-2">
                        Rastrear Envío <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}

                    {/* Packing List Simple */}
                    <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                         <ClipboardList className="w-3 h-3" /> Contenido del envío
                       </p>
                       <div className="grid gap-2">
                         {desp.despacho_detalle?.map((item: any, idx: number) => (
                           <div key={idx} className="flex justify-between text-[10px] text-slate-400 group/item">
                              <span>{item.productos?.referencia} · {item.talla}</span>
                              <span className="font-bold text-slate-300">{item.cantidad} uds</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-8 rounded-[2rem] bg-amber-50 border border-amber-100 relative overflow-hidden">
            <AlertCircle className="w-12 h-12 text-amber-200 absolute -right-4 -bottom-4 rotate-12" />
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" /> ¿Necesitas ayuda?
            </h4>
            <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
              Si tu orden presenta retrasos o tienes alguna duda con el contenido de las entregas parciales, contacta a tu asesor comercial o escribe a nuestro WhatsApp corporativo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DataSnippet({ label, value, icon: Icon, color }: { label: string, value: any, icon: LucideIcon, color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600 border-primary-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  }
  
  return (
    <div className={`p-4 rounded-3xl border border-transparent transition-all hover:bg-white hover:border-slate-100 hover:shadow-sm`}>
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-xs md:text-sm font-black text-slate-900 truncate">{value}</p>
    </div>
  )
}
