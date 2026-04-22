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
const ESTRUCTURA_COLUMNAS = [
  { id: 'draft', label: 'Borrador', statuses: ['draft'], color: 'bg-slate-400' },
  { id: 'ops_review', label: 'Auditoría Ops', statuses: ['ops_review'], color: 'bg-amber-400' },
  { id: 'in_progress', label: 'Loop de Aprobación', statuses: ['sampling', 'fitting', 'client_review', 'hold'], color: 'bg-blue-400' },
  { id: 'approved', label: 'Aprobados', statuses: ['approved'], color: 'bg-emerald-400' }
]

export function DesarrolloKanbanBoard({ desarrollos }: Props) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {ESTRUCTURA_COLUMNAS.map((column) => {
          const cards = desarrollos.filter(d => column.statuses.includes(d.status as any))
          
          return (
            <div key={column.id} className="flex flex-col h-full bg-slate-50/50 rounded-[40px] border border-slate-200/50 shadow-sm min-w-0">
              {/* Kanban Column Header */}
              <div className="sticky top-0 z-10 p-6 mb-2 flex flex-col border-b border-slate-200/50 bg-slate-50/80 backdrop-blur-sm rounded-t-[40px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shadow-inner shrink-0 ${column.color}`} />
                    <h3 className="font-black text-slate-700 text-[12px] uppercase tracking-widest leading-none truncate">
                      {column.label}
                    </h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200/50 px-3 py-1 rounded-full shrink-0 shadow-sm">
                    {cards.length}
                  </span>
                </div>

                {/* Breakdown for the loop column */}
                {column.id === 'in_progress' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/50">
                    {column.statuses.map(s => {
                      const count = cards.filter(c => c.status === s).length
                      if (count === 0) return null
                      return (
                        <div key={s} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/50 border border-slate-200/30">
                          <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[s as StatusDesarrollo].split(' ')[0]}`} />
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                            {STATUS_LABELS[s as StatusDesarrollo]}: {count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Kanban Cards */}
              <div className="flex flex-col gap-5 px-4 pb-8 flex-1">
                {cards.map(card => {
                  const diasActivo = Math.floor((Date.now() - new Date(card.created_at || 0).getTime()) / (1000 * 60 * 60 * 24))
                  const isUrgente = card.prioridad === 'urgente'
                  const isDisonancia = (card as any).disonancia_activa
                  const ultimaVersion = card.desarrollo_versiones?.length 
                    ? Math.max(...card.desarrollo_versiones.map(v => v.version_n)) 
                    : 0
                  
                  return (
                    <Link
                      key={card.id}
                      href={`/desarrollo/${card.id}`}
                      className="group flex flex-col p-5 rounded-[32px] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden outline-none"
                    >
                      {/* Indicadores Superiores */}
                      <div className="flex items-center justify-between mb-4 gap-2">
                        <div className="flex flex-wrap gap-1.5 items-center min-w-0">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                            {card.temp_id}
                          </span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter ${STATUS_COLORS[card.status as StatusDesarrollo]}`}>
                            {STATUS_LABELS[card.status as StatusDesarrollo]}
                          </span>
                          {isUrgente && (
                            <span className="text-[8px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-lg uppercase tracking-tighter animate-pulse">
                              Urgente
                            </span>
                          )}
                        </div>
                        {isDisonancia && (
                          <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0">
                             <AlertCircle className="w-3 h-3 text-rose-500" />
                          </div>
                        )}
                      </div>

                      {/* Título y Cliente */}
                      <div className="mb-4">
                        <h4 className="font-black text-[14px] text-slate-900 leading-tight group-hover:text-blue-600 transition-colors tracking-tight mb-1">
                          {card.nombre_proyecto}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          <span>{card.terceros?.nombre || 'S/C'}</span>
                          <span className="opacity-30">|</span>
                          <span className="text-slate-400">{card.temporada}</span>
                        </div>
                      </div>

                      {/* Info Técnica Compacta */}
                      <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 mb-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-tighter min-w-0">
                            <Package className="w-3.5 h-3.5 opacity-40 shrink-0" />
                            <span className="truncate">
                              {card.productos ? card.productos.referencia : card.categoria_producto}
                            </span>
                          </div>
                          {ultimaVersion > 0 && (
                            <span className="text-[9px] font-black text-slate-400 bg-white border border-slate-200/50 px-2 py-0.5 rounded-lg">
                              V{ultimaVersion}
                            </span>
                          )}
                        </div>
                        
                        {(card as any).tipo_muestra_asignada && (
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-200/30 pt-2">
                            <span>Muestra: {(card as any).tipo_muestra_asignada}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-tighter">
                          <Clock className="w-3 h-3" />
                          <span>{diasActivo}d ACTIVO</span>
                        </div>
                        
                        {card.fecha_compromiso && (
                          <div className="text-[9px] font-black text-slate-900 uppercase tracking-tighter bg-slate-100 px-2.5 py-1 rounded-lg">
                            {new Date(card.fecha_compromiso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}

                {/* Empty State per column */}
                {cards.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200/50 rounded-[40px] bg-transparent transition-all hover:bg-slate-100/30 group">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Sin Desarrollos</p>
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
