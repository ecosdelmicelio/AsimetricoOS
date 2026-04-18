'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Trash2, PieChart, DollarSign, Wallet, Scale, TrendingUp } from 'lucide-react'
import { createSocio, deleteSocio, updateSocio } from '../services/socios-actions'
import type { Socio } from '../services/socios-actions'

interface Props {
  socios: Socio[]
}

export function SociosManager({ socios }: Props) {
  const [isPending, startTransition] = useTransition()
  
  // Form state
  const [nombre, setNombre] = useState('')
  const [aporte, setAporte] = useState(0)
  const [pPropiedad, setPPropiedad] = useState(0)
  const [pUtilidades, setPUtilidades] = useState(0)

  const totalCapital = socios.reduce((sum, s) => sum + Number(s.aporte), 0)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre) return
    startTransition(async () => {
      await createSocio({
        nombre,
        aporte,
        porcentaje_propiedad: pPropiedad || (totalCapital > 0 ? (aporte / (totalCapital + aporte)) * 100 : 100),
        porcentaje_utilidades: pUtilidades || (totalCapital > 0 ? (aporte / (totalCapital + aporte)) * 100 : 100)
      })
      setNombre('')
      setAporte(0)
      setPPropiedad(0)
      setPUtilidades(0)
    })
  }

  const handleUpdate = (id: string, field: string, value: number) => {
    startTransition(async () => {
      await updateSocio(id, { [field]: value })
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return
    startTransition(async () => {
      await deleteSocio(id)
    })
  }

  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Scale className="w-5 h-5 text-primary-600" />
        <h3 className="text-body-md font-black uppercase tracking-wider text-foreground">Gobernanza y Acuerdos</h3>
      </div>

      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-6 flex-1">
        {/* Formulario de Registro con Gobernanza */}
        <form onSubmit={handleAdd} className="space-y-4 border-b border-slate-100 pb-6 mb-4">
          <div className="grid grid-cols-2 gap-3">
             <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Socio</label>
                <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2">
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Juan Pérez..." required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-primary-600">Aporte ($)</label>
                <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2 flex gap-1">
                  <span className="text-muted-foreground font-black">$</span>
                  <input type="number" value={aporte || ''} onChange={e => setAporte(parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm outline-none font-black" placeholder="0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-amber-600">Equity (%)</label>
                <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2 flex gap-1">
                  <input type="number" value={pPropiedad || ''} onChange={e => setPPropiedad(parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm outline-none font-black" placeholder="Sugerido..." />
                  <span className="text-muted-foreground font-black">%</span>
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-emerald-600">Reparto Utilidades (%)</label>
                <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2 flex gap-1">
                  <input type="number" value={pUtilidades || ''} onChange={e => setPUtilidades(parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm outline-none font-black" placeholder="Sugerido..." />
                  <span className="text-muted-foreground font-black">%</span>
                </div>
              </div>
          </div>
          <button type="submit" disabled={isPending} className="w-full py-2.5 rounded-xl bg-primary-900 text-white text-[10px] font-black uppercase shadow-lg flex items-center justify-center gap-2">
            <UserPlus className="w-3.5 h-3.5" /> REGISTRAR ACUERDO
          </button>
        </form>

        {/* Listado de Acuerdos */}
        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {socios.map(s => (
            <div key={s.id} className="rounded-2xl bg-neu-base shadow-neu p-4 space-y-4 border border-transparent hover:border-primary-100 transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary-900 font-black text-xs">
                     {s.nombre.charAt(0)}
                   </div>
                   <p className="text-body-sm font-black text-foreground">{s.nombre}</p>
                </div>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-red-200 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-primary-600">Aporte Cap.</p>
                  <p className="text-xs font-black">{fmt(s.aporte)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-amber-600">Propiedad</p>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      defaultValue={s.porcentaje_propiedad} 
                      onBlur={e => handleUpdate(s.id, 'porcentaje_propiedad', parseFloat(e.target.value) || 0)} 
                      className="bg-transparent text-xs font-black w-8 outline-none border-b border-dashed border-slate-300 focus:border-amber-500"
                    />
                    <span className="text-[8px] font-black">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Utilidades</p>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      defaultValue={s.porcentaje_utilidades} 
                      onBlur={e => handleUpdate(s.id, 'porcentaje_utilidades', parseFloat(e.target.value) || 0)} 
                      className="bg-transparent text-xs font-black w-8 outline-none border-b border-dashed border-slate-300 focus:border-emerald-500"
                    />
                    <span className="text-[8px] font-black">%</span>
                  </div>
                </div>
              </div>
              
              {/* Indicador visual de disparidad si existe */}
              <div className="pt-2 flex gap-1 items-center">
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-amber-400" style={{ width: `${s.porcentaje_propiedad}%` }} />
                </div>
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-400" style={{ width: `${s.porcentaje_utilidades}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen Patrimonio */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
             <span>Suma Capital Social</span>
             <span className="text-primary-900">{fmt(totalCapital)}</span>
           </div>
           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
             <span>Control de Equity</span>
             <span className={`${Math.abs(socios.reduce((a,b)=>a+Number(b.porcentaje_propiedad),0)-100) < 0.1 ? 'text-emerald-500' : 'text-amber-500'}`}>
               {socios.reduce((a,b)=>a+Number(b.porcentaje_propiedad),0).toFixed(1)}% / 100%
             </span>
           </div>
        </div>
      </div>
    </div>
  )
}
