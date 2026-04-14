'use client'

import { useState, useTransition } from 'react'
import { createDraftMaterial } from '@/features/desarrollo/services/muestra-actions'
import { Package, Loader2 } from 'lucide-react'

interface Props {
  desarrolloId: string
  proveedores: { id: string; nombre: string }[]
  onCreated: (material: any) => void
  onClose: () => void
}

export function QuickCreateMaterialModal({ desarrolloId, proveedores, onCreated, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('metros')
  const [costo, setCosto] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [moq, setMoq] = useState('')
  const [multiplo, setMultiplo] = useState('1')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nombre || !costo || !proveedorId || !moq) {
      setError('Por favor completa los campos obligatorios.')
      return
    }

    startTransition(async () => {
      const res = await createDraftMaterial({
        nombre,
        unidad,
        costo_unit: parseFloat(costo),
        proveedor_id: proveedorId,
        moq: parseFloat(moq),
        multiplo: parseFloat(multiplo),
        desarrollo_id: desarrolloId,
      })

      if (res.error) {
        setError(res.error)
        return
      }

      onCreated(res.data)
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center gap-2 mb-5">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="font-black text-slate-900 uppercase tracking-tight">Crear MP Temporal (Draft)</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nombre del Material *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Tela Denim Stretch 12oz"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Unidad *</label>
              <select
                value={unidad}
                onChange={e => setUnidad(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="metros">Metros</option>
                <option value="unidades">Unidades</option>
                <option value="conos">Conos</option>
                <option value="yardas">Yardas</option>
                <option value="kilogramos">Kilogramos</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Costo Unitario *</label>
              <input
                type="number"
                value={costo}
                onChange={e => setCosto(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Proveedor Sugerido *</label>
            <select
              value={proveedorId}
              onChange={e => setProveedorId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">MOQ (Mínimo) *</label>
              <input
                type="number"
                value={moq}
                onChange={e => setMoq(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Múltiplo</label>
              <input
                type="number"
                value={multiplo}
                onChange={e => setMultiplo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <p className="text-[9px] text-slate-400 leading-relaxed bg-slate-50 p-2 rounded-lg">
            <strong>Nota:</strong> Este material se creará como un registro inactivo en el catálogo. Se activará automáticamente y pedirá la información restante (partida arancelaria, etc.) al momento de graduar el producto final.
          </p>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creando...</> : 'Crear MP Temporal'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
