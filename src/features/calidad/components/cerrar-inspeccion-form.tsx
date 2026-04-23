'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, PackageSearch, Loader2, AlertTriangle } from 'lucide-react'
import { closeInspeccion } from '@/features/calidad/services/calidad-actions'
import type { ResultadoInspeccion } from '@/features/calidad/types'

interface Props {
  inspeccion_id:       string
  op_id:               string
  estado_op:           string
  tieneDefectoCritico: boolean
  muestraSugerida:     number
}

export function CerrarInspeccionForm({
  inspeccion_id,
  op_id,
  estado_op,
  tieneDefectoCritico,
  muestraSugerida,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resultado, setResultado] = useState<ResultadoInspeccion | null>(
    tieneDefectoCritico ? 'rechazada' : null
  )
  const [cantidadSegundas, setCantidadSegundas] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Sincronizar cuando un defecto crítico se agrega en tiempo real
  useEffect(() => {
    if (tieneDefectoCritico) setResultado('rechazada')
  }, [tieneDefectoCritico])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!resultado) return
    if (resultado === 'segundas' && !cantidadSegundas) {
      setError('Indica cuántas prendas son de segunda calidad')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('inspeccion_id', inspeccion_id)
    formData.set('op_id', op_id)
    formData.set('estado_op', estado_op)
    formData.set('resultado', resultado)
    if (resultado === 'segundas') {
      formData.set('cantidad_segundas', cantidadSegundas)
    }

    startTransition(async () => {
      const res = await closeInspeccion(formData)
      if (res.error) {
        setError(res.error)
      } else {
        router.push('/calidad')
      }
    })
  }

  const criticoBloquea = tieneDefectoCritico

  return (
    <form onSubmit={handleSubmit} className="rounded-[2.5rem] bg-white border border-slate-100 shadow-xl p-8 space-y-6">
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
        <div className="w-1.5 h-4 bg-slate-900 rounded-full" />
        FINALIZAR INSPECCIÓN TÉCNICA
      </h3>

      {/* Banner rechazo automático por crítico */}
      {tieneDefectoCritico && (
        <div className="flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-rose-700 text-[10px] font-black uppercase tracking-widest leading-tight">
            DEFECTO CRÍTICO DETECTADO — EL RESULTADO SERÁ <span className="underline decoration-2 underline-offset-2">RECHAZADA</span> AUTOMÁTICAMENTE.
          </p>
        </div>
      )}

      {/* Resultado — 3 opciones */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DIAMAGNÓSTICO FINAL *</p>
        <div className="grid grid-cols-3 gap-3">

          {/* Aceptada */}
          <button
            type="button"
            disabled={criticoBloquea}
            onClick={() => !criticoBloquea && setResultado('aceptada')}
            className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all group ${
              resultado === 'aceptada'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-slate-200'
            } ${criticoBloquea ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
          >
            <CheckCircle className={`w-5 h-5 ${resultado === 'aceptada' ? 'text-emerald-500' : 'text-slate-300'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">ACEPTADA</span>
          </button>

          {/* Rechazada */}
          <button
            type="button"
            onClick={() => setResultado('rechazada')}
            className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all group ${
              resultado === 'rechazada'
                ? 'border-rose-500 bg-rose-50 text-rose-700'
                : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-slate-200'
            } active:scale-95`}
          >
            <XCircle className={`w-5 h-5 ${resultado === 'rechazada' ? 'text-rose-500' : 'text-slate-300'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">RECHAZADA</span>
          </button>

          {/* Segundas */}
          <button
            type="button"
            disabled={criticoBloquea}
            onClick={() => !criticoBloquea && setResultado('segundas')}
            className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all group ${
              resultado === 'segundas'
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-slate-200'
            } ${criticoBloquea ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
          >
            <PackageSearch className={`w-5 h-5 ${resultado === 'segundas' ? 'text-amber-500' : 'text-slate-300'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">SEGUNDAS</span>
          </button>
        </div>
      </div>

      {/* Cantidad Segundas */}
      {resultado === 'segundas' && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prendas de segunda calidad *</label>
          <div className="rounded-xl bg-slate-50/50 border border-slate-100">
            <input
              type="number"
              min={1}
              value={cantidadSegundas}
              onChange={e => setCantidadSegundas(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none"
            />
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <PackageSearch className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-700 text-[10px] font-black uppercase tracking-widest leading-tight">
              ESTAS PRENDAS SERÁN EXCLUIDAS DEL FLUJO NORMAL DE DESPACHOS.
            </p>
          </div>
        </div>
      )}

      {/* Notas */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Notas de cierre</label>
        <div className="rounded-xl bg-slate-50/50 border border-slate-100">
          <textarea
            name="notas"
            rows={2}
            placeholder="Observaciones finales..."
            className="w-full bg-transparent px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none resize-none placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* Banners de resultado */}
      {resultado === 'aceptada' && (
        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center">
          LA OP AVANZARÁ A "TERMINADO" AUTOMÁTICAMENTE.
        </div>
      )}
      {resultado === 'rechazada' && !tieneDefectoCritico && (
        <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-center">
          LA OP QUEDARÁ EN CALIDAD PARA RE-INSPECCIÓN.
        </div>
      )}

      {error && <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}

      <button
        type="submit"
        disabled={pending || !resultado}
        className="w-full py-4 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        CERRAR INSPECCIÓN TÉCNICA
      </button>
    </form>
  )
}
