'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Save, X, Search } from 'lucide-react'
import { createGasto } from '../services/gastos-actions'
import type { AreaNegocio, TipoGasto, CategoriaGasto } from '../types'

interface Tercero {
  id: string
  nombre: string
}

interface Props {
  categorias: CategoriaGasto[]
  terceros: Tercero[]
  onSuccess?: () => void
  onCancel?: () => void
}

const AREAS: { val: AreaNegocio; label: string }[] = [
  { val: 'Comercial', label: 'Comercial' },
  { val: 'Mercadeo', label: 'Mercadeo' },
  { val: 'Administrativo', label: 'Administrativo' },
  { val: 'Operaciones', label: 'Operaciones' },
  { val: 'Desarrollo', label: 'Desarrollo de Producto' },
  { val: 'Logistica', label: 'Logística' },
  { val: 'Talento_Humano', label: 'Talento Humano' },
]

export function GastoForm({ categorias, terceros, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [descripcion, setDescripcion] = useState('')
  const [costoUnitario, setCostoUnitario] = useState<number>(0)
  const [cantidad, setCantidad] = useState<number>(1)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [area, setArea] = useState<AreaNegocio>('Administrativo')
  const [tipo, setTipo] = useState<TipoGasto>('fijo')
  const [categoriaId, setCategoriaId] = useState('')
  const [terceroId, setTerceroId] = useState('')
  const [metodoPago, setMetodoPago] = useState<'transferencia' | 'efectivo' | 'cheque' | 'otro'>('transferencia')
  const [error, setError] = useState<string | null>(null)

  const total = useMemo(() => costoUnitario * cantidad, [costoUnitario, cantidad])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!descripcion) return setError('Ingresa una descripción')
    if (total <= 0) return setError('El monto debe ser mayor a 0')

    startTransition(async () => {
      const result = await createGasto({
        descripcion,
        costo_unitario: costoUnitario,
        cantidad,
        fecha,
        area,
        tipo,
        categoria_id: categoriaId || undefined,
        tercero_id: terceroId || undefined,
        metodo_pago: metodoPago
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess?.()
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Descripción */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Descripción del Gasto</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Licencias de Software, Arriendo Bodega, etc."
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
              required
            />
          </div>
        </div>

        {/* Área */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Área / Centro de Costos</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <select
              value={area}
              onChange={e => setArea(e.target.value as AreaNegocio)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              {AREAS.map(a => (
                <option key={a.val} value={a.val}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tipo de Gasto */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Tipo de Gasto</label>
          <div className="flex gap-2">
            {(['fijo', 'variable', 'semivariable'] as TipoGasto[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${
                  tipo === t 
                    ? 'bg-primary-600 text-white shadow-lg' 
                    : 'bg-neu-base shadow-neu text-muted-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Calculadora (Costo Unitario x Cantidad) */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">
            {tipo === 'semivariable' ? 'Costo por Persona/Unidad' : 'Monto Unitario'}
          </label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <input
              type="number"
              value={costoUnitario || ''}
              onChange={e => setCostoUnitario(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">
            {tipo === 'semivariable' ? 'Cantidad (Personas/Servicios)' : 'Cantidad'}
          </label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <input
              type="number"
              value={cantidad}
              onChange={e => setCantidad(parseInt(e.target.value) || 0)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
              min="1"
              required
            />
          </div>
        </div>

        {/* Categoría */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Categoría</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <select
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Seleccionar categoría...</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fecha */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Fecha del Gasto</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
              required
            />
          </div>
        </div>

        {/* Proveedor / Tercero */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-body-sm font-medium text-foreground flex items-center gap-2">
            <Search className="w-3 h-3" /> Proveedor (Opcional)
          </label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <select
              value={terceroId}
              onChange={e => setTerceroId(e.target.value)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Ninguno / Pago directo</option>
              {terceros.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Método de Pago */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-body-sm font-medium text-foreground">Método de Pago Efectuado</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['transferencia', 'efectivo', 'cheque', 'otro'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMetodoPago(m as any)}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize whitespace-nowrap ${
                  metodoPago === m 
                    ? 'bg-slate-800 text-white shadow-lg' 
                    : 'bg-neu-base shadow-neu text-muted-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer con Total y Acciones */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Calculado</p>
            <p className="text-xl font-bold text-foreground">${total.toLocaleString('es-CO')}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-body-sm font-bold text-muted-foreground hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-black text-body-sm transition-all active:shadow-neu-inset disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Guardando...' : 'Registrar Gasto'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 font-medium text-center">{error}</p>
      )}
    </form>
  )
}
