'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Plus, Pencil, Trash2, Save, X, Loader2 } from 'lucide-react'
import { createTipoDefecto, updateTipoDefecto, deleteTipoDefecto } from '@/features/calidad/services/tipos-defecto-actions'
import type { TipoDefecto, GravedadDefecto } from '@/features/calidad/types'

interface Props {
  tiposDefecto: TipoDefecto[]
  // Podríamos pasar los tipos de producto aquí, pero por ahora permitimos texto libre o una lista básica
  tiposProductoDisponibles?: string[]
}

const GRAVEDADES: { value: GravedadDefecto; label: string }[] = [
  { value: 'menor', label: 'Menor' },
  { value: 'mayor', label: 'Mayor' },
  { value: 'critico', label: 'Crítico' },
]

export function DefectosConfig({ tiposDefecto }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  function handleAdd() {
    setIsAdding(true)
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-muted-foreground max-w-2xl">
          Configura qué defectos se inspeccionan para cada tipo de prenda. Estos catálogos aparecerán en las pantallas de calidad (DuPro y Recepción).
        </p>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          Añadir Defecto
        </button>
      </div>

      <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-black/5">
          <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Código</span>
          <span className="col-span-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</span>
          <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gravedad</span>
          <span className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipos de Prenda Aplicables</span>
          <span className="col-span-1"></span>
        </div>
        
        <div className="divide-y divide-black/5">
          {isAdding && (
            <DefectoRow 
              item={{ id: 'new', codigo: '', nombre: '', categoria: '', descripcion: '', gravedad_sugerida: 'menor', puntos_penalidad: 1, activo: true, tipos_producto_aplicables: [] }} 
              isEditing={true} 
              onCancel={() => setIsAdding(false)}
            />
          )}

          {tiposDefecto.map(td => (
            <DefectoRow 
              key={td.id} 
              item={td} 
              isEditing={editingId === td.id} 
              onEdit={() => { setEditingId(td.id); setIsAdding(false); }}
              onCancel={() => setEditingId(null)}
            />
          ))}

          {tiposDefecto.length === 0 && !isAdding && (
            <div className="p-8 text-center flex flex-col items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-muted-foreground" />
              <p className="text-body-sm text-muted-foreground">Sin tipos de defecto configurados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DefectoRow({ 
  item, 
  isEditing, 
  onEdit, 
  onCancel 
}: { 
  item: TipoDefecto | any
  isEditing: boolean
  onEdit?: () => void
  onCancel: () => void 
}) {
  const [pending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    codigo: item.codigo,
    nombre: item.nombre || item.descripcion, // fallback por si usan nombre o descripcion
    gravedad_sugerida: item.gravedad_sugerida as GravedadDefecto,
    tiposText: (item.tipos_producto_aplicables || []).join(', '),
  })

  function handleSave() {
    startTransition(async () => {
      const payload = {
        codigo: formData.codigo,
        descripcion: formData.nombre,
        nombre: formData.nombre,
        categoria: 'general', // Simplified for now
        gravedad_sugerida: formData.gravedad_sugerida,
        puntos_penalidad: formData.gravedad_sugerida === 'critico' ? 5 : formData.gravedad_sugerida === 'mayor' ? 3 : 1,
        activo: true,
        tipos_producto_aplicables: formData.tiposText.split(',').map(t => t.trim()).filter(Boolean)
      }

      if (item.id === 'new') {
        await createTipoDefecto(payload)
      } else {
        await updateTipoDefecto(item.id, payload)
      }
      onCancel()
    })
  }

  function handleDelete() {
    if (!confirm('¿Seguro que deseas eliminar este defecto?')) return
    startTransition(async () => {
      await deleteTipoDefecto(item.id)
    })
  }

  if (isEditing) {
    return (
      <div className="grid grid-cols-12 gap-3 items-center px-5 py-3 bg-primary-50/50">
        <div className="col-span-2">
          <input 
            className="w-full rounded-lg bg-white border border-black/10 px-2 py-1.5 text-body-sm font-mono focus:outline-primary-500"
            placeholder="DEF-001"
            value={formData.codigo}
            onChange={e => setFormData({...formData, codigo: e.target.value})}
          />
        </div>
        <div className="col-span-3">
          <input 
            className="w-full rounded-lg bg-white border border-black/10 px-2 py-1.5 text-body-sm focus:outline-primary-500"
            placeholder="Costura suelta"
            value={formData.nombre}
            onChange={e => setFormData({...formData, nombre: e.target.value})}
          />
        </div>
        <div className="col-span-2">
          <select 
            className="w-full rounded-lg bg-white border border-black/10 px-2 py-1.5 text-body-sm focus:outline-primary-500"
            value={formData.gravedad_sugerida}
            onChange={e => setFormData({...formData, gravedad_sugerida: e.target.value as GravedadDefecto})}
          >
            {GRAVEDADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div className="col-span-4">
          <input 
            className="w-full rounded-lg bg-white border border-black/10 px-2 py-1.5 text-body-sm focus:outline-primary-500"
            placeholder="Fajas, Ropa Interior, Camisetas (separados por coma)"
            value={formData.tiposText}
            onChange={e => setFormData({...formData, tiposText: e.target.value})}
          />
        </div>
        <div className="col-span-1 flex items-center justify-end gap-1">
          <button onClick={handleSave} disabled={pending} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
          <button onClick={onCancel} disabled={pending} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-3 items-center px-5 py-3 hover:bg-slate-50 transition-colors group">
      <span className="col-span-2 font-mono text-body-sm font-bold text-primary-700">{item.codigo}</span>
      <span className="col-span-3 text-body-sm text-foreground font-medium">{item.nombre || item.descripcion}</span>
      <div className="col-span-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
          item.gravedad_sugerida === 'critico' ? 'bg-red-100 text-red-700' :
          item.gravedad_sugerida === 'mayor' ? 'bg-orange-100 text-orange-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          {item.gravedad_sugerida}
        </span>
      </div>
      <div className="col-span-4 flex flex-wrap gap-1">
        {(item.tipos_producto_aplicables || []).length > 0 ? (
          (item.tipos_producto_aplicables || []).map((t: string) => (
            <span key={t} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 uppercase">
              {t}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground italic">Todas</span>
        )}
      </div>
      <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 text-slate-400 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={handleDelete} disabled={pending} className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
