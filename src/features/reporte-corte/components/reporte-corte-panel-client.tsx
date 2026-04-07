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
}

export function ReporteCortePanelClient({
  opId,
  estadoActual,
  reporte,
  reportes,
  lineasOP,
  bodegaTallerId
}: Props) {
  const [reporteEditando, setReporteEditando] = useState<string | null>(null)

  // El reporte que se está editando (si hay uno)
  const reporteEnEdicion = reportes.find(r => r.id === reporteEditando)

  // Si estamos editando un reporte específico, mostrar el formulario
  if (reporteEditando && reporteEnEdicion) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-body-md">Editando Reporte de Corte</h2>
          </div>
          <button
            onClick={() => setReporteEditando(null)}
            className="p-2 hover:bg-neu-base rounded-lg transition-colors"
            title="Cancelar edición"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="rounded-2xl bg-yellow-50 border-2 border-yellow-200 p-5 space-y-4">
          <div>
            <p className="text-body-sm font-semibold text-yellow-700">
              ✏️ Editando reporte del {formatDate(reporteEnEdicion.fecha)}
            </p>
            <p className="text-body-sm text-yellow-600 mt-1">
              Modifica cualquier dato del reporte y guarda los cambios.
            </p>
          </div>
          <ReporteCorteMejorado
            opId={opId}
            lineasOP={lineasOP}
            bodegaTallerId={bodegaTallerId}
            reporteAEditar={reporteEnEdicion}
            onEditComplete={() => setReporteEditando(null)}
          />
        </div>
      </div>
    )
  }

  // Modo normal: mostrar reportes y formulario
  return (
    <div className="space-y-4">
      {/* Listado de reportes compactos */}
      {reportes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reportes.map((rep, idx) => {
            const hasDetails = rep.reporte_corte_corte && rep.reporte_corte_corte.length > 0
            return (
              <button
                key={rep.id}
                onClick={() => setReporteEditando(rep.id)}
                className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between group hover:border-primary-200 hover:bg-white hover:shadow-md transition-all active:scale-[0.98] text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-primary-500 group-hover:border-primary-100 transition-colors shadow-sm">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                        Corte #{reportes.length - idx}
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
            )
          })}
        </div>
      )}

      {/* Formulario minimalista para nuevo reporte */}
      {estadoActual === 'en_corte' && reportes.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center text-center bg-slate-50/30">
          <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 mb-3 shadow-sm">
            <Edit2 className="w-5 h-5" />
          </div>
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">
            Reporte de Corte Pendiente
          </h3>
          <p className="text-[10px] text-slate-400 font-bold max-w-[200px] mb-4">
            REGISTRA LAS UNIDADES REALES CORTADAS PARA AVANZAR.
          </p>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <ReporteCorteMejorado opId={opId} lineasOP={lineasOP} bodegaTallerId={bodegaTallerId} />
          </div>
        </div>
      )}
    </div>
  )
}
