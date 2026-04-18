'use client'

import { useState, useTransition } from 'react'
import { Save, Plus, UserCheck, Calculator, Briefcase, FileText } from 'lucide-react'
import { createEmpleado, calcularCostoEmpleado } from '../services/empleados-actions'
import type { AreaNegocio } from '../types'

const AREAS: { val: AreaNegocio; label: string }[] = [
  { val: 'Comercial', label: 'Comercial' },
  { val: 'Mercadeo', label: 'Mercadeo' },
  { val: 'Administrativo', label: 'Administrativo' },
  { val: 'Operaciones', label: 'Operaciones (CIF)' },
  { val: 'Desarrollo', label: 'Desarrollo de Producto' },
  { val: 'Logistica', label: 'Logística' },
  { val: 'Talento_Humano', label: 'Talento Humano' },
]

const NIVELES_ARL: { val: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { val: 1, label: 'Nivel I — Riesgo Mínimo (0.522%)' },
  { val: 2, label: 'Nivel II — Riesgo Bajo (1.044%)' },
  { val: 3, label: 'Nivel III — Riesgo Medio (2.436%)' },
  { val: 4, label: 'Nivel IV — Riesgo Alto (4.35%)' },
  { val: 5, label: 'Nivel V — Riesgo Máximo (6.96%)' },
]

export function EmpleadoForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [area, setArea] = useState<AreaNegocio>('Administrativo')
  const [salarioBase, setSalarioBase] = useState(0)
  const [nivelArl, setNivelArl] = useState<1|2|3|4|5>(1)
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0])
  const [tipoContrato, setTipoContrato] = useState<'nomina' | 'prestacion_servicios'>('nomina')
  const [preview, setPreview] = useState<{ costo_total_mes: number; total_carga: number; porcentaje_total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCalcular() {
    if (salarioBase <= 0) return
    const result = await calcularCostoEmpleado(salarioBase, nivelArl, tipoContrato)
    setPreview(result)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombre || !cargo || salarioBase <= 0) return setError('Completa todos los campos obligatorios')

    startTransition(async () => {
      const result = await createEmpleado({
        nombre, cargo, area,
        salario_base: salarioBase,
        nivel_riesgo_arl: nivelArl,
        fecha_ingreso: fechaIngreso,
        estado: 'activo',
        tipo_contrato: tipoContrato
      })
      if (result.error) setError(result.error)
      else onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        
        {/* Tipo de Contrato - Selector Neumórfico */}
        <div className="col-span-2 space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Contratación</label>
          <div className="flex gap-2">
            {[
              { id: 'nomina', label: 'Directo (Nómina)', icon: Briefcase },
              { id: 'prestacion_servicios', label: 'Prestación Servicios', icon: FileText }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTipoContrato(t.id as any);
                  setPreview(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                  tipoContrato === t.id 
                    ? 'bg-neu-base shadow-neu-inset border-primary-500 text-primary-900' 
                    : 'bg-neu-base shadow-neu border-transparent text-muted-foreground'
                }`}
              >
                <t.icon className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 col-span-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre completo</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              className="w-full bg-transparent text-body-sm outline-none" placeholder="Juan García" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cargo</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <input type="text" value={cargo} onChange={e => setCargo(e.target.value)}
              className="w-full bg-transparent text-body-sm outline-none" placeholder="Diseñador, Asesor..." required />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Área</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <select value={area} onChange={e => setArea(e.target.value as AreaNegocio)}
              className="w-full bg-transparent text-body-sm outline-none appearance-none">
              {AREAS.map(a => <option key={a.val} value={a.val}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {tipoContrato === 'nomina' ? 'Salario Base' : 'Honorarios Mensuales'}
          </label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 flex gap-2">
            <span className="text-muted-foreground">$</span>
            <input type="number" value={salarioBase || ''} onChange={e => setSalarioBase(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-body-sm outline-none" placeholder="2.000.000" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha de Inicio</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)}
              className="w-full bg-transparent text-body-sm outline-none" />
          </div>
        </div>

        {tipoContrato === 'nomina' && (
          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nivel de Riesgo ARL</label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select value={nivelArl} onChange={e => setNivelArl(parseInt(e.target.value) as 1|2|3|4|5)}
                className="w-full bg-transparent text-body-sm outline-none appearance-none">
                {NIVELES_ARL.map(n => <option key={n.val} value={n.val}>{n.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <button type="button" onClick={handleCalcular}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors">
        <Calculator className="w-4 h-4" /> Calcular Costo Real
      </button>

      {preview && (
        <div className="rounded-xl bg-primary-50 border border-primary-100 p-4 space-y-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Costo Base</span>
            <span className="font-bold">${salarioBase.toLocaleString('es-CO')}</span>
          </div>
          {preview.total_carga > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Carga Parafiscal ({preview.porcentaje_total.toFixed(1)}%)</span>
              <span className="font-bold text-amber-600">+${preview.total_carga.toLocaleString('es-CO')}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-primary-200 pt-2">
            <span className="font-black text-primary-700">Costo Mensual Empresa</span>
            <span className="font-black text-primary-700">${preview.costo_total_mes.toLocaleString('es-CO')}</span>
          </div>
          {tipoContrato === 'prestacion_servicios' && (
            <p className="text-[9px] text-primary-600 italic">Nota: Sin carga prestacional adicional para la empresa.</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      <button type="submit" disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neu-base shadow-neu text-primary-700 font-black text-body-sm transition-all active:shadow-neu-inset disabled:opacity-50">
        <UserCheck className="w-4 h-4" />
        {isPending ? 'Guardando...' : 'Registrar Colaborador'}
      </button>
    </form>
  )
}
