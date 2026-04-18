'use client'

import { useState, useTransition } from 'react'
import { Save, Plus, Trash2, Building, Landmark, Percent, CheckCircle2, Loader2, Sparkles, Users } from 'lucide-react'
import { updateBalanceConfig, createActivoFijo, updateActivoEstado, seedFinancialConfig } from '../services/activos-actions'
import { updateParafiscal } from '../services/empleados-actions'
import { SociosManager } from './socios-manager'
import type { ActivoFijo } from '../services/activos-actions'
import type { Socio } from '../services/socios-actions'

interface Props {
  balanceConfig: { clave: string; valor: number; nota: string }[]
  activos: ActivoFijo[]
  parafiscales: Record<string, number>
  socios: Socio[]
}

export function ConfiguracionContablePanel({ balanceConfig, activos, parafiscales, socios }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showActivoForm, setShowActivoForm] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)

  const handleSeed = () => {
    setSeedError(null)
    startTransition(async () => {
      const res = await seedFinancialConfig()
      if (res.error) setSeedError(res.error)
    })
  }

  const handleUpdateBalance = (clave: string, valor: number) => {
    setSavingKey(clave)
    startTransition(async () => {
      await updateBalanceConfig(clave, valor)
      setSavingKey(null)
    })
  }

  const handleUpdatePara = (id: string, valor: number) => {
    setSavingKey(id)
    startTransition(async () => {
      await updateParafiscal(id, valor)
      setSavingKey(null)
    })
  }

  const handleAddActivo = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      await createActivoFijo({
        nombre,
        valor_compra: valor,
        fecha_compra: fecha,
        vida_util_meses: vidaUtil,
        estado: 'activo'
      })
      setShowActivoForm(false)
      setNombre('')
    })
  }

  // Form Activo (internal state)
  const [nombre, setNombre] = useState('')
  const [valor, setValor] = useState(0)
  const [vidaUtil, setVidaUtil] = useState(60)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      
      {/* COLUMNA 1: BALANCES Y NOMINA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Landmark className="w-5 h-5 text-primary-600" />
          <h3 className="text-body-md font-black uppercase tracking-wider text-foreground">Saldos de Apertura</h3>
        </div>
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-6">
          {balanceConfig.length === 0 ? (
            <div className="text-center space-y-4 py-4">
              <Sparkles className="w-6 h-6 animate-pulse mx-auto text-amber-500" />
              <button onClick={handleSeed} disabled={isPending} className="px-6 py-2 rounded-xl bg-primary-900 text-white text-[10px] font-black uppercase">Inicializar Contabilidad</button>
            </div>
          ) : (
            balanceConfig.map(c => (
              <div key={c.clave} className="space-y-2 relative group">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.clave.replace(/_/g, ' ')}</label>
                  {savingKey === c.clave ? <Loader2 className="w-3 h-3 animate-spin text-primary-500" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500 opacity-20 group-focus-within:opacity-100" />}
                </div>
                <div className="rounded-xl bg-neu-base shadow-neu-inset px-4 py-3 flex gap-2 border-2 border-transparent focus-within:border-primary-500 transition-all">
                  <span className="text-muted-foreground font-black">$</span>
                  <input 
                    type="number" 
                    defaultValue={c.valor}
                    onBlur={(e) => handleUpdateBalance(c.clave, parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm outline-none font-black text-primary-900"
                    // Si es capital_social, lo marcamos como solo lectura si hay socios registrados (o le damos una pista visual)
                    readOnly={c.clave === 'capital_social' && socios.length > 0}
                  />
                </div>
                {c.clave === 'capital_social' && socios.length > 0 && <p className="text-[10px] text-amber-600 font-bold">Sumado automáticamente de socios.</p>}
              </div>
            ))
          )}
        </div>

        {/* PARAFISCALES */}
        <div className="flex items-center gap-2 mt-8 mb-2">
          <Percent className="w-5 h-5 text-primary-600" />
          <h3 className="text-body-md font-black uppercase tracking-wider text-foreground">Parafiscales (%)</h3>
        </div>
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 grid grid-cols-2 gap-4">
          {Object.entries(parafiscales).map(([id, val]) => (
            <div key={id} className="space-y-1 pt-2 border-t border-slate-50 first:border-0 first:pt-0">
              <label className="text-[8px] font-black uppercase text-muted-foreground truncate">{id.replace('para_', '').replace(/_/g, ' ')}</label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-2 py-1.5 flex gap-1">
                <input type="number" defaultValue={val} onBlur={(e) => handleUpdatePara(id, parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-[10px] outline-none font-bold text-primary-700" />
                <span className="text-muted-foreground text-[8px]">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUMNA 2: SOCIOS (PATRIMONIO) */}
      <div>
        <SociosManager socios={socios} />
      </div>

      {/* COLUMNA 3: ACTIVOS FIJOS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary-600" />
            <h3 className="text-body-md font-black uppercase tracking-wider text-foreground">Activos Fijos</h3>
          </div>
          <button onClick={() => setShowActivoForm(true)} className="px-4 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-black text-[10px] uppercase">Agregar</button>
        </div>

        {showActivoForm && (
          <form onSubmit={handleAddActivo} className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Nombre</label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2"><input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-transparent text-sm outline-none" required /></div>
            </div>
            <div className="flex gap-4">
              <div className="space-y-1.5 flex-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Valor</label>
                <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2"><input type="number" value={valor || ''} onChange={e => setValor(parseFloat(e.target.value)||0)} className="w-full bg-transparent text-sm outline-none font-bold" required /></div>
              </div>
              <div className="space-y-1.5 w-24">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Vida Útil</label>
                <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2"><input type="number" value={vidaUtil} onChange={e => setVidaUtil(parseInt(e.target.value)||60)} className="w-full bg-transparent text-sm outline-none font-bold" /></div>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-primary-900 text-white text-[10px] font-black uppercase">Guardar Activo</button>
          </form>
        )}

        <div className="space-y-3">
          {activos.map(a => (
            <div key={a.id} className="rounded-2xl bg-neu-base shadow-neu p-5 flex justify-between items-center group">
              <div>
                <p className="text-body-sm font-black text-foreground">{a.nombre}</p>
                <p className="text-[9px] text-red-600 font-bold uppercase tracking-widest">Depreciación: ${Number(a.depreciacion_mes).toLocaleString()}/mes</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-primary-700">${Number(a.valor_compra).toLocaleString()}</p>
                <button onClick={() => updateActivoEstado(a.id, 'dado_de_baja')} className="text-[8px] text-red-300 uppercase font-black opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">Baja</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
