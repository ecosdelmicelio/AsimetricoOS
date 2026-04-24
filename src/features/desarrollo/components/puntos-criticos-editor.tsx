'use client'

import { useState } from 'react'
import { AlertCircle, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface PuntoCritico {
  descripcion: string
  tolerancia: string
  es_bloqueante: boolean
}

interface Props {
  versionId: string
  initialPuntos: PuntoCritico[]
  onSave: (puntos: PuntoCritico[]) => Promise<void>
}

export function PuntosCriticosEditor({ versionId, initialPuntos = [], onSave }: Props) {
  const [puntos, setPuntos] = useState<PuntoCritico[]>(initialPuntos)
  const [saving, setSaving] = useState(false)

  const addPunto = () => {
    setPuntos([...puntos, { descripcion: '', tolerancia: '', es_bloqueante: false }])
  }

  const updatePunto = (index: number, field: keyof PuntoCritico, value: any) => {
    const newPuntos = [...puntos]
    newPuntos[index] = { ...newPuntos[index], [field]: value }
    setPuntos(newPuntos)
  }

  const removePunto = (index: number) => {
    setPuntos(puntos.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(puntos)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Puntos Críticos de Calidad</h3>
          <p className="text-slate-400 text-xs font-medium">Define las validaciones obligatorias para el taller y auditoría</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Requisitos'}
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest w-12">#</th>
              <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Punto de Inspección</th>
              <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tolerancia / Criterio</th>
              <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center w-24">Bloqueante</th>
              <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {puntos.map((p, index) => (
              <tr key={index} className="group hover:bg-slate-50/30 transition-all">
                <td className="py-4 px-6">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                    {index + 1}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <input
                    value={p.descripcion}
                    onChange={e => updatePunto(index, 'descripcion', e.target.value)}
                    placeholder="Ej: Casado de cuadros en costura lateral..."
                    className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 placeholder:text-slate-200 focus:ring-0"
                  />
                </td>
                <td className="py-4 px-6">
                  <input
                    value={p.tolerancia}
                    onChange={e => updatePunto(index, 'tolerancia', e.target.value)}
                    placeholder="Ej: +/- 2mm de desfase máximo"
                    className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-600 placeholder:text-slate-200 focus:ring-0"
                  />
                </td>
                <td className="py-4 px-6 text-center">
                  <button
                    onClick={() => updatePunto(index, 'es_bloqueante', !p.es_bloqueante)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      p.es_bloqueante ? "bg-rose-50 text-rose-500" : "bg-slate-50 text-slate-300"
                    )}
                  >
                    <AlertCircle className="w-5 h-5" />
                  </button>
                </td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={() => removePunto(index)}
                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-6 bg-slate-50/30 flex justify-center border-t border-slate-100">
          <button
            onClick={addPunto}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-white transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            Agregar Punto de Inspección
          </button>
        </div>
      </div>

      <div className="bg-emerald-50/50 border border-emerald-100 rounded-[24px] p-6 flex gap-4 items-start">
        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Impacto en Auditoría</h4>
          <p className="text-xs text-emerald-800 leading-relaxed font-medium">
            Estos puntos serán la base del formulario de inspección del taller (Autocontrol) y de la Auditoría Final. 
            Los puntos marcados como **bloqueantes** impedirán la aceptación del lote si no se cumplen al 100%.
          </p>
        </div>
      </div>
    </div>
  )
}
