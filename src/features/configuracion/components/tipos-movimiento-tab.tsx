'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, AlertTriangle } from 'lucide-react'
import { createTipoMovimiento, toggleTipoMovimiento } from '@/features/configuracion/services/tipos-movimiento-actions'
import type { TipoMovimiento } from '@/features/configuracion/services/tipos-movimiento-actions'

const CATEGORIAS = [
  { value: 'entrada' as const, label: 'Entrada', color: 'bg-green-100 text-green-700' },
  { value: 'salida' as const, label: 'Salida', color: 'bg-red-100 text-red-700' },
  { value: 'ajuste' as const, label: 'Ajuste', color: 'bg-amber-100 text-amber-700' },
]

interface Props {
  tiposMovimiento: TipoMovimiento[]
}

export function TiposMovimientoTab({ tiposMovimiento }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ codigo: '', nombre: '', categoria: 'entrada' as const, descripcion: '' })

  const handleSubmit = () => {
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      setError('Código y nombre son obligatorios')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await createTipoMovimiento({
        codigo: formData.codigo,
        nombre: formData.nombre,
        categoria: formData.categoria,
        descripcion: formData.descripcion,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setFormData({ codigo: '', nombre: '', categoria: 'entrada', descripcion: '' })
      setShowForm(false)
    })
  }

  const handleToggle = (id: string, activo: boolean) => {
    startTransition(async () => {
      await toggleTipoMovimiento(id, !activo)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-body-md">Tipos de Movimiento</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo tipo
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Crear tipo de movimiento</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Código *</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="ENTRADA_MANUAL"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Categoría *</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <select
                  value={formData.categoria}
                  onChange={e => setFormData({ ...formData, categoria: e.target.value as any })}
                  className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Nombre *</label>
            <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Entrada Manual de Inventario"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Descripción</label>
            <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
              <textarea
                value={formData.descripcion}
                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción opcional..."
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
              onClick={handleSubmit}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
            >
              {pending && <Loader2 className="w-3 h-3 animate-spin" />}
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {tiposMovimiento.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
          <p className="text-body-sm text-muted-foreground">Sin tipos de movimiento configurados</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-black/5">
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Código</span>
            <span className="col-span-4 text-xs font-semibold text-muted-foreground uppercase">Nombre</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Categoría</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-right">Estado</span>
            <span className="col-span-2" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-black/5">
            {tiposMovimiento.map(tipo => {
              const categoria = CATEGORIAS.find(c => c.value === tipo.categoria)
              return (
                <div key={tipo.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                  <span className="col-span-2 font-mono text-body-sm font-semibold text-primary-700">{tipo.codigo}</span>
                  <div className="col-span-4">
                    <p className="text-body-sm font-medium text-foreground">{tipo.nombre}</p>
                    {tipo.descripcion && <p className="text-xs text-muted-foreground truncate">{tipo.descripcion}</p>}
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${categoria?.color}`}>
                      {categoria?.label}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => handleToggle(tipo.id, tipo.activo)}
                        className={`relative w-8 h-4 rounded-full transition-colors ${tipo.activo ? 'bg-primary-500' : 'bg-neu-base shadow-neu-inset'}`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${tipo.activo ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                  </div>
                  <div className="col-span-2" />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
