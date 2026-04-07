'use client'

import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import type { HistorialEstado } from '@/features/ordenes-venta/types'

const ESTADO_LABELS: Record<string, string> = {
  // OV
  borrador: 'Borrador',
  confirmada: 'Confirmada',
  en_produccion: 'En Producción',
  completada: 'Completada',
  cancelada: 'Cancelada',
  // OP
  programada: 'Programada',
  en_corte: 'En Corte',
  en_confeccion: 'En Confección',
  dupro_pendiente: 'DUPRO Pendiente',
  en_terminado: 'En Terminado',
  en_entregas: 'En Entregas',
}

function label(estado: string | null) {
  if (!estado) return '—'
  return ESTADO_LABELS[estado] ?? estado
}

function formatRelative(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function duracion(desde: string, hasta: string): string {
  const ms = new Date(hasta).getTime() - new Date(desde).getTime()
  const horas = Math.floor(ms / 3_600_000)
  const dias = Math.floor(horas / 24)
  if (dias > 0) return `${dias}d ${horas % 24}h`
  if (horas > 0) return `${horas}h`
  const minutos = Math.floor(ms / 60_000)
  return `${minutos}min`
}

interface Props {
  historial: HistorialEstado[]
  createdAt: string
  createdBy?: string | null
}

export function HistorialEstados({ historial, createdAt, createdBy }: Props) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <History className="w-4 h-4" />
        <h3 className="font-semibold text-foreground text-body-sm">Historial de Estados</h3>
      </div>

      <div className="rounded-2xl bg-neu-base shadow-neu p-5">
        <div className="relative">
          {/* Línea vertical */}
          <div className="absolute left-[11px] top-4 bottom-4 w-px bg-black/10" />

          <div className="space-y-5">
            {/* Evento: creación */}
            <TimelineItem
              dot="filled"
              label="Orden creada"
              sub={createdBy ?? 'Sistema'}
              time={isClient ? formatRelative(createdAt) : ''}
            />

            {/* Transiciones de estado */}
            {historial.map((h, i) => {
              const anterior = historial[i - 1]
              const durDesde = anterior ? duracion(anterior.timestamp_cambio, h.timestamp_cambio)
                : duracion(createdAt, h.timestamp_cambio)

              return (
                <div key={h.id}>
                  {/* Duración entre estados */}
                  <div className="flex items-center gap-2 pl-7 py-1">
                    <span className="text-xs text-muted-foreground/60 italic">{durDesde} en {label(h.estado_anterior)}</span>
                  </div>
                  <TimelineItem
                    dot="ring"
                    label={`→ ${label(h.estado_nuevo)}`}
                    sub={h.profiles?.full_name ?? 'Desconocido'}
                    time={isClient ? formatRelative(h.timestamp_cambio) : ''}
                  />
                </div>
              )
            })}

            {historial.length === 0 && (
              <p className="pl-7 text-muted-foreground text-body-sm">Sin cambios de estado aún</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({
  dot,
  label: itemLabel,
  sub,
  time,
}: {
  dot: 'filled' | 'ring'
  label: string
  sub: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Dot */}
      <div className="relative z-10 mt-0.5 shrink-0">
        {dot === 'filled' ? (
          <div className="w-6 h-6 rounded-full bg-neu-base shadow-neu flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-neu-base shadow-neu-inset flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary-400" />
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-body-sm font-semibold text-foreground">{itemLabel}</span>
          <span className="text-xs text-muted-foreground shrink-0" suppressHydrationWarning>
            {time}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

