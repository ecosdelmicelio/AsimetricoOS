'use client'

import { useState, useTransition } from 'react'
import { Save, Clock, Info } from 'lucide-react'
import { updateAjuste } from '../services/ajustes-actions'

interface Ajuste {
  id: string
  valor: any
  descripcion: string | null
}

interface Props {
  ajustes: Ajuste[]
}

export function PlmConfigPanel({ ajustes }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Buscamos el ajuste específico
  const ajusteMeses = ajustes.find(a => a.id === 'meses_producto_nuevo')
  const [meses, setMeses] = useState(ajusteMeses?.valor?.toString() || '24')

  const handleSave = () => {
    setError(null)
    setSuccess(false)
    
    const num = parseInt(meses)
    if (isNaN(num) || num < 1) {
      setError('El valor de meses debe ser un número válido mayor a 0.')
      return
    }

    startTransition(async () => {
      const result = await updateAjuste('meses_producto_nuevo', num)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary-600" />
          PARÁMETROS DE INTELIGENCIA COMERCIAL (PLM)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Periodo de "Producto Nuevo" (Meses)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={meses}
                  onChange={e => setMeses(e.target.value)}
                  className="w-32 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">meses</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Este valor define el rango de tiempo desde la creación del producto para ser incluido en el KPI de "Innovación Comercial".
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex gap-3">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-900 mb-1">Impacto en Analíticas</p>
              <p className="text-[10px] text-blue-800 leading-relaxed italic">
                Al cambiar este valor, el porcentaje de **Innovación Comercial** en el Dashboard de Desarrollos se recalculará automáticamente para todas las métricas históricas.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-100 text-xs font-bold text-green-700">
            ✓ Configuración actualizada con éxito.
          </div>
        )}
      </div>
    </div>
  )
}
