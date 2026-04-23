'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
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
  productos: { id: string; nombre: string; referencia: string; color: string | null; talla: string; cantidad: number }[]
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
  // Matriz de segundas: { [productoId]: { [talla]: cantidad } }
  const [segundasMatrix, setSegundasMatrix] = useState<Record<string, Record<string, number>>>({})
  const [error, setError] = useState<string | null>(null)

  // Agrupar productos por referencia y color para la matriz
  const productosAgrupados = useMemo(() => {
    const grupos: Record<string, { key: string; nombre: string; referencia: string; color: string | null; items: { id: string; talla: string }[] }> = {}
    
    productos.forEach(p => {
      const key = `${p.referencia}-${p.color || ''}`
      if (!grupos[key]) {
        grupos[key] = { key, nombre: p.nombre, referencia: p.referencia, color: p.color, items: [] }
      }
      grupos[key].items.push({ id: p.id, talla: p.talla })
    })
    
    return Object.values(grupos)
  }, [productos])

  // Sincronizar cuando un defecto crítico se agrega en tiempo real
  useEffect(() => {
    if (tieneDefectoCritico) setResultado('rechazada')
  }, [tieneDefectoCritico])

  const updateMatrixValue = (productId: string, value: string) => {
    const num = parseInt(value) || 0
    const prod = productos.find(p => p.id === productId)
    const max = prod?.cantidad || 0
    
    setSegundasMatrix(prev => ({
      ...prev,
      [productId]: {
        'default': Math.min(max, Math.max(0, num))
      }
    }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!resultado) return
    
    // Convertir matriz a detalle plano y validar límites
    const detail: { producto_id: string, talla: string, cantidad: number }[] = []
    let errorExceso = null

    Object.entries(segundasMatrix).forEach(([pid, tallas]) => {
      const cant = tallas['default'] || 0
      if (cant > 0) {
        const prod = productos.find(p => p.id === pid)
        if (prod) {
          if (cant > prod.cantidad) {
            errorExceso = `Exceso en ${prod.referencia} ${prod.talla}: máx ${prod.cantidad}`
          }
          detail.push({ producto_id: pid, talla: prod.talla, cantidad: cant })
        }
      }
    })

    if (errorExceso) {
      setError(errorExceso)
      return
    }

    if (resultado === 'segundas' && detail.length === 0) {
      setError('Debes ingresar al menos una cantidad de segunda calidad en la matriz')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('inspeccion_id', inspeccion_id)
    formData.set('op_id', op_id)
    formData.set('estado_op', estado_op)
    formData.set('resultado', resultado)
    
    if (resultado === 'segundas') {
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
          <p className="text-rose-700 text-[10px] font-black uppercase tracking-widest leading-tight text-left">
            DEFECTO CRÍTICO DETECTADO — EL RESULTADO SERÁ <span className="underline decoration-2 underline-offset-2 text-rose-800">RECHAZADA</span> AUTOMÁTICAMENTE.
          </p>
        </div>
      )}

      {/* Resultado — 3 opciones */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DIAGNÓSTICO FINAL *</p>
        <div className="grid grid-cols-3 gap-3">
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

      {/* Matriz Ultracompacta de Segundas */}
      {resultado === 'segundas' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matriz de Unidades Retenidas *</label>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
            {productosAgrupados.map(prod => (
              <div key={prod.key} className="rounded-2xl border border-slate-100 bg-slate-50/30 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-white">
                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                    {prod.referencia} {prod.color && <span className="text-slate-400 font-bold ml-1">· {prod.color}</span>}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{prod.nombre}</p>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {prod.items.map(item => {
                      const max = productos.find(p => p.id === item.id)?.cantidad || 0
                      return (
                        <div key={item.id} className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase">{item.talla}</span>
                            <span className="text-[8px] font-bold text-slate-300">({max})</span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={max}
                            placeholder="0"
                            value={segundasMatrix[item.id]?.['default'] || ''}
                            onChange={e => updateMatrixValue(item.id, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 text-center text-[12px] font-black text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50 transition-all"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 shadow-sm">
            <PackageSearch className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-700 text-[10px] font-black uppercase tracking-widest leading-tight text-left">
              ESTAS UNIDADES SERÁN TRASLADADAS A LA <span className="underline decoration-2 underline-offset-2">BODEGA DE SEGUNDAS</span> PARA SU REPROCESO O CLASIFICACIÓN FINAL.
            </p>
          </div>
        </div>
      )}

      {/* Notas */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Notas de Cierre</label>
        <div className="rounded-xl bg-slate-50/50 border border-slate-100">
          <textarea
            name="notas"
            rows={2}
            placeholder="Observaciones adicionales..."
            className="w-full bg-transparent px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none resize-none placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* Banners de estado */}
      <div className="h-10">
        {resultado === 'aceptada' && (
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center animate-in fade-in slide-in-from-bottom-2">
            LA ORDEN SERÁ MARCADA COMO ACEPTADA Y AVANZARÁ EN EL FLUJO.
          </div>
        )}
        {resultado === 'rechazada' && (
          <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-center animate-in fade-in slide-in-from-bottom-2">
            LA ORDEN PERMANECERÁ EN ESTADO PENDIENTE DE REVISIÓN.
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl text-center shadow-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !resultado}
        className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[12px] uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl active:scale-95 mt-2"
      >
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONFIRMAR DIAGNÓSTICO'}
      </button>
    </form>
  )
}
