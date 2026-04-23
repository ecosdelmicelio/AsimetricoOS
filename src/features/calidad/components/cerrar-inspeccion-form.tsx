'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, PackageSearch, Loader2, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { closeInspeccion } from '@/features/calidad/services/calidad-actions'
import type { ResultadoInspeccion } from '@/features/calidad/types'

interface SegundasEntry {
  id: string // Temp ID for local state
  producto_id: string
  talla: string
  cantidad: number
}

interface Props {
  inspeccion_id:       string
  op_id:               string
  estado_op:           string
  tieneDefectoCritico: boolean
  muestraSugerida:     number
  productos: { id: string; nombre: string; referencia: string; talla: string; cantidad: number }[]
}

export function CerrarInspeccionForm({
  inspeccion_id,
  op_id,
  estado_op,
  tieneDefectoCritico,
  muestraSugerida,
  productos,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resultado, setResultado] = useState<ResultadoInspeccion | null>(
    tieneDefectoCritico ? 'rechazada' : null
  )
  const [segundasEntries, setSegundasEntries] = useState<SegundasEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  // Sincronizar cuando un defecto crítico se agrega en tiempo real
  useEffect(() => {
    if (tieneDefectoCritico) setResultado('rechazada')
  }, [tieneDefectoCritico])

  const addSegundasEntry = () => {
    const firstProd = productos[0]
    if (!firstProd) return
    setSegundasEntries(prev => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), producto_id: firstProd.id, talla: firstProd.talla, cantidad: 1 }
    ])
  }

  const removeSegundasEntry = (id: string) => {
    setSegundasEntries(prev => prev.filter(e => e.id !== id))
  }

  const updateSegundasEntry = (id: string, field: keyof SegundasEntry, value: any) => {
    setSegundasEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!resultado) return
    if (resultado === 'segundas' && segundasEntries.length === 0) {
      setError('Debes agregar al menos una prenda de segunda calidad')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('inspeccion_id', inspeccion_id)
    formData.set('op_id', op_id)
    formData.set('estado_op', estado_op)
    formData.set('resultado', resultado)
    
    if (resultado === 'segundas') {
      const detail = segundasEntries.map(({ producto_id, talla, cantidad }) => ({
        producto_id,
        talla,
        cantidad
      }))
      formData.set('segundas_detalle', JSON.stringify(detail))
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
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DIAGNÓSTICO FINAL *</p>
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

      {/* Registro Compacto de Segundas */}
      {resultado === 'segundas' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desglose de Segundas *</label>
            <button
              type="button"
              onClick={addSegundasEntry}
              className="text-[9px] font-black bg-slate-900 text-white px-2 py-1 rounded-lg uppercase tracking-widest hover:bg-primary-600 transition-all flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
            {segundasEntries.map(entry => (
              <div key={entry.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-sm animate-in zoom-in-95 duration-200">
                <div className="flex-1 min-w-0">
                  <select
                    value={`${entry.producto_id}|${entry.talla}`}
                    onChange={e => {
                      const [pid, talla] = e.target.value.split('|')
                      updateSegundasEntry(entry.id, 'producto_id', pid)
                      updateSegundasEntry(entry.id, 'talla', talla)
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-tight text-slate-900 outline-none focus:border-amber-400"
                  >
                    {productos.map(p => (
                      <option key={`${p.id}-${p.talla}`} value={`${p.id}|${p.talla}`}>
                        {p.referencia} - {p.talla}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-16">
                  <input
                    type="number"
                    min={1}
                    value={entry.cantidad}
                    onChange={e => updateSegundasEntry(entry.id, 'cantidad', parseInt(e.target.value) || 1)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-[11px] font-black text-slate-900 outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSegundasEntry(entry.id)}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {segundasEntries.length === 0 && (
              <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin registros</p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <PackageSearch className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-700 text-[10px] font-black uppercase tracking-widest leading-tight">
              ESTAS PRENDAS SERÁN INGRESADAS A LA <span className="underline decoration-2 underline-offset-2">BODEGA DE SEGUNDAS</span> AUTOMÁTICAMENTE.
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
      <div className="h-10">
        {resultado === 'aceptada' && (
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center animate-in fade-in slide-in-from-bottom-2">
            CON ESTE RESULTADO LA OP AVANZARÁ AL SIGUIENTE ESTADO.
          </div>
        )}
        {resultado === 'rechazada' && (
          <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-center animate-in fade-in slide-in-from-bottom-2">
            CON ESTE RESULTADO LA OP PERMANECERÁ EN ESTADO PENDIENTE.
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl text-center">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !resultado}
        className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[12px] uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl active:scale-95 mt-4"
      >
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'FINALIZAR INSPECCIÓN'}
      </button>
    </form>
  )
}
