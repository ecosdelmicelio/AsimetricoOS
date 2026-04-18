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
      {/* 
        Para evitar scroll horizontal, usamos 'grid' que se adapte según la pantalla.
        En Full HD / Pantallas anchas (xl/2xl) mostrará 7 columnas (grid-cols-7).
        En Laptops (lg) mostrará 4 o 5, y el resto bajan abajo envolviéndose.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {COLUMNAS_KANBAN.map((status) => {
          const cards = desarrollos.filter(d => d.status === status)
          
          return (
            <div key={status} className="flex flex-col h-full bg-neu-base/50 rounded-2xl pb-4">
              {/* Kanban Column Header */}
              <div className="sticky top-0 z-10 p-3 mb-2 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status].split(' ')[0]}`} />
                  <h3 className="font-semibold text-foreground text-sm">
                    {STATUS_LABELS[status]}
                  </h3>
                </div>
                <span className="text-xs font-bold text-muted-foreground bg-neu-base px-2 py-0.5 rounded-full shadow-neu-inset">
                  {cards.length}
                </span>
              </div>

              {/* Kanban Cards */}
              <div className="flex flex-col gap-3 px-2">
                {cards.map(card => {
                  const diasActivo = Math.floor((Date.now() - new Date(card.created_at || 0).getTime()) / (1000 * 60 * 60 * 24))
                  const isUrgente = card.prioridad === 'urgente'
                  const isDisonancia = (card as any).disonancia_activa
                  
                  return (
                    <Link
                      key={card.id}
                      href={`/desarrollo/${card.id}`}
                      className="group flex flex-col p-3 rounded-xl bg-neu-base shadow-neu hover:shadow-neu-lg hover:-translate-y-0.5 transition-all outline-none"
                    >
                      {/* Header de la Tarjeta */}
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded uppercase tracking-wider truncate max-w-[80%]">
                          {card.temp_id}
                        </span>
                        {isDisonancia && (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 fill-red-100 shrink-0" />
                        )}
                      </div>

                      {/* Título de Proyecto */}
                      <h4 className="font-semibold text-sm text-foreground leading-snug group-hover:text-primary-700 transition-colors mb-2">
                        {card.nombre_proyecto}
                      </h4>

                      {/* Info de Chasis / Producto */}
                      {card.productos ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <Package className="w-3.5 h-3.5" />
                          <span className="truncate">Chasis: {card.productos.referencia}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <Package className="w-3.5 h-3.5" />
                          <span className="truncate">{card.categoria_producto} (Nuevo)</span>
                        </div>
                      )}

                      {/* Footer Info */}
                      <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-medium">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{diasActivo}d trans.</span>
                        </div>
                        
                        {(card as any).tipo_muestra_asignada ? (
                          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold">
                            TIPO {(card as any).tipo_muestra_asignada}
                          </span>
                        ) : (
                          <span className="text-gray-400">Sin Tipo</span>
                        )}
                      </div>
                      
                      {/* Indicator line for urgents */}
                      {isUrgente && (
                        <div className="mt-2 w-full h-1 bg-red-400 rounded-full" />
                      )}
                    </Link>
                  )
                })}

                {/* Empty State visual por columna */}
                {cards.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border/40 rounded-xl bg-transparent">
                    <p className="text-xs font-medium text-muted-foreground text-center">Sin muestras</p>
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
