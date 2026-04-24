'use client'

import { useState, useTransition, useMemo } from 'react'
import { AlertTriangle, PackageSearch, RefreshCw, Loader2 } from 'lucide-react'
import { iniciarReprocesoSegundas, registrarDesperdicio, type SegundasTracking } from '@/features/calidad/services/calidad-actions'
import { formatDate } from '@/shared/lib/utils'
import { ConfirmActionModal } from '@/features/wms/components/confirm-action-modal'

interface Props {
  opId: string
  segundas: SegundasTracking[]
}

export function OPSegundasPanel({ opId, segundas }: Props) {
  const [pending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'danger'
  })

  const showError = (msg: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Error Operativo',
      description: msg,
      variant: 'danger'
    })
  }

  const handleReproceso = async (kardexId: string, productoId: string, cantidad: number, talla: string) => {
    setProcessingId(kardexId)
    startTransition(async () => {
      const res = await iniciarReprocesoSegundas(kardexId, opId, productoId, cantidad, talla)
      if (res.error) {
        showError(`No se pudo iniciar el reproceso: ${res.error}`)
      }
      setProcessingId(null)
    })
  }

  const handleDesperdicio = (kardexId: string, productoId: string, cantidad: number, talla: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Confirmar Descarte Definitivo?',
      description: `Estás a punto de enviar ${cantidad} unidad(es) de talla ${talla} a la bodega de desperdicio. Esta acción no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        setProcessingId(kardexId)
        startTransition(async () => {
          const res = await registrarDesperdicio(kardexId, opId, productoId, cantidad, talla)
          if (res.error) {
            showError(`Error al descartar la prenda: ${res.error}`)
          }
          setProcessingId(null)
        })
      }
    })
  }

  const groupedSegundas = useMemo(() => {
    const groups: Record<string, { 
      referencia: string, 
      nombre: string, 
      items: SegundasTracking[], 
      total: number,
      fechaMasAntigua: string 
    }> = {}

    segundas.forEach(s => {
      if (!groups[s.producto_referencia]) {
        groups[s.producto_referencia] = { 
          referencia: s.producto_referencia, 
          nombre: s.producto_nombre, 
          items: [], 
          total: 0,
          fechaMasAntigua: s.fecha_movimiento
        }
      }
      groups[s.producto_referencia].items.push(s)
      groups[s.producto_referencia].total += s.cantidad
      if (new Date(s.fecha_movimiento) < new Date(groups[s.producto_referencia].fechaMasAntigua)) {
        groups[s.producto_referencia].fechaMasAntigua = s.fecha_movimiento
      }
    })
    return Object.values(groups)
  }, [segundas])

  const calculateDays = (date: string) => {
    const start = new Date(date)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  if (segundas.length === 0) return null

  return (
    <div className="pt-8 mt-8 border-t border-slate-100 flex flex-col gap-6">
      
      {/* Modales de Confirmación / Alerta */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        isLoading={processingId !== null && confirmModal.onConfirm !== undefined}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 leading-none">
              Control de Loop de Calidad
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
              Prendas de segunda esperando acción del taller
            </p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100">
          {segundas.reduce((acc, s) => acc + s.cantidad, 0)} Unidades en Loop
        </span>
      </div>

      <div className="grid gap-6">
        {groupedSegundas.map(group => {
          const days = calculateDays(group.fechaMasAntigua)
          return (
            <div key={group.referencia} className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-slate-200 transition-all">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">
                      {group.nombre}
                    </h4>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-tight">
                      {group.referencia}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {group.items.map(item => (
                      <div key={item.kardex_id} className="flex flex-col gap-1 bg-slate-50 border border-slate-100 p-3 rounded-2xl min-w-[120px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-slate-400 uppercase">Talla {item.talla}</span>
                          <span className="text-[11px] font-black text-primary-600">{item.cantidad} Unds</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${item.n_intentos >= 2 ? 'bg-rose-500' : 'bg-amber-400'}`} />
                          <span className={`text-[9px] font-bold uppercase ${item.n_intentos >= 2 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {item.n_intentos} Intentos previos
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${days > 3 ? 'text-rose-500' : 'text-slate-400'}`}>
                      En Reproceso Hace
                    </p>
                    <p className={`text-2xl font-black tracking-tighter leading-none ${days > 3 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {days} {days === 1 ? 'Día' : 'Días'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {group.items.map(item => {
                      const isDisabled = pending || item.en_reproceso
                      const reachedMaxIntentos = item.n_intentos >= 2

                      return (
                        <div key={item.kardex_id} className="flex flex-col gap-1.5">
                          {!reachedMaxIntentos && (
                            <button
                              onClick={() => handleReproceso(item.kardex_id, item.producto_id, item.cantidad, item.talla)}
                              disabled={isDisabled}
                              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-70 min-w-[160px] ${
                                item.en_reproceso 
                                  ? 'bg-amber-50 text-amber-600 border border-amber-200 shadow-none' 
                                  : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              {processingId === item.kardex_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : item.en_reproceso ? (
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              {item.en_reproceso ? `En Revisión ${item.talla}` : `Reprocesar ${item.talla}`}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
