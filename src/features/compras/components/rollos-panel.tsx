'use client'

import { useState, useTransition } from 'react'
import { Loader2, Trash2, Plus, Package } from 'lucide-react'
import { addRollo, deleteRollo } from '@/features/compras/services/compras-actions'
import type { Rollo } from '@/features/compras/types'

interface Material {
  id: string
  codigo: string
  nombre: string
  unidad: string
}

interface RolloConMaterial extends Rollo {
  materiales: { codigo: string; nombre: string; unidad: string } | null
}

interface Props {
  ocId: string
  rollos: RolloConMaterial[]
  materiales: Material[]
}

export function RollosPanel({ ocId, rollos, materiales }: Props) {
  const [pending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const material_id = fd.get('material_id') as string
    const peso = parseFloat(fd.get('peso_real_kg') as string)
    const rend = fd.get('rendimiento_real') as string

    if (!material_id || isNaN(peso) || peso <= 0) {
      setError('Selecciona material e ingresa un peso válido')
      return
    }

    setError(null)
    startTransition(async () => {
      const res = await addRollo({
        oc_id: ocId,
        material_id,
        peso_real_kg: peso,
        rendimiento_real: rend ? parseFloat(rend) : undefined,
      })
      if (res.error) { setError(res.error); return }
      setShowForm(false)
      ;(e.target as HTMLFormElement).reset()
    })
  }

  function handleDelete(rolloId: string) {
    setDeletingId(rolloId)
    startTransition(async () => {
      const res = await deleteRollo(rolloId, ocId)
      if (res.error) setError(res.error)
      setDeletingId(null)
    })
  }

  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-body-md">
          Rollos recibidos <span className="text-muted-foreground font-normal">({rollos.length})</span>
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-xs transition-all active:shadow-neu-inset hover:shadow-neu-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar rollo
        </button>
      </div>

      {/* Form inline */}
      {showForm && (
        <form onSubmit={handleAdd} className="rounded-xl bg-neu-base shadow-neu-inset p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuevo rollo</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-medium text-foreground">Material *</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-2">
                <select name="material_id" required
                  className="w-full bg-transparent text-xs text-foreground outline-none appearance-none">
                  <option value="">Seleccionar...</option>
                  {materiales.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.codigo} — {m.nombre} ({m.unidad})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Peso real (kg) *</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-2">
                <input name="peso_real_kg" type="number" step="0.001" min="0.001" required placeholder="0.000"
                  className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Rendimiento (m/kg)</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-2">
                <input name="rendimiento_real" type="number" step="0.001" min="0" placeholder="Opcional"
                  className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setError(null) }}
              className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-xs transition-all active:shadow-neu-inset disabled:opacity-60">
              {pending && <Loader2 className="w-3 h-3 animate-spin" />}
              Guardar rollo
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {rollos.length === 0 && !showForm && (
        <div className="rounded-xl bg-neu-base shadow-neu-inset p-8 flex flex-col items-center text-center">
          <Package className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-body-sm text-muted-foreground">Sin rollos registrados</p>
          <p className="text-xs text-muted-foreground mt-0.5">Agrega los rollos recibidos con el botón de arriba</p>
        </div>
      )}

      {rollos.length > 0 && (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="col-span-4">Material</span>
            <span className="col-span-2 text-right">Peso (kg)</span>
            <span className="col-span-2 text-right">Rend. (m/kg)</span>
            <span className="col-span-2 text-right">Saldo (kg)</span>
            <span className="col-span-2" />
          </div>

          {rollos.map(r => (
            <div key={r.id}
              className="grid grid-cols-12 gap-2 items-center rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <div className="col-span-4">
                <p className="text-body-sm font-medium text-foreground">
                  {r.materiales?.codigo ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">{r.materiales?.nombre ?? '—'}</p>
              </div>
              <span className="col-span-2 text-body-sm text-foreground text-right">
                {r.peso_real_kg.toFixed(3)}
              </span>
              <span className="col-span-2 text-body-sm text-muted-foreground text-right">
                {r.rendimiento_real?.toFixed(3) ?? '—'}
              </span>
              <span className={`col-span-2 text-body-sm text-right font-medium ${
                r.saldo_kg < r.peso_real_kg * 0.1 ? 'text-red-600' : 'text-green-700'
              }`}>
                {r.saldo_kg.toFixed(3)}
              </span>
              <div className="col-span-2 flex justify-end">
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={pending && deletingId === r.id}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                  title="Eliminar rollo"
                >
                  {pending && deletingId === r.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="grid grid-cols-12 gap-2 px-3 pt-2 border-t border-neu-base">
            <span className="col-span-4 text-xs font-semibold text-muted-foreground">Total</span>
            <span className="col-span-2 text-xs font-bold text-foreground text-right">
              {rollos.reduce((s, r) => s + r.peso_real_kg, 0).toFixed(3)}
            </span>
            <span className="col-span-2" />
            <span className="col-span-2 text-xs font-bold text-foreground text-right">
              {rollos.reduce((s, r) => s + r.saldo_kg, 0).toFixed(3)}
            </span>
            <span className="col-span-2" />
          </div>
        </div>
      )}
    </div>
  )
}
