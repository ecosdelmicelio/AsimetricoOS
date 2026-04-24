'use client'

import { useState, useTransition } from 'react'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Clock, 
  Settings2,
  AlertCircle,
  Save,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { upsertOperaciones, deleteOperacion } from '@/features/desarrollo/services/operacion-actions'
import type { DesarrolloOperacion } from '@/features/desarrollo/types'

interface Props {
  desarrolloId: string
  versionId: string
  initialOperaciones: DesarrolloOperacion[]
}

const MAQUINAS = [
  'Plana 1 Aguja',
  'Plana 2 Agujas',
  'Fileteadora 4H',
  'Fileteadora 5H',
  'Recubridora',
  'Cerradora de Codo',
  'Ojaladora',
  'Botonadora',
  'Presilladora',
  'Manual / Mano',
  'Plancha / Vapor',
  'Otro'
]

export function RutaOperacionalEditor({ desarrolloId, versionId, initialOperaciones }: Props) {
  const [ops, setOps] = useState<Partial<DesarrolloOperacion>[]>(initialOperaciones)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addOperacion = () => {
    setOps([...ops, { 
      nombre_operacion: '', 
      maquina_requerida: 'Plana 1 Aguja', 
      sam: 0,
      notas_tecnicas: '',
      orden: ops.length 
    }])
    setSaved(false)
  }

  const removeOperacion = async (index: number) => {
    const opToRemove = ops[index]
    if (opToRemove.id) {
      const confirmDelete = confirm('¿Eliminar esta operación permanentemente?')
      if (!confirmDelete) return
      
      const res = await deleteOperacion(opToRemove.id, desarrolloId)
      if (res.error) {
        setError(res.error)
        return
      }
    }
    
    const newOps = ops.filter((_, i) => i !== index)
    setOps(newOps)
    setSaved(false)
  }

  const updateOp = (index: number, updates: Partial<DesarrolloOperacion>) => {
    const newOps = [...ops]
    newOps[index] = { ...newOps[index], ...updates }
    setOps(newOps)
    setSaved(false)
    setError(null)
  }

  const handleSave = () => {
    if (ops.some(o => !o.nombre_operacion)) {
      setError('Todas las operaciones deben tener un nombre.')
      return
    }

    startTransition(async () => {
      const res = await upsertOperaciones(desarrolloId, versionId, ops)
      if (res.error) {
        setError(res.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
            <Settings2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Ruta de Confección</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Secuencia técnica para consulta de taller</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || saved}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm",
            saved 
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
              : "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          )}
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Guardado</>
          ) : (
            <><Save className="w-4 h-4" /> {isPending ? 'Guardando...' : 'Guardar Ruta'}</>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-bottom border-slate-100">
              <th className="w-12 py-4 px-4"></th>
              <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-16">#</th>
              <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Operación / Proceso</th>
              <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Máquina</th>
              <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Observaciones Técnicas</th>
              <th className="w-16 py-4 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {ops.map((op, index) => (
              <tr key={index} className="group hover:bg-slate-50/30 transition-all">
                <td className="py-3 px-4 text-center">
                  <GripVertical className="w-4 h-4 text-slate-200 cursor-grab active:cursor-grabbing" />
                </td>
                <td className="py-3 px-4">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                    {index + 1}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <input
                    value={op.nombre_operacion}
                    onChange={e => updateOp(index, { nombre_operacion: e.target.value })}
                    placeholder="Ej: Cerrar costados..."
                    className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 placeholder:text-slate-200 focus:ring-0 uppercase"
                  />
                </td>
                <td className="py-3 px-4">
                  <select
                    value={op.maquina_requerida}
                    onChange={e => updateOp(index, { maquina_requerida: e.target.value })}
                    className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[9px] font-black uppercase text-slate-600 outline-none focus:border-slate-300 transition-all"
                  >
                    {MAQUINAS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <input
                    value={op.notas_tecnicas || ''}
                    onChange={e => updateOp(index, { notas_tecnicas: e.target.value })}
                    placeholder="Ej: Usar aguja punta de bola..."
                    className="w-full bg-transparent border-none p-0 text-[11px] font-medium text-slate-500 placeholder:text-slate-200 focus:ring-0"
                  />
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => removeOperacion(index)}
                    className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex justify-center">
          <button
            onClick={addOperacion}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-white transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            Agregar Paso a la Ruta
          </button>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-6">
        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Nota de Ingeniería
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Esta secuencia será visible para el taller en sus paneles operativos. 
          Asegúrate de incluir observaciones críticas sobre agujas, hilos o tensiones especiales para garantizar la calidad.
        </p>
      </div>
    </div>
  )
}

