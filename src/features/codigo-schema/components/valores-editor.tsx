'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Pencil, Check, X } from 'lucide-react'
import { addValor, updateValor } from '@/features/codigo-schema/services/schema-actions'
import type { CodigoSegmento, CodigoSegmentoValor } from '@/features/codigo-schema/types'

interface Props {
  segmento: CodigoSegmento
  bloqueado: boolean
  onValorAdded:   (valor: CodigoSegmentoValor) => void
  onValorUpdated: (valor: CodigoSegmentoValor) => void
}

/** Auto-genera el código a partir del nombre descriptivo.
 *  Para nombres compuestos usa las iniciales en round-robin (una letra por
 *  palabra por vuelta), ignorando conectores de una sola letra (y, e, o…).
 *  Siempre devuelve un valor que no esté en `existentes`.
 */
function generarValor(etiqueta: string, longitud: number, existentes: string[]): string {
  const words = etiqueta
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quitar acentos
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')       // solo alfanumérico + espacios
    .split(/\s+/)
    .filter(w => w.length > 0)

  if (words.length === 0) return 'X'.repeat(longitud)

  // Ignorar palabras de 1 carácter (conectores: y, e, o, a, de…) cuando hay otras
  const significant = words.filter(w => w.length > 1)
  const useWords = significant.length > 0 ? significant : words

  // Round-robin: toma 1 carácter por palabra por vuelta hasta llenar longitud
  let base = ''
  let charIdx = 0
  outer: while (base.length < longitud) {
    let added = false
    for (const word of useWords) {
      if (charIdx < word.length) {
        base += word[charIdx]
        added = true
        if (base.length >= longitud) break outer
      }
    }
    if (!added) break  // todas las palabras agotadas
    charIdx++
  }

  const tryCandidate = (s: string) => s.slice(0, longitud).padEnd(longitud, 'X')
  const candidate = tryCandidate(base)

  if (!existentes.includes(candidate)) return candidate

  // Colisión → sufijo numérico al final
  for (let i = 1; i <= 99; i++) {
    const suffix = String(i)
    const c = tryCandidate(base.slice(0, longitud - suffix.length) + suffix)
    if (!existentes.includes(c)) return c
  }
  return candidate
}

/* ─── Chip editable ─── */
function ValorChip({
  valor,
  onSave,
}: {
  valor: CodigoSegmentoValor
  onSave: (nuevaEtiqueta: string) => Promise<string | null>
}) {
  const [editing, setEditing]     = useState(false)
  const [text, setText]           = useState(valor.etiqueta)
  const [error, setError]         = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    if (!text.trim()) { setError('Requerido'); return }
    setError(null)
    startTransition(async () => {
      const err = await onSave(text.trim())
      if (err) { setError(err); return }
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1">
        <span className="font-mono text-xs font-bold text-foreground shrink-0">{valor.valor}</span>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setText(valor.etiqueta) } }}
          className="bg-transparent text-xs text-foreground outline-none w-28"
          autoFocus
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
        <button
          onClick={handleSave}
          disabled={pending}
          className="text-primary-600 disabled:opacity-60 shrink-0"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          onClick={() => { setEditing(false); setText(valor.etiqueta); setError(null) }}
          className="text-muted-foreground shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1.5 rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1">
      <span className="font-mono text-xs font-bold text-foreground">{valor.valor}</span>
      <span className="text-xs text-muted-foreground">{valor.etiqueta}</span>
      <button
        onClick={() => { setText(valor.etiqueta); setEditing(true) }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary-600 ml-0.5"
        title="Editar descripción"
      >
        <Pencil className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}

/* ─── Editor principal ─── */
export function ValoresEditor({ segmento, bloqueado, onValorAdded, onValorUpdated }: Props) {
  const [showForm, setShowForm]    = useState(false)
  const [etiqueta, setEtiqueta]    = useState('')
  const [error, setError]          = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const activos    = segmento.valores.filter(v => v.activo)
  const existentes = segmento.valores.map(v => v.valor)

  const valorPreview = etiqueta.trim()
    ? generarValor(etiqueta.trim(), segmento.longitud, existentes)
    : null

  function handleAdd() {
    if (!etiqueta.trim()) { setError('El nombre es requerido'); return }
    const valorFinal = generarValor(etiqueta.trim(), segmento.longitud, existentes)
    setError(null)
    startTransition(async () => {
      const res = await addValor(segmento.id, { valor: valorFinal, etiqueta: etiqueta.trim() })
      if (res.error) { setError(res.error); return }
      onValorAdded(res.data!)
      setEtiqueta('')
      setShowForm(false)
    })
  }

  return (
    <div className="px-4 py-3 space-y-2">
      {/* Chips de valores existentes */}
      <div className="flex flex-wrap gap-2">
        {activos.length === 0 && !showForm && (
          <span className="text-xs text-muted-foreground">Sin valores aún</span>
        )}
        {activos.map(v => (
          <ValorChip
            key={v.id}
            valor={v}
            onSave={async (nuevaEtiqueta) => {
              const res = await updateValor(v.id, nuevaEtiqueta)
              if (res.error) return res.error
              onValorUpdated({ ...v, etiqueta: nuevaEtiqueta })
              return null
            }}
          />
        ))}

        {!bloqueado && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-lg border border-dashed border-primary-300 px-2.5 py-1 text-xs text-primary-600 hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Agregar valor
          </button>
        )}
      </div>

      {/* Mini formulario: solo nombre descriptivo */}
      {showForm && (
        <div className="flex items-end gap-2 flex-wrap">
          <div className="space-y-1 flex-1 min-w-40">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Nombre descriptivo *
            </label>
            <div className="rounded-lg bg-neu-base shadow-neu px-2.5 py-1.5">
              <input
                value={etiqueta}
                onChange={e => setEtiqueta(e.target.value)}
                placeholder="Ej: Asimétrico Lab"
                className="w-full bg-transparent text-body-sm text-foreground outline-none"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>

          {/* Preview del código auto-generado */}
          {valorPreview && (
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Código ({segmento.longitud} ch)
              </label>
              <div className="flex items-center h-[34px] rounded-lg bg-neu-base shadow-neu-inset px-2.5">
                <span className="font-mono text-xs font-bold text-foreground tracking-widest">
                  {valorPreview}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={pending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
          >
            {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          </button>
          <button
            onClick={() => { setShowForm(false); setEtiqueta(''); setError(null) }}
            className="text-muted-foreground text-body-sm px-1"
          >
            ✕
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
