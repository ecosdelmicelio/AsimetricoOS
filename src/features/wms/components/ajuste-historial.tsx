'use client'

import { useState, useEffect } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Package } from 'lucide-react'
import { getAjustes } from '@/features/wms/services/ajustes-actions'
import type { AjusteInventario } from '@/features/wms/types'

interface Props {
  bodegaId?: string
  refreshKey?: number
}

function formatRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const dias = Math.floor(hrs / 24)
  return `hace ${dias}d`
}

export function AjusteHistorial({ bodegaId, refreshKey }: Props) {
  const [ajustes, setAjustes] = useState<AjusteInventario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getAjustes(bodegaId)
        setAjustes(data)
      } catch (e) {
        console.error('Error cargando ajustes:', e)
      }
      setLoading(false)
    }
    load()
  }, [bodegaId, refreshKey])

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Cargando historial...
      </div>
    )
  }

  if (ajustes.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
        <div className="w-10 h-10 rounded-xl bg-neu-base shadow-neu-inset flex items-center justify-center">
          <Package className="w-5 h-5 opacity-40" />
        </div>
        <p className="text-sm">Sin ajustes registrados</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Historial de Ajustes
      </p>

      <div className="space-y-1.5">
        {ajustes.map(ajuste => {
          const totalItems = ajuste.ajuste_items?.length ?? 0
          const totalUnidades = ajuste.ajuste_items?.reduce((s, i) => s + i.cantidad, 0) ?? 0
          const esEntrada = ajuste.tipo === 'entrada'

          return (
            <div
              key={ajuste.id}
              className="rounded-xl bg-white border border-slate-100 shadow-sm px-4 py-3 space-y-1"
            >
              {/* Fila principal */}
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  esEntrada ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {esEntrada
                    ? <ArrowDownCircle className="w-3.5 h-3.5 text-green-600" />
                    : <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      {ajuste.codigo}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      esEntrada
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {ajuste.tipo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-mono text-primary-700 font-semibold">
                      {ajuste.bines?.codigo}
                      {ajuste.bines?.posicion && (
                        <span className="text-muted-foreground font-normal"> · {ajuste.bines.posicion}</span>
                      )}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {totalItems} ítem{totalItems !== 1 ? 's' : ''} · {totalUnidades} u.
                    </span>
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {formatRelativo(ajuste.created_at)}
                    </span>
                  </div>
                </div>

                <div className={`text-[12px] font-black shrink-0 ${esEntrada ? 'text-green-600' : 'text-red-500'}`}>
                  {esEntrada ? '+' : '-'}{totalUnidades}
                </div>
              </div>

              {/* Notas */}
              <p className="text-[10px] text-slate-500 italic truncate pl-8">
                "{ajuste.notas}"
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
