'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { registrarViabilidadOps } from '@/features/desarrollo/services/muestra-actions'
import type { ViabilidadOpsInput } from '@/features/desarrollo/services/muestra-actions'
import type { DesarrolloViabilidadOps } from '@/features/desarrollo/types'

interface Props {
  desarrolloId:  string
  versionId:     string
  evaluacionExistente?: DesarrolloViabilidadOps | null
  onVeredicto?:  (veredicto: string) => void
}

const CHECKLIST_ITEMS: { campo: keyof Omit<ViabilidadOpsInput, 'riesgo_abastecimiento' | 'veredicto' | 'demanda_proyectada' | 'notas_ops' | 'condiciones_aprobacion'>; label: string; descripcion: string }[] = [
  { campo: 'materiales_disponibles', label: 'Materiales disponibles', descripcion: 'Todos los materiales del BOM tienen proveedores activos con stock o capacidad de producción' },
  { campo: 'moq_viable', label: 'MOQ viable', descripcion: 'Los mínimos de compra son alcanzables dado el volumen de demanda proyectado' },
  { campo: 'leadtime_aceptable', label: 'Lead time aceptable', descripcion: 'El tiempo total (producción + envío) es compatible con los ciclos comerciales' },
  { campo: 'proveedores_confirmados', label: 'Proveedores confirmados', descripcion: 'Precios, capacidad y tiempos confirmados (no son cotizaciones informales)' },
  { campo: 'capacidad_produccion', label: 'Capacidad de producción', descripcion: 'Hay talleres disponibles para el volumen esperado (solo fabricados)' },
]

