'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEstadoOP } from '@/features/ordenes-produccion/services/op-actions'
import type { EstadoOP } from '@/features/ordenes-produccion/types'
import { SECUENCIA_ESTADOS } from '@/features/ordenes-produccion/types'

// Estado dupro_pendiente NO se avanza desde aquí: ocurre al cerrar la inspección DUPRO.
// Estado en_entregas → completada es automático al registrar todas las entregas.
const SIGUIENTE: Partial<Record<EstadoOP, EstadoOP>> = {
  programada:    'en_corte',
  en_corte:      'en_confeccion',
  en_confeccion: 'dupro_pendiente',
  en_terminado:  'en_entregas',
}

const LABELS_ACCION: Partial<Record<EstadoOP, string>> = {
  programada:    'Iniciar Corte',
  en_corte:      'Pasar a Confección',
  en_confeccion: 'Enviar a DUPRO',
  en_terminado:  'Iniciar Entregas',
}

interface Props {
  opId: string
  estadoActual: string
  tieneReporteCorte?: boolean
}

export function OPActions({ opId, estadoActual, tieneReporteCorte = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const estado = estadoActual as EstadoOP
  const siguienteEstado = SIGUIENTE[estado]
  const labelAccion = LABELS_ACCION[estado]

  if (!siguienteEstado || !labelAccion) return null

  // Gate: no avanzar de en_corte sin reporte de corte
  const bloqueado = estado === 'en_corte' && !tieneReporteCorte

  function handleAvanzar() {
    startTransition(async () => {
      await updateEstadoOP(opId, siguienteEstado!)
      router.refresh()
    })
  }

  return (
    <div className="relative group">
      <button
        onClick={handleAvanzar}
        disabled={isPending || bloqueado}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg disabled:opacity-40 disabled:pointer-events-none shrink-0"
      >
        {isPending ? 'Actualizando...' : labelAccion}
      </button>
      {bloqueado && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-neu-base shadow-neu p-3 text-xs text-muted-foreground hidden group-hover:block z-10 pointer-events-none">
          Registra el Reporte de Corte antes de pasar a Confección
        </div>
      )}
    </div>
  )
}

export function OPProgreso({ estadoActual }: { estadoActual: string }) {
  const estado = estadoActual as EstadoOP
  const idxActual = SECUENCIA_ESTADOS.indexOf(estado)

  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-5">
      <p className="text-body-sm font-medium text-muted-foreground mb-3">Progreso de Producción</p>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {SECUENCIA_ESTADOS.map((e, i) => {
          const isPast = i < idxActual
          const isCurrent = i === idxActual
          const label = e.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

          return (
            <div key={e} className="flex items-center gap-1.5 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  isPast ? 'bg-primary-500 text-white shadow-inner' :
                  isCurrent ? 'bg-neu-base shadow-neu text-primary-600 ring-2 ring-primary-400' :
                  'bg-neu-base shadow-neu-inset text-muted-foreground'
                }`}>
                  {isPast ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] text-center max-w-[64px] leading-tight ${
                  isCurrent ? 'text-primary-600 font-semibold' : 'text-muted-foreground'
                }`}>
                  {label}
                </span>
              </div>
              {i < SECUENCIA_ESTADOS.length - 1 && (
                <div className={`w-6 h-0.5 mb-5 rounded ${isPast ? 'bg-primary-400' : 'bg-black/10'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
