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
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-2">
        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
          <History className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Historial de Estados</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Trazabilidad de la orden</p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
          <History className="w-64 h-64" />
        </div>
        
        <div className="relative">
          {/* Línea vertical */}
          <div className="absolute left-[13px] top-4 bottom-4 w-px bg-slate-100" />

          <div className="space-y-8">
            {/* Evento: creación */}
            <TimelineItem
              dot="filled"
              label="Orden creada"
              sub={createdBy ?? 'Sistema'}
              time={isClient ? formatRelative(createdAt) : ''}
              isFirst
            />

            {/* Transiciones de estado */}
            {historial.map((h, i) => {
              const anterior = historial[i - 1]
              const durDesde = anterior ? duracion(anterior.timestamp_cambio, h.timestamp_cambio)
                : duracion(createdAt, h.timestamp_cambio)

              return (
                <div key={h.id} className="relative">
                  {/* Duración entre estados */}
                  <div className="flex items-center gap-2 pl-10 py-1 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                      Permanencia: {durDesde}
                    </span>
                  </div>
                  <TimelineItem
                    dot="ring"
                    label={`Transición a ${label(h.estado_nuevo)}`}
                    sub={h.profiles?.full_name ?? 'Desconocido'}
                    time={isClient ? formatRelative(h.timestamp_cambio) : ''}
                  />
                </div>
              )
            })}

            {historial.length === 0 && (
              <p className="pl-10 text-slate-400 text-xs font-bold uppercase tracking-widest py-4 italic">
                Sin cambios de estado adicionales registrados
              </p>
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
  isFirst = false,
}: {
  dot: 'filled' | 'ring'
  label: string
  sub: string
  time: string
  isFirst?: boolean
}) {
  return (
    <div className="flex items-start gap-5 group">
      {/* Dot */}
      <div className="relative z-10 mt-1 shrink-0">
        {dot === 'filled' ? (
          <div className="w-7 h-7 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:border-primary-500 transition-all">
            <div className="w-2 h-2 rounded-full bg-primary-500" />
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 bg-slate-50/50 p-4 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-white transition-all group-hover:shadow-md">
        <div className="flex items-start justify-between gap-4 mb-1">
          <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{itemLabel}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0" suppressHydrationWarning>
            {time}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
           <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
           <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{sub}</p>
        </div>
      </div>
    </div>
  )
}

