'use client'

import { useState } from 'react'
import { Scissors, Edit2, X } from 'lucide-react'
import type { ReporteCorteCompleto } from '@/features/reporte-corte/types'
import { ReporteCorteMejorado } from './reporte-corte-mejorado'
import type { LineaOPSimple } from './reporte-corte-form'
import { formatDate } from '@/shared/lib/utils'

interface Props {
  opId: string
  estadoActual: string
  reporte: ReporteCorteCompleto | null
  reportes: ReporteCorteCompleto[]
  lineasOP: LineaOPSimple[]
  bodegaTallerId: string | null
  isEditing?: boolean
  reporteEnEdicion?: ReporteCorteCompleto | null
  onStartEdit?: (id: string) => void
  onStartCreate?: () => void
  onEditComplete?: () => void
}

export function ReporteCortePanelClient({
  opId,
  estadoActual,
  reportes,
  lineasOP,
  bodegaTallerId,
  isEditing = false,
  reporteEnEdicion = null,
  onStartEdit,
  onStartCreate,
  onEditComplete
}: Props) {

  return (
    <div className="h-full">
      <div className="space-y-4 h-full">
        {/* Listado de reportes compactos */}
        {reportes.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {reportes.map((rep, idx) => (
              <button
                key={rep.id}
                onClick={() => onStartEdit && onStartEdit(rep.id)}
                className="rounded-xl bg-slate-50 border border-slate-100 p-3 h-full flex items-center justify-between group hover:border-primary-200 hover:bg-white hover:shadow-md transition-all active:scale-[0.98] text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-primary-500 group-hover:border-primary-100 transition-colors shadow-sm">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                        Reporte de Corte #{reportes.length - idx}
                      </p>
                      {rep.enviado_a_confeccion && (
                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                          CONFECCIÓN
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {formatDate(rep.fecha)} • {rep.profiles?.full_name?.split(' ')[0] ?? 'USR'}
                    </p>
                  </div>
                </div>
                <div className="text-slate-300 group-hover:text-primary-400 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Botón para nuevo reporte */}
        {estadoActual === 'en_corte' && reportes.length === 0 && (
          <button 
            onClick={() => onStartCreate && onStartCreate()}
            className="w-full h-full min-h-[120px] rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center bg-slate-50/30 hover:bg-white hover:border-primary-200 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 mb-3 shadow-sm group-hover:text-primary-500 group-hover:scale-110 transition-all">
              <Scissors className="w-5 h-5" />
            </div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">
              Registrar Corte Pendiente
            </h3>
            <p className="text-[10px] text-slate-400 font-bold max-w-[200px]">
              HAZ CLIC PARA COMENZAR EL REPORTE DE UNIDADES.
            </p>
          </button>
        )}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-14 animate-in fade-in duration-200">
          {/* Industrial Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            onClick={() => onEditComplete && onEditComplete()}
          />
          
          <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-white rounded-[2.5rem] overflow-hidden flex flex-col border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] scale-in-center">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shadow-inner">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 leading-none">
                    {reporteEnEdicion ? 'Editar Reporte de Corte' : 'Nuevo Reporte de Corte'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Módulo de Control de Unidades</p>
                </div>
              </div>
              <button 
                onClick={() => onEditComplete && onEditComplete()}
                className="w-11 h-11 rounded-2xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all hover:rotate-90 hover:text-red-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-slate-50/30">
              <ReporteCorteMejorado
                opId={opId}
                lineasOP={lineasOP}
                bodegaTallerId={bodegaTallerId}
                reporteAEditar={reporteEnEdicion}
                onEditComplete={() => onEditComplete && onEditComplete()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
