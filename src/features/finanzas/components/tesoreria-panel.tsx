'use client'

import { useState, useTransition } from 'react'
import { 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  ArrowLeftRight, 
  History, 
  MoreVertical,
  Banknote,
  Building2,
  Smartphone,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { createCuentaBancaria, registrarMovimiento, realizarTransferencia } from '../services/tesoreria-actions'
import type { CuentaBancaria } from '../services/tesoreria-actions'

interface Props {
  cuentas: CuentaBancaria[]
  movimientos: any[]
}

export function TesoreriaPanel({ cuentas, movimientos }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAddCuenta, setShowAddCuenta] = useState(false)
  const [showMovimiento, setShowMovimiento] = useState<'ingreso' | 'egreso' | 'transferencia' | null>(null)
  const [selectedCuentaId, setSelectedCuentaId] = useState<string>('')

  // State for forms
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<any>('banco')
  const [entidad, setEntidad] = useState('')
  
  const [monto, setMonto] = useState(0)
  const [concepto, setConcepto] = useState('')
  const [cuentaDestinoId, setCuentaDestinoId] = useState('')

  const handleAddCuenta = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      await createCuentaBancaria({ nombre, tipo, entidad, numero_cuenta: '' })
      setShowAddCuenta(false)
      setNombre('')
    })
  }

  const handleMovimiento = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCuentaId) return
    
    startTransition(async () => {
      if (showMovimiento === 'transferencia') {
        await realizarTransferencia(selectedCuentaId, cuentaDestinoId, monto, concepto)
      } else {
        await registrarMovimiento({
          cuenta_id: selectedCuentaId,
          tipo: showMovimiento as any,
          monto,
          concepto
        })
      }
      setShowMovimiento(null)
      setMonto(0)
      setConcepto('')
    })
  }

  const totalLiquidez = cuentas.reduce((sum, c) => sum + Number(c.saldo_actual), 0)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER & LIQUIDEZ TOTAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-display-sm font-black text-foreground flex items-center gap-3">
             <div className="p-3 rounded-2xl bg-primary-900 shadow-lg text-white">
                <Wallet className="w-8 h-8" />
             </div>
             Tesorería Real
          </h2>
          <p className="text-muted-foreground font-medium mt-1">Control de liquidez inmediata y cajas menores.</p>
        </div>

        <div className="rounded-3xl bg-neu-base shadow-neu p-6 border-l-8 border-primary-900 min-w-[280px]">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Liquidez Total Consolidada</p>
           <h3 className="text-3xl font-black text-primary-900">
              ${totalLiquidez.toLocaleString('es-CO')}
           </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQ: CUENTAS (8 slots) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-body-lg font-black uppercase tracking-widest text-slate-400">Cuentas y Cajas</h3>
            <button 
              onClick={() => setShowAddCuenta(!showAddCuenta)}
              className="p-2 rounded-xl bg-neu-base shadow-neu text-primary-900 border border-white hover:bg-slate-50 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {showAddCuenta && (
             <form onSubmit={handleAddCuenta} className="rounded-3xl bg-neu-base shadow-neu p-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Nombre Cuenta</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-transparent border-b-2 border-slate-200 focus:border-primary-900 outline-none p-2 font-bold text-sm" placeholder="Ej: Banco Principal" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full bg-transparent border-b-2 border-slate-200 outline-none p-2 font-bold text-sm">
                    <option value="banco">🏦 Banco</option>
                    <option value="caja_fisica">💵 Caja Física</option>
                    <option value="billetera_digital">📱 Billetera Virtual</option>
                  </select>
                </div>
                <div className="flex items-end">
                   <button type="submit" className="w-full py-3 rounded-2xl bg-primary-900 text-white font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-transform">Crear Cuenta</button>
                </div>
             </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cuentas.map(c => {
               const isCaja = c.tipo === 'caja_fisica'
               const isVirtual = c.tipo === 'billetera_digital'
               return (
                  <div 
                    key={c.id} 
                    onClick={() => {setSelectedCuentaId(c.id); setShowMovimiento(null)}}
                    className={`rounded-3xl p-6 cursor-pointer transition-all duration-300 group border-2 ${selectedCuentaId === c.id ? 'bg-primary-50 border-primary-900 shadow-inner' : 'bg-neu-base shadow-neu border-transparent hover:border-slate-200'}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-3 rounded-2xl shadow-sm ${isCaja ? 'bg-amber-100 text-amber-700' : isVirtual ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isCaja ? <Banknote /> : isVirtual ? <Smartphone /> : <Building2 />}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedCuentaId(c.id); setShowMovimiento('egreso') }} className="p-2 rounded-lg bg-white/50 text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedCuentaId(c.id); setShowMovimiento('ingreso') }} className="p-2 rounded-lg bg-white/50 text-emerald-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><ArrowDownLeft className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-body-md font-black text-slate-800">{c.nombre}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.entidad || c.tipo.replace('_', ' ')}</p>
                      <div className="mt-4 flex justify-between items-end">
                        <span className="text-2xl font-black text-slate-900">${Number(c.saldo_actual).toLocaleString('es-CO')}</span>
                        <div className="w-8 h-1 bg-slate-200 rounded-full group-hover:bg-primary-900 transition-colors" />
                      </div>
                    </div>
                  </div>
               )
            })}
          </div>
        </div>

        {/* COLUMNA DER: ACCIONES Y LOG (4 slots) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl bg-neu-base shadow-neu p-8 space-y-6">
             <div className="flex items-center gap-2 mb-2">
                <ArrowLeftRight className="w-5 h-5 text-primary-900" />
                <h3 className="text-body-md font-black uppercase tracking-widest text-foreground">Operaciones</h3>
             </div>

             {selectedCuentaId ? (
                <div className="space-y-4">
                   <div className="flex gap-2">
                      <button onClick={() => setShowMovimiento('ingreso')} className={`flex-1 py-3 rounded-2xl font-black text-[9px] uppercase tracking-tighter transition-all ${showMovimiento === 'ingreso' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>Ingreso</button>
                      <button onClick={() => setShowMovimiento('egreso')} className={`flex-1 py-3 rounded-2xl font-black text-[9px] uppercase tracking-tighter transition-all ${showMovimiento === 'egreso' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>Egreso</button>
                      <button onClick={() => setShowMovimiento('transferencia')} className={`flex-1 py-3 rounded-2xl font-black text-[9px] uppercase tracking-tighter transition-all ${showMovimiento === 'transferencia' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>Transf.</button>
                   </div>

                   {showMovimiento && (
                      <form onSubmit={handleMovimiento} className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in duration-300">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-muted-foreground">Monto</label>
                            <div className="rounded-2xl bg-neu-base shadow-neu-inset px-4 py-3 flex items-center gap-2">
                               <span className="font-black text-slate-400">$</span>
                               <input type="number" value={monto || ''} onChange={e => setMonto(parseFloat(e.target.value)||0)} className="w-full bg-transparent outline-none font-black text-lg text-primary-900" placeholder="0" required />
                            </div>
                         </div>
                         
                         {showMovimiento === 'transferencia' && (
                            <div className="space-y-1.5">
                               <label className="text-[9px] font-black uppercase text-secondary-600">Cuenta Destino</label>
                               <select value={cuentaDestinoId} onChange={e => setCuentaDestinoId(e.target.value)} className="w-full bg-slate-100 rounded-xl p-3 font-bold text-xs" required>
                                  <option value="">Seleccionar...</option>
                                  {cuentas.filter(c => c.id !== selectedCuentaId).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                               </select>
                            </div>
                         )}

                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-muted-foreground">Concepto</label>
                            <input value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full bg-slate-50 border-b border-slate-200 p-2 font-bold text-xs outline-none focus:border-primary-900" placeholder="Ej: Pago de almuerzo equipo" required />
                         </div>

                         <button type="submit" disabled={isPending} className="w-full py-4 rounded-2xl bg-primary-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                            {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle2 className="w-4 h-4" /> REGISTRAR</>}
                         </button>
                      </form>
                   )}
                </div>
             ) : (
                <div className="py-12 text-center space-y-3">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8 text-slate-200" />
                   </div>
                   <p className="text-xs font-bold text-slate-400">Selecciona una cuenta para operar</p>
                </div>
             )}
          </div>

          {/* HISTORIAL RECIENTE */}
          <div className="rounded-3xl bg-neu-base shadow-neu p-8 space-y-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-body-md font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                   <History className="w-4 h-4" /> Recientes
                </h3>
             </div>
             
             <div className="space-y-4 max-h-[300px] overflow-auto pr-2 custom-scrollbar">
                {movimientos.map((m: any) => (
                   <div key={m.id} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl ${m.tipo === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {m.tipo === 'ingreso' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-800 max-w-[120px] truncate">{m.concepto}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{m.cuentas_bancarias.nombre}</p>
                         </div>
                      </div>
                      <p className={`text-[10px] font-black ${m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                         {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toLocaleString()}
                      </p>
                   </div>
                ))}
             </div>
          </div>
        </div>

      </div>

    </div>
  )
}
