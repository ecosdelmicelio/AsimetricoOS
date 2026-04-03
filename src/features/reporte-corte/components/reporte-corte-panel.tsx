import { Scissors } from 'lucide-react'
import type { ReporteCorteCompleto } from '@/features/reporte-corte/types'
import { ReporteCorteeForm, type LineaOPSimple } from './reporte-corte-form'
import { formatDate } from '@/shared/lib/utils'

interface Props {
  opId: string
  estadoActual: string
  reporte: ReporteCorteCompleto | null
  lineasOP: LineaOPSimple[]
}

export function ReporteCorteePanel({ opId, estadoActual, reporte, lineasOP }: Props) {
  // Mostrar solo si hay reporte existente o si la OP está en corte
  if (!reporte && estadoActual !== 'en_corte') return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Scissors className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-body-md">Reporte de Corte</h2>
      </div>

      {reporte ? (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          {/* Cabecera */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
            <div>
              <p className="text-body-sm font-semibold text-foreground">{formatDate(reporte.fecha)}</p>
              {reporte.profiles?.full_name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reportado por {reporte.profiles.full_name}
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
          {reporte.reporte_corte_tendido.map((t) => {
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

          {reporte.notas && (
            <div className="px-5 py-3 border-t border-black/5">
              <p className="text-xs text-muted-foreground">{reporte.notas}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4">
          <p className="text-body-sm text-muted-foreground">
            Registra el reporte de corte para poder avanzar a Confección.
          </p>
          <ReporteCorteeForm opId={opId} lineasOP={lineasOP} />
        </div>
      )}
    </div>
  )
}
