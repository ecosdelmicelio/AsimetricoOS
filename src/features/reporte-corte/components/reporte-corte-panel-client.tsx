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

  // Modo normal: mostrar el reporte anterior y formulario para nuevo
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Scissors className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-body-md">Reporte de Corte</h2>
      </div>

      {/* Mostrar todos los reportes guardados */}
      {reportes.length > 0 && reportes.map((rep, idx) => (
        (rep.reporte_corte_corte && rep.reporte_corte_corte.length > 0) && (
        <div key={rep.id} className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-black/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {idx === 0 ? 'Último' : ''} Corte #{reportes.length - idx}
              </p>
              {rep.enviado_a_confeccion && (
                <p className="text-xs text-green-600 font-semibold mt-1">✓ Enviado a confección</p>
              )}
            </div>
            <button
              onClick={() => setReporteEditando(rep.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors text-xs font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
          </div>

          {/* Cabecera */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
            <div>
              <p className="text-body-sm font-semibold text-foreground">{formatDate(rep.fecha)}</p>
              {rep.profiles?.full_name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reportado por {rep.profiles.full_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">
                ✓ Registrado
              </span>
            </div>
          </div>

          {/* Tendidos con tabla matricial */}
          {rep.reporte_corte_corte.map((t) => {
            const totalCortado = t.reporte_corte_linea.reduce((s, l) => s + l.cantidad_cortada, 0)

            // Agrupar por referencia para la tabla
            const referencias = [...new Set(t.reporte_corte_linea.map(l => l.productos?.referencia ?? ''))].sort()
            const tallas = [...new Set(t.reporte_corte_linea.map(l => l.talla))].sort()

            return (
              <div key={t.id} className="px-5 py-4 border-b border-black/5 last:border-0 space-y-3">
                {/* Header: Color + Metros + Peso */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-body-sm">{t.color}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{t.metros_usados} m</span>
                    <span>{t.peso_desperdicio_kg} kg desp.</span>
                    <span className="font-semibold text-foreground">{totalCortado} uds</span>
                  </div>
                </div>

                {/* Tabla matricial */}
                <div className="overflow-x-auto rounded-lg bg-neu-base shadow-neu-inset">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-black/5">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Ref</th>
                        {tallas.map(talla => (
                          <th key={talla} className="text-center px-2 py-2 font-medium text-muted-foreground text-xs min-w-10">
                            {talla}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {referencias.map(ref => (
                        <tr key={ref} className="border-b border-black/5 last:border-0">
                          <td className="px-3 py-2 font-mono text-xs text-primary-600">{ref}</td>
                          {tallas.map(talla => {
                            const linea = t.reporte_corte_linea.find(
                              l => l.productos?.referencia === ref && l.talla === talla
                            )
                            return (
                              <td key={talla} className="px-2 py-2 text-center">
                                {linea ? (
                                  <span className="font-semibold text-foreground">{linea.cantidad_cortada}</span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {rep.notas && (
            <div className="px-5 py-3 border-t border-black/5">
              <p className="text-xs text-muted-foreground">{rep.notas}</p>
            </div>
          )}
        </div>
        )
      ))}

      {/* Reportes guardados (nuevo formato - sin tendidos) */}
      {reportes.length > 0 && reportes.map((rep, idx) => (
        rep.reporte_corte_material && rep.reporte_corte_material.length > 0 && !rep.reporte_corte_corte?.length && (
        <div key={rep.id} className="rounded-2xl bg-green-50 border border-green-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm font-semibold text-green-700">
                {rep.enviado_a_confeccion ? '✓' : '•'} Corte #{reportes.length - idx}
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                {formatDate(rep.fecha)} · {rep.profiles?.full_name ?? 'Usuario'}
              </p>
              {rep.enviado_a_confeccion && (
                <p className="text-xs text-green-700 font-semibold mt-1">✓ Enviado a confección</p>
              )}
            </div>
            <button
              onClick={() => setReporteEditando(rep.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-xs font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
          </div>
        </div>
        )
      ))}

      {/* Formulario para crear el reporte de corte (solo si no hay ninguno) */}
      {estadoActual === 'en_corte' && reportes.length === 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4">
          <div>
            <p className="text-body-sm font-semibold text-foreground">📝 Registra el reporte de corte</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              Registra el reporte de corte para poder avanzar a Confección.
            </p>
          </div>
          <ReporteCorteMejorado opId={opId} lineasOP={lineasOP} bodegaTallerId={bodegaTallerId} />
        </div>
      )}
    </div>
  )
}
