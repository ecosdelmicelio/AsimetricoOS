'use client'

import { useState, useTransition } from 'react'
import { Factory, ShoppingCart, Loader2 } from 'lucide-react'
import { generarOpMuestra, generarOcMuestra } from '@/features/desarrollo/services/muestra-actions'

interface Tercero { id: string; nombre: string }

interface Props {
  desarrolloId:  string
  versionId:     string
  tipoProducto:  'fabricado' | 'comercializado'
  terceros:      Tercero[]
  onCreado:      (codigo: string, tipo: 'op' | 'oc') => void
  onClose:       () => void
}

export function GenerarMuestraModal({
  desarrolloId, versionId, tipoProducto, terceros, onCreado, onClose
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // OP fields
  const [tallerId, setTallerId]       = useState('')
  const [fechaPromesa, setFechaPromesa] = useState('')
  const [notasOp, setNotasOp]         = useState('')

  // OC fields
  const [proveedorId, setProveedorId] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notasOc, setNotasOc]         = useState('')

  const esFabricado = tipoProducto === 'fabricado'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (esFabricado) {
      if (!tallerId || !fechaPromesa) { setError('Selecciona taller y fecha promesa.'); return }
      startTransition(async () => {
        const result = await generarOpMuestra(desarrolloId, versionId, {
          taller_id: tallerId, fecha_promesa: fechaPromesa, notas: notasOp || undefined
        })
        if (result.error) { setError(result.error); return }
        onCreado(result.data!.codigo, 'op')
      })
    } else {
      if (!proveedorId || !fechaEntrega) { setError('Selecciona proveedor y fecha de entrega.'); return }
      startTransition(async () => {
        const result = await generarOcMuestra(desarrolloId, versionId, {
          proveedor_id: proveedorId, fecha_entrega_est: fechaEntrega, notas: notasOc || undefined
        })
        if (result.error) { setError(result.error); return }
        onCreado(result.data!.codigo, 'oc')
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center gap-2 mb-5">
          {esFabricado
            ? <Factory className="w-5 h-5 text-slate-600" />
            : <ShoppingCart className="w-5 h-5 text-slate-600" />}
          <h3 className="font-black text-slate-900">
            Generar {esFabricado ? 'OP' : 'OC'} de Muestra
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {esFabricado ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Taller <span className="text-red-500">*</span>
                </label>
                <select value={tallerId} onChange={e => setTallerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400">
                  <option value="">— Seleccionar taller —</option>
                  {terceros.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Fecha Promesa <span className="text-red-500">*</span>
                </label>
                <input type="date" value={fechaPromesa} onChange={e => setFechaPromesa(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Notas</label>
                <textarea value={notasOp} onChange={e => setNotasOp(e.target.value)} rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none resize-none" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Proveedor <span className="text-red-500">*</span>
                </label>
                <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400">
                  <option value="">— Seleccionar proveedor —</option>
                  {terceros.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Fecha Entrega Estimada <span className="text-red-500">*</span>
                </label>
                <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Notas</label>
                <textarea value={notasOc} onChange={e => setNotasOc(e.target.value)} rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none resize-none" />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando...</> : `Generar ${esFabricado ? 'OP' : 'OC'} de Muestra`}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
