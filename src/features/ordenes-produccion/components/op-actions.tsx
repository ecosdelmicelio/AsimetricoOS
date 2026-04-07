'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEstadoOP, cancelOrdenProduccion } from '@/features/ordenes-produccion/services/op-actions'
import { iniciarDupro } from '@/features/calidad/services/calidad-actions'
import type { EstadoOP } from '@/features/ordenes-produccion/types'
import { SECUENCIA_ESTADOS } from '@/features/ordenes-produccion/types'

const STEP_LABELS: Partial<Record<EstadoOP, string>> = {
  programada:     'Programada',
  en_corte:       'En Corte',
  en_confeccion:  'En Confección',
  dupro_pendiente:'DuPro en Proceso',
  en_terminado:   'En Terminado',
  entregada:      'Entregada',
  liquidada:      'Liquidada',
}
import { XCircle } from 'lucide-react'

// en_corte → en_confeccion es automático al guardar reporte de corte.
// en_confeccion → dupro_pendiente usa iniciarDupro() (crea inspección + transición).
// dupro_pendiente → en_terminado ocurre al cerrar la inspección DUPRO en /calidad.
// en_terminado → en_entregas es automático al guardar insumos.
const SIGUIENTE: Partial<Record<EstadoOP, EstadoOP>> = {
  programada: 'en_corte',
}

const LABELS_ACCION: Partial<Record<EstadoOP, string>> = {
  programada:    'Iniciar Corte',
  en_confeccion: 'Iniciar DuPro',
}

interface Props {
  opId: string
  estadoActual: string
}
export function OPActions({ opId, estadoActual }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const estado = estadoActual as EstadoOP
  const siguienteEstado = SIGUIENTE[estado]
  const labelAccion = LABELS_ACCION[estado]
  const puedeCancelar = estado !== 'liquidada' && estado !== 'cancelada'

  // en_confeccion tiene su propia acción
  const esEnviarDupro = estado === 'en_confeccion'

  function handleAvanzar() {
    startTransition(async () => {
      if (esEnviarDupro) {
        await iniciarDupro(opId)
      } else {
        await updateEstadoOP(opId, siguienteEstado!)
      }
      router.refresh()
    })
  }

  function handleCancelar() {
    if (!confirm('¿Estás seguro de que deseas cancelar esta orden de producción?')) return
    startTransition(async () => {
      await cancelOrdenProduccion(opId)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {(esEnviarDupro || (siguienteEstado && labelAccion)) && (
        <button
          onClick={handleAvanzar}
          disabled={isPending}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg disabled:opacity-40 disabled:pointer-events-none w-full shrink-0"
        >
          {isPending ? 'Actualizando...' : (LABELS_ACCION[estado] ?? 'Enviar a DUPRO')}
        </button>
      )}

      {puedeCancelar && (
        <button
          onClick={handleCancelar}
          disabled={isPending}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-neu-base shadow-neu-inset text-red-600 hover:text-red-700 font-medium text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg disabled:opacity-40 w-full shrink-0"
          title="Cancelar OP"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancelar</span>
        </button>
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
          const label = STEP_LABELS[e] ?? e.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

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
