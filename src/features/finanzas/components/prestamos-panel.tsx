'use client'

import { useState, useTransition } from 'react'
import { Save, TrendingDown } from 'lucide-react'
import { createPrestamo } from '../services/prestamos-actions'
import { calcularCuotaFrances, generarTablaAmortizacion } from '../utils/finanzas-utils'
import type { Prestamo } from '../services/prestamos-actions'

interface Props {
  prestamos: Prestamo[]
  onSuccess?: () => void
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

export function PrestamosPanel({ prestamos, onSuccess }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Prestamo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [descripcion, setDescripcion] = useState('')
  const [entidad, setEntidad] = useState('')
  const [monto, setMonto] = useState(0)
  const [saldo, setSaldo] = useState(0)
  const [tasa, setTasa] = useState(0)
  const [plazo, setPlazo] = useState(12)
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])

  const cuotaPreview = monto > 0 && tasa > 0 && plazo > 0
    ? calcularCuotaFrances(saldo || monto, tasa, plazo)
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createPrestamo({
        descripcion, entidad,
        monto_inicial: monto,
        saldo_actual: saldo || monto,
        tasa_interes_mes: tasa,
        plazo_meses: plazo,
        fecha_inicio: fechaInicio
      })
      if (result.error) setError(result.error)
      else { setShowForm(false); onSuccess?.() }
    })
  }

  const tabla = selected
    ? generarTablaAmortizacion(selected.saldo_actual, selected.tasa_interes_mes, selected.plazo_meses, selected.fecha_inicio)
    : []

  const totalDeuda = prestamos.filter(p => p.estado === 'activo').reduce((s, p) => s + Number(p.saldo_actual), 0)
  const cuotasTotal = prestamos.filter(p => p.estado === 'activo').reduce((s, p) => s + Number(p.cuota_mensual), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-title-sm font-bold text-foreground">Gestión de Préstamos</h2>
          <p className="text-body-sm text-muted-foreground">Deuda vigente y tabla de amortización automática.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-black text-body-sm active:shadow-neu-inset">
          <TrendingDown className="w-4 h-4" /> Nuevo Préstamo
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-neu-base shadow-neu p-5 border-l-4 border-red-500">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deuda Total Vigente</p>
          <p className="text-title-md font-bold text-red-600">{fmt(totalDeuda)}</p>
        </div>
        <div className="rounded-2xl bg-neu-base shadow-neu p-5 border-l-4 border-amber-500">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cuota Mensual Total</p>
          <p className="text-title-md font-bold text-amber-600">{fmt(cuotasTotal)}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
          <h3 className="font-bold text-foreground">Registrar Préstamo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descripción</label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
                <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  className="w-full bg-transparent text-body-sm outline-none" placeholder="Crédito capital de trabajo" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entidad</label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
                <input type="text" value={entidad} onChange={e => setEntidad(e.target.value)}
                  className="w-full bg-transparent text-body-sm outline-none" placeholder="Bancolombia, Davivienda..." required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monto Inicial</label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 flex gap-2">
                <span className="text-muted-foreground">$</span>
                <input type="number" value={monto || ''} onChange={e => { const v = parseFloat(e.target.value)||0; setMonto(v); setSaldo(v) }}
                  className="w-full bg-transparent text-body-sm outline-none" placeholder="50.000.000" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo Actual (si ya tiene pagos)</label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 flex gap-2">
                <span className="text-muted-foreground">$</span>
                <input type="number" value={saldo || ''} onChange={e => setSaldo(parseFloat(e.target.value)||0)}
                  className="w-full bg-transparent text-body-sm outline-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tasa de Interés Mensual (%)</label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
                <input type="number" step="0.01" value={tasa || ''} onChange={e => setTasa(parseFloat(e.target.value)||0)}
                  className="w-full bg-transparent text-body-sm outline-none" placeholder="1.5" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plazo Restante (meses)</label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
                <input type="number" value={plazo} onChange={e => setPlazo(parseInt(e.target.value)||12)}
                  className="w-full bg-transparent text-body-sm outline-none" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha de la Primera Cuota Restante</label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                  className="w-full bg-transparent text-body-sm outline-none" />
              </div>
            </div>
          </div>

          {cuotaPreview > 0 && (
            <div className="rounded-xl bg-primary-50 border border-primary-100 px-4 py-3 flex justify-between">
              <span className="text-xs font-bold text-primary-700">Cuota Mensual Calculada (Sistema Francés)</span>
              <span className="text-sm font-black text-primary-700">{fmt(cuotaPreview)}</span>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-black text-sm active:shadow-neu-inset disabled:opacity-50">
              <Save className="w-4 h-4" /> {isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de préstamos */}
      <div className="space-y-3">
        {prestamos.map(p => (
          <div key={p.id}
            className={`rounded-2xl bg-neu-base shadow-neu p-5 cursor-pointer hover:scale-[1.01] transition-transform border-l-4 ${p.estado === 'activo' ? 'border-red-400' : 'border-slate-200 opacity-60'}`}
            onClick={() => setSelected(selected?.id === p.id ? null : p)}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-foreground">{p.descripcion}</p>
                <p className="text-xs text-muted-foreground">{p.entidad} · {p.tasa_interes_mes}% mensual · {p.plazo_meses} meses</p>
              </div>
              <div className="text-right">
                <p className="font-black text-red-600">{fmt(p.saldo_actual)}</p>
                <p className="text-[10px] text-muted-foreground">Cuota: {fmt(p.cuota_mensual)}/mes</p>
              </div>
            </div>

            {/* Tabla de amortización expandida */}
            {selected?.id === p.id && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 text-left">Mes</th>
                      <th className="py-2 text-right">Cuota</th>
                      <th className="py-2 text-right">Capital</th>
                      <th className="py-2 text-right">Interés</th>
                      <th className="py-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tabla.slice(0, 12).map(c => (
                      <tr key={c.mes} className="hover:bg-slate-50">
                        <td className="py-1.5">{c.fecha}</td>
                        <td className="py-1.5 text-right font-bold">{fmt(c.cuota)}</td>
                        <td className="py-1.5 text-right text-emerald-600">{fmt(c.capital)}</td>
                        <td className="py-1.5 text-right text-red-500">{fmt(c.interes)}</td>
                        <td className="py-1.5 text-right">{fmt(c.saldo_final)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tabla.length > 12 && (
                  <p className="text-center text-[10px] text-muted-foreground mt-2">... y {tabla.length - 12} meses más</p>
                )}
              </div>
            )}
          </div>
        ))}

        {prestamos.length === 0 && (
          <div className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 p-10 text-center">
            <p className="text-muted-foreground text-sm">No hay préstamos registrados.</p>
          </div>
        )}
      </div>
    </div>
  )
}
