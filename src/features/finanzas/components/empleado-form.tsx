'use client'

import { useState, useTransition } from 'react'
import { Save, Plus, UserCheck, Calculator } from 'lucide-react'
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
  { val: 1, label: 'Nivel I — Riesgo Mínimo (0.522%) — Oficina' },
  { val: 2, label: 'Nivel II — Riesgo Bajo (1.044%) — Conductor' },
  { val: 3, label: 'Nivel III — Riesgo Medio (2.436%) — Operarios' },
  { val: 4, label: 'Nivel IV — Riesgo Alto (4.35%) — Construcción' },
  { val: 5, label: 'Nivel V — Riesgo Máximo (6.96%) — Minería' },
]

export function EmpleadoForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [area, setArea] = useState<AreaNegocio>('Administrativo')
  const [salarioBase, setSalarioBase] = useState(0)
  const [nivelArl, setNivelArl] = useState<1|2|3|4|5>(1)
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0])
  const [preview, setPreview] = useState<{ costo_total_mes: number; total_carga: number; porcentaje_total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCalcular() {
    if (salarioBase <= 0) return
    const result = await calcularCostoEmpleado(salarioBase, nivelArl)
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
      })
      if (result.error) setError(result.error)
      else onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Salario Base</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 flex gap-2">
            <span className="text-muted-foreground">$</span>
            <input type="number" value={salarioBase || ''} onChange={e => setSalarioBase(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-body-sm outline-none" placeholder="2.000.000" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha de Ingreso</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)}
              className="w-full bg-transparent text-body-sm outline-none" />
          </div>
        </div>

        <div className="space-y-1.5 col-span-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nivel de Riesgo ARL</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <select value={nivelArl} onChange={e => setNivelArl(parseInt(e.target.value) as 1|2|3|4|5)}
              className="w-full bg-transparent text-body-sm outline-none appearance-none">
              {NIVELES_ARL.map(n => <option key={n.val} value={n.val}>{n.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Calculadora de costo real */}
      <button type="button" onClick={handleCalcular}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors">
        <Calculator className="w-4 h-4" /> Calcular Costo Total con Parafiscales
      </button>

      {preview && (
        <div className="rounded-xl bg-primary-50 border border-primary-100 p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Salario Base</span>
            <span className="font-bold">${salarioBase.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Carga Parafiscal ({preview.porcentaje_total.toFixed(1)}%)</span>
            <span className="font-bold text-amber-600">+${preview.total_carga.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-primary-200 pt-2">
            <span className="font-black text-primary-700">Costo Real / Mes</span>
            <span className="font-black text-primary-700">${preview.costo_total_mes.toLocaleString('es-CO')}</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      <button type="submit" disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neu-base shadow-neu text-primary-700 font-black text-body-sm transition-all active:shadow-neu-inset disabled:opacity-50">
        <UserCheck className="w-4 h-4" />
        {isPending ? 'Guardando...' : 'Registrar Empleado'}
      </button>
    </form>
  )
}
