'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, PackageSearch, RefreshCw, Loader2 } from 'lucide-react'
import { iniciarReprocesoSegundas, type SegundasTracking } from '@/features/calidad/services/calidad-actions'
import { formatDate } from '@/shared/lib/utils'

interface Props {
  opId: string
  segundas: SegundasTracking[]
}

export function OPSegundasPanel({ opId, segundas }: Props) {
  const [pending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)

  if (segundas.length === 0) return null

  const handleReproceso = async (kardexId: string, productoId: string, cantidad: number) => {
    setProcessingId(kardexId)
    startTransition(async () => {
      await iniciarReprocesoSegundas(kardexId, opId, productoId, cantidad)
      setProcessingId(null)
    })
  }

  return (
    <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">
          Control de Segundas en OP
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">
          {segundas.reduce((acc, s) => acc + s.cantidad, 0)} UDS PENDIENTES
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {segundas.map(s => (
          <div key={s.kardex_id} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs font-black text-slate-900 truncate">{s.producto_referencia}</p>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-black text-[10px]">
                  {s.cantidad} UDS
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">
                {s.producto_nombre}
              </p>
              <p className="text-[9px] font-bold text-slate-400 mt-2">
                Reportado: {formatDate(s.fecha_movimiento)}
              </p>
            </div>

            <button
              onClick={() => handleReproceso(s.kardex_id, s.producto_id, s.cantidad)}
              disabled={pending}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processingId === s.kardex_id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Enviar a Reproceso
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