export function ViabilidadOpsPanel({ desarrolloId, versionId, evaluacionExistente, onVeredicto }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const init = evaluacionExistente
  const [checks, setChecks] = useState<Record<string, boolean>>({
    materiales_disponibles:  init?.materiales_disponibles  ?? false,
    moq_viable:              init?.moq_viable              ?? false,
    leadtime_aceptable:      init?.leadtime_aceptable      ?? false,
    proveedores_confirmados: init?.proveedores_confirmados ?? false,
    capacidad_produccion:    init?.capacidad_produccion    ?? false,
  })
  const [riesgo, setRiesgo]         = useState<'bajo' | 'medio' | 'alto'>(init?.riesgo_abastecimiento as 'bajo' | 'medio' | 'alto' ?? 'bajo')
  const [demanda, setDemanda]       = useState(init?.demanda_proyectada?.toString() ?? '')
  const [notasOps, setNotasOps]     = useState(init?.notas_ops ?? '')
  const [veredicto, setVeredicto]   = useState<'aprobado' | 'aprobado_con_reservas' | 'rechazado'>(init?.veredicto as 'aprobado' | 'aprobado_con_reservas' | 'rechazado' ?? 'aprobado')
  const [condiciones, setCondiciones] = useState(init?.condiciones_aprobacion ?? '')

  const todosOk = Object.values(checks).every(Boolean)

  function handleCheck(campo: string, value: boolean) {
    setChecks(prev => ({ ...prev, [campo]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (veredicto === 'aprobado_con_reservas' && !condiciones.trim()) {
      setError('Debes indicar las condiciones de aprobación con reservas.')
      return
    }

    startTransition(async () => {
      const result = await registrarViabilidadOps(desarrolloId, versionId, {
        materiales_disponibles:  checks.materiales_disponibles,
        moq_viable:              checks.moq_viable,
        leadtime_aceptable:      checks.leadtime_aceptable,
        proveedores_confirmados: checks.proveedores_confirmados,
        capacidad_produccion:    checks.capacidad_produccion,
        riesgo_abastecimiento:   riesgo,
        demanda_proyectada:      demanda ? parseInt(demanda) : undefined,
        notas_ops:               notasOps || undefined,
        veredicto,
        condiciones_aprobacion:  condiciones || undefined,
      })

      if (result.error) { setError(result.error); return }
      setSubmitted(true)
      onVeredicto?.(veredicto)
    })
  }

  if (submitted || (evaluacionExistente && !submitted)) {
    const v = submitted ? veredicto : evaluacionExistente?.veredicto
    return (
      <div className={cn('rounded-xl border p-4',
        v === 'aprobado' ? 'border-green-200 bg-green-50' :
        v === 'aprobado_con_reservas' ? 'border-amber-200 bg-amber-50' :
        'border-red-200 bg-red-50')}>
        <div className="flex items-center gap-2 mb-2">
          {v === 'aprobado' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
          {v === 'aprobado_con_reservas' && <AlertCircle className="w-5 h-5 text-amber-600" />}
          {v === 'rechazado' && <XCircle className="w-5 h-5 text-red-600" />}
          <span className={cn('font-black text-sm uppercase tracking-wider',
            v === 'aprobado' ? 'text-green-700' :
            v === 'aprobado_con_reservas' ? 'text-amber-700' : 'text-red-700')}>
            {v === 'aprobado' ? 'Aprobado por Operaciones' :
             v === 'aprobado_con_reservas' ? 'Aprobado con Reservas' : 'Rechazado por Operaciones'}
          </span>
        </div>
        {evaluacionExistente?.condiciones_aprobacion && (
          <p className="text-xs text-amber-700 mt-1">{evaluacionExistente.condiciones_aprobacion}</p>
        )}
        {evaluacionExistente?.notas_ops && (
          <p className="text-xs text-slate-600 mt-1 italic">{evaluacionExistente.notas_ops}</p>
        )}
        {!evaluacionExistente && (
          <button onClick={() => setSubmitted(false)}
            className="mt-2 text-xs text-slate-500 underline hover:text-slate-700">
            Editar evaluación
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Checklist de Viabilidad Operativa</span>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {CHECKLIST_ITEMS.map(item => (
          <label key={item.campo} className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={checks[item.campo]}
                onChange={e => handleCheck(item.campo, e.target.checked)}
                className="sr-only"
              />
              <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                checks[item.campo] ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-white group-hover:border-slate-400')}>
                {checks[item.campo] && <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white" />}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-500">{item.descripcion}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Riesgo + Demanda */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Riesgo de Abastecimiento</label>
          <select value={riesgo} onChange={e => setRiesgo(e.target.value as 'bajo' | 'medio' | 'alto')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
            <option value="bajo">Bajo</option>
            <option value="medio">Medio</option>
            <option value="alto">Alto</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Demanda Proyectada (und)</label>
          <input type="number" value={demanda} onChange={e => setDemanda(e.target.value)}
            placeholder="Ej: 500"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notas / Observaciones</label>
        <textarea value={notasOps} onChange={e => setNotasOps(e.target.value)} rows={2}
          placeholder="Riesgos identificados, alternativas sugeridas..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none" />
      </div>

      {/* Veredicto */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Veredicto</label>
        <div className="grid grid-cols-3 gap-2">
          {(['aprobado', 'aprobado_con_reservas', 'rechazado'] as const).map(v => (
            <button key={v} type="button" onClick={() => setVeredicto(v)}
              className={cn('py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all',
                veredicto === v ? (
                  v === 'aprobado' ? 'bg-green-600 text-white border-green-600' :
                  v === 'aprobado_con_reservas' ? 'bg-amber-500 text-white border-amber-500' :
                  'bg-red-600 text-white border-red-600'
                ) : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
              {v === 'aprobado' ? 'Aprobar' : v === 'aprobado_con_reservas' ? 'Con Reservas' : 'Rechazar'}
            </button>
          ))}
        </div>
      </div>

      {/* Condiciones si hay reservas */}
      {veredicto === 'aprobado_con_reservas' && (
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Condiciones de Aprobación *</label>
          <textarea value={condiciones} onChange={e => setCondiciones(e.target.value)} rows={2}
            placeholder="Ej: Se debe confirmar proveedor alternativo de tela antes del primer pedido masivo..."
            className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none" />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button type="submit" disabled={isPending}
        className={cn('w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50',
          veredicto === 'aprobado' ? 'bg-green-600 text-white hover:bg-green-700' :
          veredicto === 'aprobado_con_reservas' ? 'bg-amber-500 text-white hover:bg-amber-600' :
          'bg-red-600 text-white hover:bg-red-700')}>
        {isPending ? 'Guardando...' : `Registrar ${veredicto === 'aprobado' ? 'Aprobación' : veredicto === 'aprobado_con_reservas' ? 'Aprobación con Reservas' : 'Rechazo'}`}
      </button>
    </form>
  )
}
