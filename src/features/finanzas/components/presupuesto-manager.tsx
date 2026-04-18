'use client'

import { useState, useTransition } from 'react'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { updatePresupuesto } from '../services/presupuestos-actions'
import type { PresupuestoArea, AreaNegocio } from '../types'

interface Props {
  initialPresupuestos: PresupuestoArea[]
  anioActual: number
}

const AREAS: AreaNegocio[] = [
  'Comercial', 'Mercadeo', 'Administrativo', 'Operaciones', 
  'Desarrollo', 'Logistica', 'Talento_Humano'
]

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function PresupuestoManager({ initialPresupuestos, anioActual }: Props) {
  const [presupuestos, setPresupuestos] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    initialPresupuestos.forEach(p => {
      map[`${p.area}-${p.mes}`] = Number(p.monto_limite)
    })
    return map
  })
  
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1)
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  function handleChange(area: string, valor: string) {
    const num = parseFloat(valor) || 0
    setPresupuestos(prev => ({
      ...prev,
      [`${area}-${mesSeleccionado}`]: num
    }))
  }

  async function handleSave() {
    setMensaje(null)
    startTransition(async () => {
      const promises = AREAS.map(area => {
        const monto = presupuestos[`${area}-${mesSeleccionado}`] || 0
        return updatePresupuesto({
          area,
          mes: mesSeleccionado,
          anio: anioActual,
          monto_limite: monto
        })
      })

      const results = await Promise.all(promises)
      const hasError = results.some(r => r.error)

      if (hasError) {
        setMensaje({ text: 'Error al guardar algunos presupuestos', type: 'error' })
      } else {
        setMensaje({ text: 'Presupuestos actualizados con éxito', type: 'success' })
        setTimeout(() => setMensaje(null), 3000)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-title-sm font-bold text-foreground">Configuración de Presupuestos</h2>
          <p className="text-body-sm text-muted-foreground">Establece los límites mensuales por departamento para {anioActual}.</p>
        </div>

        <div className="flex items-center gap-3">
           <select 
             value={mesSeleccionado}
             onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
             className="px-4 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-bold outline-none"
           >
             {MESES.map((nombre, i) => (
               <option key={i} value={i + 1}>{nombre}</option>
             ))}
           </select>

           <button
             onClick={handleSave}
             disabled={isPending}
             className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-black text-body-sm transition-all active:shadow-neu-inset hover:scale-[1.02] disabled:opacity-50"
           >
             <Save className="w-4 h-4" />
             {isPending ? 'Guardando...' : 'Guardar Todo'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AREAS.map(area => {
          const valor = presupuestos[`${area}-${mesSeleccionado}`] ?? 0
          return (
            <div key={area} className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{area}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Límito Mensual (COP)</label>
                <div className="rounded-xl bg-neu-base shadow-neu-inset px-4 py-3 flex items-center gap-3">
                  <span className="text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={valor || ''}
                    onChange={(e) => handleChange(area, e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-body-md font-bold text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-3">
                 <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5" />
                 <p className="text-[10px] text-slate-500 leading-relaxed">
                   Este monto se utilizará para calcular el indicador de cumplimiento y rentabilidad para {area} en {MESES[mesSeleccionado-1]}.
                 </p>
              </div>
            </div>
          )
        })}
      </div>

      {mensaje && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up ${
          mensaje.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {mensaje.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-body-sm font-bold">{mensaje.text}</span>
        </div>
      )}
    </div>
  )
}
