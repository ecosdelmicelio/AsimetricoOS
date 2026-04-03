'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Edit2, Tag } from 'lucide-react'
import { createMarca, updateMarca } from '@/features/configuracion/services/marcas-actions'
import type { MarcaConTercero } from '@/features/configuracion/services/marcas-actions'
import type { Tercero } from '@/features/terceros/types'

interface Props {
  marcas: MarcaConTercero[]
  terceros: Tercero[]
}

export function MarcasPanel({ marcas, terceros }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroTercero, setFiltroTercero] = useState<string>('todos')

  const visibles = filtroTercero === 'todos'
    ? marcas
    : marcas.filter(m => m.tercero_id === filtroTercero)

  // Terceros que tienen al menos una marca o todos para el filtro
  const tercerosConMarca = terceros.filter(t =>
    marcas.some(m => m.tercero_id === t.id)
  )

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-muted-foreground">
        Marcas comerciales asociadas a terceros (clientes o proveedores).
        Un tercero puede tener múltiples marcas.
      </p>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Filtro por tercero */}
        <select
          value={filtroTercero}
          onChange={e => setFiltroTercero(e.target.value)}
          className="rounded-xl bg-neu-base shadow-neu px-3 py-2 text-body-sm text-foreground outline-none"
        >
          <option value="todos">Todos los terceros</option>
          {tercerosConMarca.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>

        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva marca
          </button>
        )}
      </div>

      {/* Form creación */}
      {showForm && (
        <MarcaForm
          terceros={terceros}
          onDone={() => setShowForm(false)}
        />
      )}

      {/* Lista vacía */}
      {visibles.length === 0 && !showForm && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-10 flex flex-col items-center text-center gap-2">
          <Tag className="w-7 h-7 text-muted-foreground" />
          <p className="text-body-sm text-muted-foreground">Sin marcas registradas</p>
        </div>
      )}

      {/* Lista */}
      {visibles.length > 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-black/5">
            <span className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Marca</span>
            <span className="col-span-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tercero</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Estado</span>
            <span className="col-span-1" />
          </div>
          <div className="divide-y divide-black/5">
            {visibles.map(m =>
              editingId === m.id
                ? (
                  <div key={m.id} className="px-4 py-3">
                    <MarcaForm
                      marca={m}
                      terceros={terceros}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                )
                : (
                  <div key={m.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                    <div className="col-span-4 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                      <span className="text-body-sm font-semibold text-foreground">{m.nombre}</span>
                    </div>
                    <span className="col-span-5 text-body-sm text-muted-foreground">
                      {m.tercero_nombre ?? <span className="italic">Sin tercero</span>}
                    </span>
                    <div className="col-span-2 flex justify-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${m.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => { setEditingId(m.id); setShowForm(false) }}
                        className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Formulario ─── */
function MarcaForm({
  marca,
  terceros,
  onDone,
}: {
  marca?: MarcaConTercero
  terceros: Tercero[]
  onDone: () => void
}) {
  const isEdit = !!marca
  const [nombre, setNombre]         = useState(marca?.nombre ?? '')
  const [terceroId, setTerceroId]   = useState(marca?.tercero_id ?? '')
  const [activo, setActivo]         = useState(marca?.activo ?? true)
  const [error, setError]           = useState<string | null>(null)
  const [pending, startTransition]  = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setError(null)
    startTransition(async () => {
      const res = isEdit
        ? await updateMarca(marca.id, {
            nombre,
            tercero_id: terceroId || null,
            activo,
          })
        : await createMarca({
            nombre,
            tercero_id: terceroId || null,
          })
      if (res.error) { setError(res.error); return }
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {/* Nombre */}
      <div className="space-y-1 flex-1 min-w-40">
        <label className="text-xs font-medium text-foreground">Nombre de la marca *</label>
        <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            placeholder="Ej: Salomé, Asimétrico Lab"
            className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Tercero */}
      <div className="space-y-1 flex-1 min-w-48">
        <label className="text-xs font-medium text-foreground">Tercero asociado</label>
        <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
          <select
            value={terceroId}
            onChange={e => setTerceroId(e.target.value)}
            className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
          >
            <option value="">— Sin asociar —</option>
            {terceros.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Estado (solo edición) */}
      {isEdit && (
        <label className="flex items-center gap-2 cursor-pointer pb-2">
          <div
            onClick={() => setActivo(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors ${activo ? 'bg-primary-500' : 'bg-neu-base shadow-neu-inset'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-body-sm text-foreground">{activo ? 'Activa' : 'Inactiva'}</span>
        </label>
      )}

      {error && <p className="w-full text-xs text-red-600">{error}</p>}

      {/* Botones */}
      <div className="flex gap-2 pb-0.5">
        <button type="button" onClick={onDone}
          className="px-3 py-2 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={pending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60">
          {pending && <Loader2 className="w-3 h-3 animate-spin" />}
          {isEdit ? 'Guardar' : 'Crear marca'}
        </button>
      </div>
    </form>
  )
}
