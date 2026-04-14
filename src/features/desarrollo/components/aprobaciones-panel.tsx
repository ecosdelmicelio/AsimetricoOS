'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { aprobarVersion } from '@/features/desarrollo/services/muestra-actions'

interface Props {
  versionId:         string
  desarrolloId:      string
  aprobadoOps:       boolean
  aprobadoCliente:   boolean
  aprobadoDirector:  boolean
  statusDesarrollo:  string
}

export function AprobacionesPanel({
  versionId,
  desarrolloId,
  aprobadoOps,
  aprobadoCliente,
  aprobadoDirector,
  statusDesarrollo,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [ops, setOps]             = useState(aprobadoOps)
  const [cliente, setCliente]     = useState(aprobadoCliente)
  const [director, setDirector]   = useState(aprobadoDirector)

  function toggle(campo: 'aprobado_ops' | 'aprobado_cliente' | 'aprobado_director', current: boolean, setter: (v: boolean) => void) {
    const nuevoValor = !current
    setter(nuevoValor)
    startTransition(async () => {
      const result = await aprobarVersion(versionId, desarrolloId, campo, nuevoValor)
      if (result.error) setter(current) // revert on error
    })
  }

  const isGraduated = statusDesarrollo === 'graduated' || statusDesarrollo === 'cancelled'

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Triple Aprobación</p>

      <div className="space-y-2">
        {/* Ops — Solo en ops_review */}
        <AprobacionRow
          label="Director de Operaciones"
          sublabel="Viabilidad de cadena de suministro (Fase: Revisión Ops)"
          aprobado={ops}
          gate={1}
          disabled={isGraduated || isPending || statusDesarrollo !== 'ops_review'}
          gateBlockedReason={statusDesarrollo !== 'ops_review' && !ops ? 'Solo habilitado en fase de Revisión Ops' : undefined}
          onToggle={() => toggle('aprobado_ops', ops, setOps)}
        />
 
        {/* Cliente — Solo en client_review */}
        <AprobacionRow
          label="Cliente"
          sublabel="Revisión visual/física de la muestra (Fase: Revisión Cliente)"
          aprobado={cliente}
          gate={2}
          disabled={isGraduated || isPending || !ops || statusDesarrollo !== 'client_review'}
          gateBlockedReason={!ops ? 'Ops debe aprobar primero' : (statusDesarrollo !== 'client_review' && !cliente ? 'Solo habilitado en fase de Revisión Cliente' : undefined)}
          onToggle={() => toggle('aprobado_cliente', cliente, setCliente)}
        />
 
        {/* Director de Diseño — Solo en approved/graduating */}
        <AprobacionRow
          label="Director de Diseño"
          sublabel="Validación técnica y de calidad (Fase: Aprobado)"
          aprobado={director}
          gate={3}
          disabled={isGraduated || isPending || !cliente || statusDesarrollo !== 'approved'}
          gateBlockedReason={!cliente ? 'Cliente debe aprobar primero' : (statusDesarrollo !== 'approved' && !director ? 'Solo habilitado en fase de Aprobado' : undefined)}
          onToggle={() => toggle('aprobado_director', director, setDirector)}
        />
      </div>

      {/* Estado de completitud */}
      {ops && cliente && director && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs text-green-700 font-semibold text-center">
          ✓ Triple aprobación completada — lista para graduar
        </div>
      )}

      {isPending && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
        </div>
      )}
    </div>
  )
}

function AprobacionRow({
  label,
  sublabel,
  aprobado,
  gate,
  disabled,
  gateBlockedReason,
  onToggle,
}: {
  label:              string
  sublabel:           string
  aprobado:           boolean
  gate:               number
  disabled:           boolean
  gateBlockedReason?: string
  onToggle:           () => void
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border p-3 transition-all',
      aprobado ? 'border-green-200 bg-green-50' : gateBlockedReason ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 bg-white'
    )}>
      <div className="shrink-0 w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 bg-white">
        {gate}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500">{gateBlockedReason ?? sublabel}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={cn('shrink-0 transition-all', disabled ? 'cursor-not-allowed opacity-40' : 'hover:scale-110')}
      >
        {aprobado
          ? <CheckCircle2 className="w-6 h-6 text-green-500" />
          : <Circle className="w-6 h-6 text-slate-300" />
        }
      </button>
    </div>
  )
}
