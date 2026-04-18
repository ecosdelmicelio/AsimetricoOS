'use client'

import { useState } from 'react'
import { UserCheck, Search, Users, ShieldAlert, DollarSign } from 'lucide-react'
import { EmpleadoForm } from './empleado-form'
import type { Empleado } from '../services/empleados-actions'

interface Props {
  initialEmpleados: Empleado[]
}

export function EmpleadosManager({ initialEmpleados }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = initialEmpleados.filter(e => 
    e.nombre.toLowerCase().includes(query.toLowerCase()) || 
    e.area.toLowerCase().includes(query.toLowerCase())
  )

  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar empleados por nombre o área..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-neu-base shadow-neu-inset rounded-xl py-2.5 pl-10 pr-4 text-body-sm outline-none"
          />
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-900 text-white font-black text-body-sm shadow-lg hover:scale-[1.02] transition-transform"
        >
          <UserCheck className="w-4 h-4" /> Nuevo Empleado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(emp => (
          <div key={emp.id} className="rounded-3xl bg-neu-base shadow-neu p-6 space-y-4 hover:scale-[1.01] transition-transform group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-body-md font-black text-foreground">{emp.nombre}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold uppercase tracking-wider">{emp.area}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{emp.cargo}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Salario Base</p>
                <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  {fmt(emp.salario_base)}
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Riesgo ARL</p>
                <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                  <ShieldAlert className="w-3 h-3" />
                  Nivel {emp.nivel_riesgo_arl}
                </div>
              </div>
            </div>
            
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-muted-foreground italic">
              <span>Ingreso: {new Date(emp.fecha_ingreso).toLocaleDateString()}</span>
              <span className={emp.estado === 'activo' ? 'text-emerald-600 font-bold uppercase' : 'text-red-500 font-bold uppercase'}>
                {emp.estado}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground space-y-2">
            <Users className="w-12 h-12 mx-auto opacity-20" />
            <p className="text-sm italic">No se encontraron empleados que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>

      {/* Modal / Overlay for form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-neu-base shadow-2xl rounded-3xl p-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-title-sm font-black text-foreground">Registrar Colaborador</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-red-500 font-black">CERRAR</button>
            </div>
            <EmpleadoForm onSuccess={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
