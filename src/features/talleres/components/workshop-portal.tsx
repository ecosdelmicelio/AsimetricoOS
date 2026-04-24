'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, History, TrendingDown, Package, 
  Timer, DollarSign, Factory, Truck, CreditCard, 
  PlusCircle, LayoutDashboard, Boxes, ClipboardCheck
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/shared/lib/utils'
import { getParetoDefectos } from '@/features/calidad/services/calidad-actions'
import { reportarHitoProduccion } from '@/features/talleres/services/taller-actions'
import { InventarioTable } from '@/features/wms/components/inventario-table'
import { NotaEntregaForm } from './nota-entrega-form'
import { FichaTecnicaPrint } from '@/features/desarrollo/components/ficha-tecnica-print'
import { toast } from 'sonner'

interface Props {
  data: any
}

type Tab = 'dashboard' | 'inventario' | 'calidad' | 'despachos'

export function WorkshopPortal({ data }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [pareto, setPareto] = useState<any[]>([])
  const [reportingHito, setReportingHito] = useState<string | null>(null)
  const [loadingHito, setLoadingHito] = useState(false)
  const [selectedOPForEntrega, setSelectedOPForEntrega] = useState<any | null>(null)
  const [selectedFT, setSelectedFT] = useState<{ desarrollo: any, version: any, operaciones: any[] } | null>(null)
  
  const { taller, inspecciones, ops, materiales, liquidaciones, entregas, stats } = data

  useEffect(() => {
    async function loadPareto() {
      const p = await getParetoDefectos({ taller_id: taller.id })
      setPareto(p)
    }
    loadPareto()
  }, [taller.id])

  const totalSegundas = inspecciones.reduce((acc: number, curr: any) => acc + (curr.cantidad_segundas || 0), 0)
  const totalInspeccionado = inspecciones.reduce((acc: number, curr: any) => acc + (curr.cantidad_inspeccionada || 0), 0)
  const errorRate = totalInspeccionado > 0 ? (totalSegundas / totalInspeccionado) * 100 : 0

  const diasParaTerminar = stats.capacidadDiaria > 0 ? stats.totalWIPUnits / stats.capacidadDiaria : 0
  const cargaPct = Math.min(100, (diasParaTerminar / 15) * 100)

  const handleReportHito = async (opId: string, hito: any) => {
    setLoadingHito(true)
    try {
      await reportarHitoProduccion({
        op_id: opId,
        hito,
        cantidad: ops.find((o: any) => o.id === opId)?.total_unidades || 0,
      })
      toast.success('Hito reportado correctamente')
      setReportingHito(null)
    } catch (error) {
      toast.error('Error al reportar hito')
    } finally {
      setLoadingHito(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Navigation Tabs */}
      <div className="flex justify-center">
        <div className="bg-white border border-slate-100 p-1 rounded-3xl shadow-sm flex gap-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'dashboard' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
            )}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('inventario')}
            className={cn(
              "px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'inventario' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
            )}
          >
            <Boxes className="w-4 h-4" /> Mi Inventario
          </button>
          <button 
            onClick={() => setActiveTab('calidad')}
            className={cn(
              "px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'calidad' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
            )}
          >
            <ClipboardCheck className="w-4 h-4" /> Autocontrol
          </button>
          <button 
            onClick={() => setActiveTab('despachos')}
            className={cn(
              "px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'despachos' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
            )}
          >
            <Truck className="w-4 h-4" /> Despachos
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-500">
          {/* Main KPIs Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <DollarSign className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">Panel Maestro • {taller.nombre}</p>
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">Flujo de Producción</h2>
                <div className="flex gap-12">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Cuentas por Cobrar (Est.)</p>
                    <p className="text-3xl font-black tracking-tighter text-emerald-400">{formatCurrency(stats.expectedBilling)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Piezas en Planta</p>
                    <p className="text-3xl font-black tracking-tighter">{stats.totalWIPUnits.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all border-l-4 border-l-primary-500">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                  <Factory className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-primary-600 bg-primary-50 px-3 py-1 rounded-full">Capacidad</span>
                  <p className="text-[9px] font-bold text-slate-400 mt-2">{stats.capacidadDiaria} und/día</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Carga de Trabajo</p>
                <div className="flex items-end gap-3">
                  <p className="text-3xl font-black text-slate-900 tabular-nums">{cargaPct.toFixed(0)}%</p>
                  <div className="h-2 w-full bg-slate-100 rounded-full mb-2 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", cargaPct > 90 ? "bg-rose-500" : "bg-primary-500")} 
                      style={{ width: `${cargaPct}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all border-l-4 border-l-emerald-500">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Truck className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Suministros</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">En Camino</p>
                <p className="text-3xl font-black text-slate-900 tabular-nums">{materiales.length} <span className="text-sm font-bold text-slate-300">envíos</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-3 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Órdenes de Producción</h3>
                  <p className="text-slate-400 text-sm font-medium mt-1">Gestiona el avance de tus asignaciones</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-50">
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Identificación</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado Actual</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Cantidad</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ops.map((op: any) => (
                      <tr key={op.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">OP-{op.codigo}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">
                              {op.productos?.[0]?.producto?.nombre || 'General'}
                            </span>
                            {op.productos?.[0]?.producto?.producto_final_id && (
                              <button 
                                onClick={async () => {
                                  const prodId = op.productos[0].producto.producto_final_id
                                  if (!prodId) return
                                  
                                  const loadingToast = toast.loading('Cargando ficha técnica...')
                                  try {
                                    const { getFichaTecnicaCompleta } = await import('@/features/talleres/services/taller-actions')
                                    const ftData = await getFichaTecnicaCompleta(prodId)
                                    setSelectedFT(ftData)
                                    toast.dismiss(loadingToast)
                                  } catch (error) {
                                    console.error(error)
                                    toast.error('No se pudo cargar la ficha técnica completa.')
                                    toast.dismiss(loadingToast)
                                  }
                                }}
                                className="text-[9px] font-black text-primary-500 uppercase tracking-widest mt-1 hover:underline text-left"
                              >
                                Ver Ficha Técnica →
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-6">
                          <span className={cn(
                            "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                            op.estado === 'en_confeccion' ? "bg-blue-50 text-blue-600" :
                            op.estado === 'programada' ? "bg-slate-100 text-slate-600" :
                            op.estado === 'terminada' ? "bg-emerald-50 text-emerald-600" :
                            "bg-slate-50 text-slate-500"
                          )}>
                            {op.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-6 text-right">
                          <span className="text-sm font-black text-slate-900 tabular-nums">{op.total_unidades}</span>
                        </td>
                        <td className="py-6 text-right">
                          {reportingHito === op.id ? (
                            <div className="flex justify-end gap-2 animate-in fade-in zoom-in duration-300">
                              {['corte', 'confeccion', 'terminado'].map((h) => (
                                <button
                                  key={h}
                                  disabled={loadingHito}
                                  onClick={() => handleReportHito(op.id, h)}
                                  className="text-[9px] font-black uppercase px-2 py-1 bg-slate-900 text-white rounded-lg hover:bg-primary-600 transition-colors"
                                >
                                  {h}
                                </button>
                              ))}
                              <button onClick={() => setReportingHito(null)} className="text-[9px] font-black uppercase px-2 py-1 bg-slate-100 text-slate-400 rounded-lg">×</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setReportingHito(op.id)}
                              className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-auto group-hover:scale-105 transition-transform"
                            >
                              <PlusCircle className="w-3 h-3" /> Reportar Avance
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-10">
              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Truck className="w-20 h-20" /></div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6">En Camino</h3>
                <div className="space-y-4">
                  {materiales.length === 0 ? (
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest text-center py-6">Sin envíos</p>
                  ) : (
                    materiales.slice(0, 3).map((m: any) => (
                      <div key={m.id} className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                        <span className="text-[10px] font-black text-blue-700 uppercase">TR-{m.codigo}</span>
                        <p className="text-[11px] font-bold text-blue-900 truncate">{m.items?.[0]?.material?.nombre || m.items?.[0]?.producto?.nombre}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><CreditCard className="w-20 h-20" /></div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6">Liquidaciones</h3>
                <div className="space-y-4">
                  {liquidaciones.slice(0, 3).map((liq: any) => (
                    <div key={liq.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-900 uppercase">OP-{liq.op?.codigo}</p>
                      <p className="text-[11px] font-black text-emerald-600">{formatCurrency(liq.costo_total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventario' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between mb-8 px-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Mi Inventario</h2>
              <p className="text-slate-400 font-medium">Control de stock en tu bodega asignada</p>
            </div>
            <div className="w-16 h-16 rounded-[24px] bg-primary-50 flex items-center justify-center text-primary-600">
              <Boxes className="w-8 h-8" />
            </div>
          </div>
          {taller.bodega_taller_id ? (
            <InventarioTable 
              bodegaId={taller.bodega_taller_id} 
              bodegaNombre={taller.nombre} 
            />
          ) : (
            <div className="bg-white rounded-[40px] p-20 border border-slate-100 shadow-sm text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-900 font-black uppercase tracking-tighter text-xl">Sin Bodega Asignada</p>
              <p className="text-slate-400 mt-2 font-medium">Contacta al administrador para vincular una bodega a tu taller.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calidad' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between mb-8 px-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Autocontrol de Calidad</h2>
              <p className="text-slate-400 font-medium">Genera tus propios reportes de inspección</p>
            </div>
            <div className="w-16 h-16 rounded-[24px] bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ClipboardCheck className="w-8 h-8" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Inspecciones Disponibles</h3>
              <p className="text-slate-400 text-sm mb-10">Solo puedes inspeccionar OPs que estén en estado "Terminado" o "Confección".</p>
              
              <div className="space-y-4">
                {ops.filter((o: any) => ['en_confeccion', 'terminada'].includes(o.estado)).map((op: any) => (
                  <div key={op.id} className="flex items-center justify-between p-6 rounded-3xl border border-slate-50 hover:border-primary-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase">OP-{op.codigo}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{op.total_unidades} Unidades</p>
                      </div>
                    </div>
                    <button 
                      className="text-[10px] font-black uppercase text-primary-600 bg-primary-50 px-4 py-2 rounded-xl hover:bg-primary-600 hover:text-white transition-all shadow-sm"
                      onClick={() => toast.info('Integrando Panel de Inspección...')}
                    >
                      Iniciar Inspección
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><History className="w-32 h-32" /></div>
               <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Últimos Reportes</h3>
               <div className="space-y-4 relative z-10">
                 {inspecciones.slice(0, 5).map((insp: any) => (
                   <div key={insp.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div>
                        <p className="text-xs font-black uppercase">OP-{insp.op?.codigo}</p>
                        <p className="text-[9px] font-bold text-white/40">{formatDate(insp.created_at)}</p>
                      </div>
                      <span className={cn(
                        "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                        insp.resultado === 'aceptada' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      )}>
                        {insp.resultado}
                      </span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'despachos' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between mb-8 px-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Mis Despachos</h2>
              <p className="text-slate-400 font-medium">Historial de entregas realizadas a bodega principal</p>
            </div>
            <div className="w-16 h-16 rounded-[24px] bg-blue-50 flex items-center justify-center text-blue-600">
              <Truck className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Historial de Entregas</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-50">
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Referencia</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Cantidad</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {entregas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No has realizado despachos aún</td>
                      </tr>
                    ) : (
                      entregas.map((e: any) => (
                        <tr key={e.id} className="group">
                          <td className="py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900">OP-{e.op?.codigo}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Nota #{e.numero_entrega}</span>
                            </div>
                          </td>
                          <td className="py-6 text-sm font-medium text-slate-500">{formatDate(e.fecha_entrega)}</td>
                          <td className="py-6 text-right font-black text-slate-900 tabular-nums">{e.cantidad_entregada}</td>
                          <td className="py-6 text-center">
                            <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-1 rounded-full",
                              e.estado === 'aceptada' ? "bg-emerald-50 text-emerald-600" :
                              e.estado === 'rechazada' ? "bg-rose-50 text-rose-600" :
                              "bg-blue-50 text-blue-600"
                            )}>
                              {e.estado}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><PlusCircle className="w-24 h-24" /></div>
                <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Nuevo Despacho</h3>
                <p className="text-white/50 text-xs mb-8">Selecciona una orden activa para generar una nueva nota de entrega.</p>
                <div className="space-y-3">
                  {ops.filter((o: any) => ['en_confeccion', 'programada'].includes(o.estado)).map((op: any) => (
                    <button
                      key={op.id}
                      onClick={() => setSelectedOPForEntrega(op)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
                    >
                      <div>
                        <p className="text-xs font-black">OP-{op.codigo}</p>
                        <p className="text-[10px] font-bold text-white/40">{op.total_unidades} Unds • {op.estado}</p>
                      </div>
                      <PlusCircle className="w-5 h-5 text-primary-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedOPForEntrega && (
        <NotaEntregaForm 
          op={selectedOPForEntrega} 
          onClose={() => setSelectedOPForEntrega(null)} 
          onSuccess={() => {
            setSelectedOPForEntrega(null)
            window.location.reload()
          }} 
        />
      )}

      {selectedFT && (
        <FichaTecnicaPrint
          desarrollo={selectedFT.desarrollo}
          version={selectedFT.version}
          operaciones={selectedFT.operaciones}
          onClose={() => setSelectedFT(null)}
        />
      )}
    </div>
  )
}
