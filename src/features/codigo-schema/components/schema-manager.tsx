'use client'

import { useState, useTransition } from 'react'
import { Plus, Lock, Loader2, Pencil, Check, X, ShieldCheck } from 'lucide-react'
import { createSchema, updateSchema, finalizarSchema } from '@/features/codigo-schema/services/schema-actions'
import { SegmentosEditor } from './segmentos-editor'
import type { CodigoSchema, EntidadSchema } from '@/features/codigo-schema/types'

const ENTIDAD_LABEL: Record<EntidadSchema, string> = {
  producto: 'Producto Terminado (PT)',
  material: 'Materia Prima (MP)',
  servicio: 'Servicio',
}

interface Props {
  entidad: EntidadSchema
  schema: CodigoSchema | null
}

export function SchemaManager({ entidad, schema: schemaInicial }: Props) {
  const [schema, setSchema] = useState(schemaInicial)
  const [showCreate, setShowCreate] = useState(false)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [editingNombre, setEditingNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renamePending, startRenameTransition] = useTransition()

  const [confirmFinalizar, setConfirmFinalizar] = useState(false)
  const [finalizarError, setFinalizarError] = useState<string | null>(null)
  const [finalizarPending, startFinalizarTransition] = useTransition()

  function handleRenameStart() {
    setNuevoNombre(schema?.nombre ?? '')
    setRenameError(null)
    setEditingNombre(true)
  }

  function handleRenameSave() {
    if (!nuevoNombre.trim()) { setRenameError('El nombre es requerido'); return }
    setRenameError(null)
    startRenameTransition(async () => {
      const res = await updateSchema(schema!.id, nuevoNombre.trim())
      if (res.error) { setRenameError(res.error); return }
      setSchema(s => s ? { ...s, nombre: nuevoNombre.trim() } : s)
      setEditingNombre(false)
    })
  }

  function handleFinalizar() {
    setFinalizarError(null)
    startFinalizarTransition(async () => {
      const res = await finalizarSchema(schema!.id)
      if (res.error) { setFinalizarError(res.error); return }
      setSchema(s => s ? { ...s, bloqueado: true } : s)
      setConfirmFinalizar(false)
    })
  }

  const longitudTotal = schema?.segmentos.reduce((s, seg) => s + seg.longitud, 0) ?? 0

  function handleCreate() {
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setError(null)
    startTransition(async () => {
      const res = await createSchema({ entidad, nombre: nombre.trim() })
      if (res.error) { setError(res.error); return }
      setSchema(res.data)
      setShowCreate(false)
      setNombre('')
    })
  }

  if (!schema) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center space-y-3">
          <p className="font-semibold text-foreground">
            No hay esquema de códigos para {ENTIDAD_LABEL[entidad]}
          </p>
          <p className="text-body-sm text-muted-foreground">
            Define la estructura del código antes de crear registros
          </p>

          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all hover:shadow-neu-lg active:shadow-neu-inset"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear esquema
            </button>
          ) : (
            <div className="flex gap-2 max-w-sm mx-auto">
              <div className="flex-1 rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder={`Ej: Esquema ${ENTIDAD_LABEL[entidad]}`}
                  className="w-full bg-transparent text-body-sm text-foreground outline-none"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={pending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crear'}
              </button>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground text-body-sm px-2">
                ✕
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header del esquema */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {editingNombre ? (
                <>
                  <div className="rounded-lg bg-neu-base shadow-neu px-2.5 py-1">
                    <input
                      value={nuevoNombre}
                      onChange={e => setNuevoNombre(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameSave(); if (e.key === 'Escape') setEditingNombre(false) }}
                      className="bg-transparent text-body-md font-semibold text-foreground outline-none w-48"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleRenameSave}
                    disabled={renamePending}
                    className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-primary-600 disabled:opacity-60"
                  >
                    {renamePending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => setEditingNombre(false)}
                    className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {renameError && <p className="text-xs text-red-600 w-full">{renameError}</p>}
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-foreground text-body-md">{schema.nombre}</h3>
                  <button
                    onClick={handleRenameStart}
                    className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-primary-600 transition-colors"
                    title="Renombrar esquema"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {schema.bloqueado && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg" title="Esquema finalizado o en uso — estructura fija">
                      <Lock className="w-3 h-3" />
                      Estructura fija
                    </span>
                  )}
                  {!schema.bloqueado && schema.segmentos.length > 0 && (
                    confirmFinalizar ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-amber-700">¿Finalizar esquema? No podrá agregar más segmentos.</span>
                        <button
                          onClick={handleFinalizar}
                          disabled={finalizarPending}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          {finalizarPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Sí, finalizar
                        </button>
                        <button
                          onClick={() => setConfirmFinalizar(false)}
                          className="w-5 h-5 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {finalizarError && <p className="text-xs text-red-600">{finalizarError}</p>}
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmFinalizar(true)}
                        className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg hover:bg-amber-100 transition-colors"
                        title="Bloquear el esquema para evitar agregar más segmentos"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Finalizar esquema
                      </button>
                    )
                  )}
                </>
              )}
            </div>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              {schema.segmentos.length} segmentos · {longitudTotal} caracteres totales
            </p>
          </div>

          {/* Preview del patrón */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {schema.segmentos.map((seg, i) => (
              <span key={seg.id} className="text-xs font-mono">
                <span className="font-semibold text-foreground">{seg.clave}</span>
                <span className="text-muted-foreground">({seg.longitud})</span>
                {i < schema.segmentos.length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
              </span>
            ))}
            {schema.segmentos.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">= {longitudTotal} ch</span>
            )}
          </div>
        </div>
      </div>

      {/* Editor de segmentos */}
      <SegmentosEditor
        schema={schema}
        onUpdate={updated => setSchema(updated)}
      />
    </div>
  )
}
