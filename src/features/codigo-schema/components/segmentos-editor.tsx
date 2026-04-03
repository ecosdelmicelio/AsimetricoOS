'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Hash, List, Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react'
import { addSegmento, updateSegmento, deleteSegmento, swapSegmentosOrden } from '@/features/codigo-schema/services/schema-actions'
import { ValoresEditor } from './valores-editor'
import type { CodigoSchema, CodigoSegmento, TipoSegmento } from '@/features/codigo-schema/types'

interface Props {
  schema: CodigoSchema
  onUpdate: (updated: CodigoSchema) => void
}

const TIPO_ICONS: Record<TipoSegmento, React.ElementType> = {
  selector: List,
  auto_ref:  Hash,
}

const TIPO_LABEL: Record<TipoSegmento, string> = {
  selector: 'Selector (valores predefinidos)',
  auto_ref:  'Auto-referencia (número secuencial)',
}

/* ─── Formulario reutilizable (crear y editar) ─── */
function SegmentoForm({
  schemaId,
  existingClaves,
  inicial,
  onSave,
  onCancel,
}: {
  schemaId: string
  existingClaves: string[]       // claves ya usadas (excluye la del segmento editado)
  inicial?: CodigoSegmento       // si viene → modo edición
  onSave: (seg: CodigoSegmento) => void
  onCancel: () => void
}) {
  const isEdit = !!inicial
  const [clave, setClave]       = useState(inicial?.clave ?? '')
  const [etiqueta, setEtiqueta] = useState(inicial?.etiqueta ?? '')
  const [longitud, setLongitud] = useState<number | ''>(inicial?.longitud ?? '')
  const [tipo, setTipo]         = useState<TipoSegmento>(inicial?.tipo ?? 'selector')
  const [error, setError]       = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function validate(): string | null {
    if (!clave.trim() || !etiqueta.trim() || !longitud) return 'Todos los campos son requeridos'
    if (typeof longitud !== 'number' || longitud < 1 || longitud > 20) return 'Longitud debe ser entre 1 y 20'
    const claveUp = clave.toUpperCase().trim()
    if (existingClaves.includes(claveUp)) return 'Ya existe un segmento con esa clave'
    return null
  }

  function handleSave() {
    const err = validate()
    if (err) { setError(err); return }
    const claveUp = clave.toUpperCase().trim()
    setError(null)

    startTransition(async () => {
      if (isEdit) {
        const res = await updateSegmento(inicial.id, {
          clave: claveUp, etiqueta: etiqueta.trim(), longitud: longitud as number, tipo,
        })
        if (res.error) { setError(res.error); return }
        onSave({ ...inicial, clave: claveUp, etiqueta: etiqueta.trim(), longitud: longitud as number, tipo })
      } else {
        const res = await addSegmento(schemaId, {
          clave: claveUp, etiqueta: etiqueta.trim(), longitud: longitud as number, tipo,
        })
        if (res.error) { setError(res.error); return }
        onSave({
          id: res.data!.id,
          schema_id: schemaId,
          orden: res.data!.orden,
          clave: claveUp,
          etiqueta: etiqueta.trim(),
          longitud: longitud as number,
          tipo,
          ultimo_ref: 0,
          valores: [],
        })
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Clave *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              value={clave}
              onChange={e => setClave(e.target.value.toUpperCase())}
              placeholder="CLI"
              maxLength={10}
              className="w-full bg-transparent text-body-sm font-mono text-foreground outline-none uppercase"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Etiqueta *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              value={etiqueta}
              onChange={e => setEtiqueta(e.target.value)}
              placeholder="Cliente"
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Caracteres *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <input
              type="number"
              min={1}
              max={20}
              value={longitud}
              onChange={e => setLongitud(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="3"
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Tipo *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TipoSegmento)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="selector">Selector</option>
              <option value="auto_ref">Auto-ref</option>
            </select>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
        >
          {pending
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : isEdit ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />
          }
          {isEdit ? 'Guardar' : 'Agregar segmento'}
        </button>
      </div>
    </div>
  )
}

/* ─── Editor principal ─── */
export function SegmentosEditor({ schema, onUpdate }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [reorderPending, startReorderTransition] = useTransition()

  function handleSegmentoSaved(seg: CodigoSegmento, mode: 'add' | 'edit') {
    if (mode === 'add') {
      // orden is already set correctly from server response
      onUpdate({ ...schema, segmentos: [...schema.segmentos, seg] })
      setShowAddForm(false)
    } else {
      onUpdate({
        ...schema,
        segmentos: schema.segmentos.map(s => s.id === seg.id ? seg : s),
      })
      setEditingId(null)
    }
  }

  function handleDelete(seg: CodigoSegmento) {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const res = await deleteSegmento(seg.id)
      if (res.error) { setDeleteError(res.error); return }
      onUpdate({
        ...schema,
        segmentos: schema.segmentos.filter(s => s.id !== seg.id),
      })
      setDeletingId(null)
    })
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    const segs = schema.segmentos
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= segs.length) return

    const segA = segs[index]
    const segB = segs[targetIndex]

    // Optimistic update
    const newSegs = [...segs]
    newSegs[index] = { ...segB, orden: segA.orden }
    newSegs[targetIndex] = { ...segA, orden: segB.orden }
    onUpdate({ ...schema, segmentos: newSegs })

    startReorderTransition(async () => {
      await swapSegmentosOrden(segA.id, segB.id)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-body-md">Segmentos del código</h3>
        {!schema.bloqueado && !showAddForm && !editingId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all hover:shadow-neu-lg active:shadow-neu-inset"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar segmento
          </button>
        )}
      </div>

      {/* Lista vacía */}
      {schema.segmentos.length === 0 && !showAddForm && (
        <div className="rounded-xl bg-neu-base shadow-neu-inset px-4 py-6 text-center">
          <p className="text-body-sm text-muted-foreground">Sin segmentos. Agrega el primero para comenzar.</p>
        </div>
      )}

      {/* Segmentos */}
      <div className="space-y-3">
        {schema.segmentos.map((seg, i) => {
          const Icon = TIPO_ICONS[seg.tipo]
          const isEditing   = editingId === seg.id
          const isConfirming = deletingId === seg.id
          // Claves existentes excepto la del segmento que se está editando
          const otherClaves = schema.segmentos.filter(s => s.id !== seg.id).map(s => s.clave)

          return (
            <div key={seg.id} className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-black/5">
                <span className="w-6 h-6 rounded-lg bg-neu-base shadow-neu-inset flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </span>

                {!isEditing ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-foreground text-body-sm">{seg.clave}</span>
                      <span className="text-muted-foreground text-body-sm">{seg.etiqueta}</span>
                      <span className="text-xs bg-neu-base shadow-neu-inset rounded-lg px-2 py-0.5 text-muted-foreground">
                        {seg.longitud} ch
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{TIPO_LABEL[seg.tipo]}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-xs font-semibold text-primary-600">Editando segmento…</div>
                )}

                {/* Acciones (solo si no bloqueado) */}
                {!schema.bloqueado && !isEditing && !isConfirming && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMove(i, 'up')}
                      disabled={i === 0 || reorderPending}
                      className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                      title="Subir segmento"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMove(i, 'down')}
                      disabled={i === schema.segmentos.length - 1 || reorderPending}
                      className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                      title="Bajar segmento"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { setEditingId(seg.id); setShowAddForm(false); setDeletingId(null) }}
                      className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-primary-600 transition-colors"
                      title="Editar segmento"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { setDeletingId(seg.id); setDeleteError(null) }}
                      className="w-7 h-7 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                      title="Eliminar segmento"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Confirmación de eliminación */}
                {isConfirming && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-red-600">¿Eliminar?</span>
                    <button
                      onClick={() => handleDelete(seg)}
                      disabled={deletePending}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      {deletePending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Sí
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Formulario de edición inline */}
              {isEditing && (
                <div className="px-4 py-3 bg-neu-base shadow-neu-inset">
                  <SegmentoForm
                    schemaId={schema.id}
                    existingClaves={otherClaves}
                    inicial={seg}
                    onSave={updated => handleSegmentoSaved(updated, 'edit')}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}

              {/* Valores (selector) */}
              {!isEditing && seg.tipo === 'selector' && (
                <ValoresEditor
                  segmento={seg}
                  bloqueado={schema.bloqueado}
                  onValorAdded={nuevoValor => {
                    const updatedSegs = schema.segmentos.map(s =>
                      s.id === seg.id ? { ...s, valores: [...s.valores, nuevoValor] } : s,
                    )
                    onUpdate({ ...schema, segmentos: updatedSegs })
                  }}
                  onValorUpdated={valorActualizado => {
                    const updatedSegs = schema.segmentos.map(s =>
                      s.id === seg.id
                        ? { ...s, valores: s.valores.map(v => v.id === valorActualizado.id ? valorActualizado : v) }
                        : s,
                    )
                    onUpdate({ ...schema, segmentos: updatedSegs })
                  }}
                />
              )}

              {/* Auto-ref info */}
              {!isEditing && seg.tipo === 'auto_ref' && (
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    El sistema asigna automáticamente el siguiente número disponible
                    formateado con {seg.longitud} dígito{seg.longitud > 1 ? 's' : ''}.
                    {seg.ultimo_ref > 0 && ` Último asignado: ${String(seg.ultimo_ref).padStart(seg.longitud, '0')}`}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}

      {/* Formulario agregar nuevo segmento */}
      {showAddForm && (
        <div className="rounded-2xl bg-neu-base shadow-neu-inset p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuevo segmento</p>
          <SegmentoForm
            schemaId={schema.id}
            existingClaves={schema.segmentos.map(s => s.clave)}
            onSave={seg => handleSegmentoSaved(seg, 'add')}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}
    </div>
  )
}
