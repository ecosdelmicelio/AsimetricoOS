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
      <div className="flex items-center gap-3 px-4">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Historial de Estados</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Trazabilidad Crítica de la Orden</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none rotate-12">
          <History className="w-64 h-64" />
        </div>
        
        <div className="relative">
          {/* Línea vertical */}
          <div className="absolute left-[17px] top-6 bottom-6 w-0.5 bg-slate-100/80" />

          <div className="space-y-10">
            {/* Evento: creación */}
            <TimelineItem
              dot="filled"
              label="Orden de Producción Generada"
              sub={createdBy ?? 'Sistema Central'}
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
                  <div className="flex items-center gap-2 pl-12 py-2 mb-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                      Tiempo de Permanencia: {durDesde}
                    </span>
                  </div>
                  <TimelineItem
                    dot="ring"
                    label={`Transición a ${label(h.estado_nuevo)}`}
                    sub={h.profiles?.full_name ?? 'Operario Desconocido'}
                    time={isClient ? formatRelative(h.timestamp_cambio) : ''}
                  />
                </div>
              )
            })}

            {historial.length === 0 && (
              <div className="pl-12 py-10">
                <p className="text-slate-300 text-[11px] font-black uppercase tracking-widest italic border-l-2 border-slate-100 pl-4">
                  Sin transiciones de estado adicionales registradas hasta el momento
                </p>
              </div>
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
    <div className="flex items-start gap-6 group">
      {/* Dot */}
      <div className="relative z-10 mt-1 shrink-0">
        {dot === 'filled' ? (
          <div className="w-9 h-9 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/20 group-hover:scale-110 transition-transform duration-300">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm group-hover:border-primary-500 transition-all duration-300 group-hover:shadow-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 group-hover:bg-primary-500 transition-colors" />
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 bg-slate-50/30 p-5 rounded-3xl border border-transparent hover:border-slate-100 hover:bg-white transition-all duration-300 group-hover:shadow-xl">
        <div className="flex items-start justify-between gap-4 mb-2">
          <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{itemLabel}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-white px-2 py-1 rounded-lg border border-slate-100" suppressHydrationWarning>
            {time}
          </span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-primary-500/20 flex items-center justify-center">
             <div className="w-1 h-1 rounded-full bg-primary-500" />
           </div>
           <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{sub}</p>
        </div>
      </div>
    </div>
  )
}

