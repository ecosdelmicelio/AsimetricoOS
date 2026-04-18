'use client'

import React from 'react'
import Link from 'next/link'
import { Plus, Clock, Package, AlertCircle } from 'lucide-react'
import { SECUENCIA_STATUS, STATUS_LABELS, STATUS_COLORS, StatusDesarrollo } from '@/features/desarrollo/types'
import type { DesarrolloConRelaciones } from '@/features/desarrollo/types'

interface Props {
  desarrollos: DesarrolloConRelaciones[]
}

// Para que quepa bien sin scroll, definimos las columnas que son del flujo "En Tránsito".
// Obviamos "graduated" y "descartado" de la vista Kanban porque van a un historial.
const COLUMNAS_KANBAN: StatusDesarrollo[] = [
  'draft',
  'ops_review',
  'sampling',
  'fitting',
  'client_review',
  'hold',
  'approved' // Opcional, pero Approved es el último estado antes del histórico
]

export function DesarrolloKanbanBoard({ desarrollos }: Props) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
        {COLUMNAS_KANBAN.map((status) => {
          const cards = desarrollos.filter(d => d.status === status)
          
          return (
            <div key={status} className="flex flex-col h-full bg-slate-50/50 rounded-[32px] border border-slate-200/50 shadow-sm min-w-0">
              {/* Kanban Column Header */}
              <div className="sticky top-0 z-10 p-5 mb-2 flex items-center justify-between border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shadow-inner shrink-0 ${STATUS_COLORS[status].split(' ')[0]}`} />
                  <h3 className="font-black text-slate-700 text-[11px] uppercase tracking-widest leading-none truncate">
                    {STATUS_LABELS[status]}
                  </h3>
                </div>
                <span className="text-[10px] font-black text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-xl shrink-0">
                  {cards.length}
                </span>
              </div>

              {/* Kanban Cards */}
              <div className="flex flex-col gap-4 px-3 pb-6 flex-1">
                {cards.map(card => {
                  const diasActivo = Math.floor((Date.now() - new Date(card.created_at || 0).getTime()) / (1000 * 60 * 60 * 24))
                  const isUrgente = card.prioridad === 'urgente'
                  const isDisonancia = (card as any).disonancia_activa
                  
                  return (
                    <Link
                      key={card.id}
                      href={`/desarrollo/${card.id}`}
                      className="group flex flex-col p-4 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden outline-none"
                    >
                      {/* Status Accent */}
                      {isUrgente && (
                        <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
                      )}

                      {/* Header de la Tarjeta */}
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[85%]">
                          {card.temp_id}
                        </span>
                        {isDisonancia && (
                          <div className="w-4 h-4 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0">
                             <AlertCircle className="w-2.5 h-2.5 text-rose-500" />
                          </div>
                        )}
                      </div>

                      {/* Título de Proyecto */}
                      <h4 className="font-black text-[13px] text-slate-900 leading-snug group-hover:text-primary-600 transition-colors mb-3 tracking-tight">
                        {card.nombre_proyecto}
                      </h4>

                      {/* Info de Producto */}
                      <div className="bg-slate-50/50 rounded-2xl p-2.5 border border-slate-100 mb-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          <Package className="w-3.5 h-3.5 opacity-50" />
                          <span className="truncate">
                            {card.productos ? `${card.productos.referencia}` : `${card.categoria_producto}`}
                          </span>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                          <Clock className="w-3 h-3" />
                          <span>{diasActivo}d trans.</span>
                        </div>
                        
                        {(card as any).tipo_muestra_asignada ? (
                          <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-widest">
                            { (card as any).tipo_muestra_asignada }
                          </span>
                        ) : (
                          <span className="text-slate-200 font-black text-[9px] uppercase tracking-widest">S/T</span>
                        )}
                      </div>
                    </Link>
                  )
                })}

                {/* Empty State per column */}
                {cards.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200/50 rounded-[28px] bg-transparent transition-colors hover:bg-slate-100/30 group">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Vacio</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
