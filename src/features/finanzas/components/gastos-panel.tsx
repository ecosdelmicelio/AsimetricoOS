'use client'

import { useState, useTransition } from 'react'
import { Plus, Filter, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { GastoForm } from './gasto-form'
import type { Gasto, CategoriaGasto, AreaNegocio } from '../types'

interface Tercero {
  id: string
  nombre: string
}

interface Props {
  initialGastos: Gasto[]
  categorias: CategoriaGasto[]
  terceros: Tercero[]
}

export function GastosPanel({ initialGastos, categorias, terceros }: Props) {
  const [gastos, setGastos] = useState(initialGastos)
  const [showForm, setShowForm] = useState(false)
  const [filtroArea, setFiltroArea] = useState<string>('todas')
  const [isPending, startTransition] = useTransition()

  const totalesPorArea = initialGastos.reduce((acc, g) => {
    acc[g.area] = (acc[g.area] || 0) + Number(g.monto_total)
    return acc
  }, {} as Record<string, number>)

  const totalMensual = initialGastos.reduce((sum, g) => sum + Number(g.monto_total), 0)

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-display-xs font-bold text-foreground">Gestión de Gastos</h1>
          <p className="text-body-sm text-muted-foreground">Control de egresos operativos y centros de costo.</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-black text-body-sm transition-all active:shadow-neu-inset hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Nuevo Gasto
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-neu-base shadow-neu p-4 border-l-4 border-primary-500">
          <div className="flex items-center gap-3 text-primary-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Gastos Mes</span>
          </div>
          <p className="text-title-lg font-bold text-foreground">${totalMensual.toLocaleString('es-CO')}</p>
        </div>

        <div className="rounded-2xl bg-neu-base shadow-neu p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-3 text-amber-600 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Mayor área: Operaciones</span>
          </div>
          <p className="text-title-lg font-bold text-foreground">${(totalesPorArea['Operaciones'] || 0).toLocaleString('es-CO')}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Listado de Gastos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Historial Reciente</span>
            </div>
            <select 
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className="bg-transparent text-xs font-bold text-primary-700 outline-none"
            >
              <option value="todas">Todas las áreas</option>
              <option value="Comercial">Comercial</option>
              <option value="Mercadeo">Mercadeo</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Operaciones">Operaciones</option>
              <option value="Desarrollo">Desarrollo</option>
            </select>
          </div>

          <div className="space-y-3">
            {initialGastos.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 p-12 text-center">
                <p className="text-muted-foreground text-sm">No hay gastos registrados en este periodo.</p>
              </div>
            ) : (
              initialGastos.filter(g => filtroArea === 'todas' || g.area === filtroArea).map(g => (
                <div key={g.id} className="group rounded-2xl bg-neu-base shadow-neu p-4 flex items-center justify-between hover:scale-[1.01] transition-transform">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-body-sm font-bold text-foreground">{g.descripcion}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold uppercase">{g.area}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{new Date(g.fecha).toLocaleDateString('es-CO')}</span>
                        {g.terceros && <span className="text-[10px] text-primary-600 font-bold">• {g.terceros.nombre}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-body-md font-black text-foreground">${Number(g.monto_total).toLocaleString('es-CO')}</p>
                    <p className="text-[10px] text-muted-foreground italic capitalize">{g.tipo}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar / Form Contextual */}
        <div className="space-y-6">
           {showForm ? (
             <div className="rounded-3xl bg-neu-base shadow-neu p-6 border-2 border-primary-500/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-foreground text-body-md">Registrar Nuevo Egreso</h3>
                  <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-red-500"><X className="w-5 h-5" /></button>
                </div>
                <GastoForm 
                  categorias={categorias} 
                  terceros={terceros} 
                  onSuccess={() => setShowForm(false)} 
                  onCancel={() => setShowForm(false)}
                />
             </div>
           ) : (
             <div className="rounded-3xl bg-primary-900 p-6 text-white shadow-xl relative overflow-hidden">
               <div className="relative z-10">
                 <h3 className="text-title-sm font-bold mb-2">Presupuesto por Áreas</h3>
                 <p className="text-xs text-primary-200 mb-6">Visualiza el cumplimiento detallado en la pestaña de presupuestos.</p>
                 
                 <div className="space-y-4">
                    {/* Placeholder de visualización rápida */}
                    {Object.entries(totalesPorArea).slice(0, 3).map(([area, total]) => (
                      <div key={area} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span>{area}</span>
                          <span className="text-primary-300">${total.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-400 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
               <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary-800 rounded-full blur-2xl opacity-50"></div>
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
