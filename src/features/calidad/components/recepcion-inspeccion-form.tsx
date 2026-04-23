'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, CheckCircle2, XCircle, Plus, Trash2, Save, Loader2, Info } from 'lucide-react'
import { procesarInspeccionRecepcion } from '@/features/calidad/services/calidad-actions'
import type { TipoDefecto } from '@/features/calidad/types'

interface Props {
  recepcion: any
  tiposDefecto: TipoDefecto[]
}

export function RecepcionInspeccionForm({ recepcion, tiposDefecto }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resultado, setResultado] = useState<'aprobado' | 'rechazado'>('aprobado')
  const [novedades, setNovedades] = useState<Array<{ tipo_defecto_id: string; cantidad: number; notas?: string }>>([])
  const [notas, setNotas] = useState('')

  const isMP = !!recepcion.material_id
  const itemNombre = isMP ? recepcion.materiales?.nombre : recepcion.productos?.nombre
  const itemCodigo = isMP ? recepcion.materiales?.codigo : recepcion.productos?.referencia

  function addNovedad() {
    if (tiposDefecto.length === 0) return
    setNovedades([...novedades, { tipo_defecto_id: tiposDefecto[0].id, cantidad: 1 }])
  }

  function removeNovedad(index: number) {
    setNovedades(novedades.filter((_, i) => i !== index))
  }

  function updateNovedad(index: number, field: string, value: any) {
    const newNovedades = [...novedades]
    newNovedades[index] = { ...newNovedades[index], [field]: value }
    setNovedades(newNovedades)
  }

  async function handleSubmit() {
    startTransition(async () => {
      try {
        const res = await procesarInspeccionRecepcion({
          recepcion_id: recepcion.id,
          resultado,
          novedades,
          notas
        })
        if (res.success) {
          router.push('/calidad')
          router.refresh()
        }
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Info & Decision */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 space-y-6">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Recepción OC</span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{recepcion.ordenes_compra?.codigo}</h2>
          </div>

          <div className="p-5 bg-slate-50 rounded-3xl space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isMP ? 'Material' : 'Producto'}</p>
              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{itemCodigo}</p>
              <p className="text-xs font-bold text-slate-500">{itemNombre}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cantidad</p>
                <p className="text-xl font-black text-slate-900 tracking-tighter">
                  {recepcion.cantidad_recibida}
                  <span className="text-[10px] ml-1">{isMP ? recepcion.materiales?.unidad : 'UND'}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proveedor</p>
                <p className="text-[10px] font-bold text-slate-900 uppercase truncate">{recepcion.ordenes_compra?.terceros?.nombre}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Resultado de Inspección</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setResultado('aprobado')}
                className={`flex flex-col items-center gap-2 p-4 rounded-3xl transition-all border-2 ${
                  resultado === 'aprobado' 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Aprobado</span>
              </button>
              <button
                onClick={() => setResultado('rechazado')}
                className={`flex flex-col items-center gap-2 p-4 rounded-3xl transition-all border-2 ${
                  resultado === 'rechazado' 
                    ? 'bg-red-50 border-red-500 text-red-700' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                <XCircle className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Rechazado</span>
              </button>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleSubmit}
              disabled={pending}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-3xl font-black uppercase tracking-widest text-xs transition-all ${
                resultado === 'aprobado' 
                  ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700' 
                  : 'bg-red-600 text-white shadow-xl shadow-red-100 hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Finalizar Inspección
            </button>
          </div>
        </div>
      </div>

      {/* Right: Defects & Notes */}
      <div className="lg:col-span-8 space-y-6">
        {/* Novedades / Defectos */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Registro de Novedades</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Afectación de calidad encontrada</p>
            </div>
            <button
              onClick={addNovedad}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
              <Plus className="w-4 h-4" />
              Añadir Hallazgo
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {novedades.map((nov, idx) => (
              <div key={idx} className="p-6 lg:p-8 grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5 space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Defecto</label>
                  <select
                    className="w-full bg-slate-50 border-none rounded-2xl p-3 text-xs font-bold focus:ring-2 focus:ring-slate-900"
                    value={nov.tipo_defecto_id}
                    onChange={(e) => updateNovedad(idx, 'tipo_defecto_id', e.target.value)}
                  >
                    {tiposDefecto.map(td => (
                      <option key={td.id} value={td.id}>[{td.codigo}] {td.descripcion || td.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cant. Afectada</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border-none rounded-2xl p-3 text-xs font-black focus:ring-2 focus:ring-slate-900"
                    value={nov.cantidad}
                    onChange={(e) => updateNovedad(idx, 'cantidad', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-4 space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas específicas</label>
                  <input
                    type="text"
                    placeholder="..."
                    className="w-full bg-slate-50 border-none rounded-2xl p-3 text-xs font-bold focus:ring-2 focus:ring-slate-900"
                    value={nov.notas || ''}
                    onChange={(e) => updateNovedad(idx, 'notas', e.target.value)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeNovedad(idx)}
                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {novedades.length === 0 && (
              <div className="p-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Info className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se han registrado hallazgos específicos</p>
              </div>
            )}
          </div>
        </div>

        {/* General Notes */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 space-y-4">
          <label className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] ml-1 block">Observaciones Generales</label>
          <textarea
            rows={4}
            className="w-full bg-slate-50 border-none rounded-[2rem] p-6 text-sm font-bold focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300"
            placeholder="Escribe detalles adicionales de la inspección aquí..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
