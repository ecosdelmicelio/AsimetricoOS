'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, AlertTriangle, Calendar } from 'lucide-react'
import { createRecepcionOC } from '@/features/compras/services/compras-actions'
import { formatDate } from '@/shared/lib/utils'
import type { OrdenCompraConDetalle } from '@/features/compras/types'

interface Recepcion {
  id: string
  material_id: string
  cantidad_recibida: number
  cantidad_esperada: number | null
  notas: string | null
  fecha_recepcion: string
  materiales: { codigo: string; nombre: string; unidad: string } | null
  profiles: { full_name: string } | null
}

interface Props {
  oc: OrdenCompraConDetalle
  recepciones: Recepcion[]
}

export function RecepcionOC({ oc, recepciones }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    material_id: oc.rollos?.[0]?.material_id ?? '',
    cantidad_recibida: '',
    cantidad_esperada: '',
    notas: '',
  })

  const materialesDisponibles = oc.rollos ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const cantidadNum = parseFloat(formData.cantidad_recibida)
    if (!formData.material_id || isNaN(cantidadNum) || cantidadNum <= 0) {
      setError('Completa todos los campos requeridos')
      return
    }

    setError(null)
    startTransition(async () => {
      const res = await createRecepcionOC({
        oc_id: oc.id,
        material_id: formData.material_id,
        cantidad_recibida: cantidadNum,
        cantidad_esperada: formData.cantidad_esperada ? parseFloat(formData.cantidad_esperada) : undefined,
        notas: formData.notas,
      })

      if (res.error) {
        setError(res.error)
        return
      }

      setFormData({
        material_id: materialesDisponibles[0]?.material_id ?? '',
        cantidad_recibida: '',
        cantidad_esperada: '',
        notas: '',
      })
      setShowForm(false)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-body-md">Recepciones</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva recepción
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Registrar recepción</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Material */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Material *</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <select
                  value={formData.material_id}
                  onChange={e => setFormData({ ...formData, material_id: e.target.value })}
                  required
                  className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                >
                  <option value="">Selecciona un material</option>
                  {materialesDisponibles.map(r => (
                    <option key={r.material_id} value={r.material_id}>
                      {r.materiales?.codigo} - {r.materiales?.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Unidad de medida (display) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Unidad</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2 flex items-center">
                <span className="text-body-sm text-muted-foreground">
                  {formData.material_id
                    ? materialesDisponibles.find(r => r.material_id === formData.material_id)?.materiales?.unidad || '—'
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cantidad Recibida */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Cantidad Recibida *</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.cantidad_recibida}
                  onChange={e => setFormData({ ...formData, cantidad_recibida: e.target.value })}
                  required
                  placeholder="50.5"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Cantidad Esperada */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Cantidad Esperada</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.cantidad_esperada}
                  onChange={e => setFormData({ ...formData, cantidad_esperada: e.target.value })}
                  placeholder="50.0"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Notas</label>
            <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
              <textarea
                value={formData.notas}
                onChange={e => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observaciones sobre la recepción..."
                rows={2}
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null) }}
              className="px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
            >
              {pending && <Loader2 className="w-3 h-3 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      )}

      {/* Historial de recepciones */}
      {recepciones.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
          <p className="text-body-sm text-muted-foreground">Sin recepciones registradas</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-black/5">
            <span className="col-span-3 text-xs font-semibold text-muted-foreground uppercase">Material</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-right">Cantidad</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-right">Esperada</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Fecha</span>
            <span className="col-span-3 text-xs font-semibold text-muted-foreground uppercase">Registrado por</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-black/5">
            {recepciones.map(r => (
              <div key={r.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                <div className="col-span-3">
                  <p className="text-body-sm font-medium text-foreground">{r.materiales?.nombre}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.materiales?.codigo}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-body-sm font-medium text-foreground">{r.cantidad_recibida} {r.materiales?.unidad}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-body-sm text-muted-foreground">
                    {r.cantidad_esperada ? `${r.cantidad_esperada} ${r.materiales?.unidad}` : '—'}
                  </p>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{formatDate(r.fecha_recepcion)}</span>
                </div>
                <div className="col-span-3">
                  <p className="text-xs text-muted-foreground">{r.profiles?.full_name ?? 'Sistema'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
