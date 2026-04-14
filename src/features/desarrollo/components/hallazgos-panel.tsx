'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { crearHallazgo, resolverHallazgo } from '@/features/desarrollo/services/versiones-actions'
import type { DesarrolloHallazgo } from '@/features/desarrollo/types'

const CATEGORIAS = ['molderia','costura','tela','acabado','color','medida','avios','otro']
const SEVERIDADES = ['leve','moderado','critico']

const SEVERIDAD_COLORS: Record<string, string> = {
  leve:     'bg-yellow-100 text-yellow-700',
  moderado: 'bg-orange-100 text-orange-700',
  critico:  'bg-red-100 text-red-700',
}

interface Props {
  hallazgos:     DesarrolloHallazgo[]
  versionId:     string
  versionN:      number
  desarrolloId:  string
}

export function HallazgosPanel({ hallazgos, versionId, versionN, desarrolloId }: Props) {
  const [showForm, setShowForm]   = useState(false)
  const [isPending, startTransition] = useTransition()

  const [categoria, setCategoria]   = useState('molderia')
  const [severidad, setSeveridad]   = useState('moderado')
  const [descripcion, setDescripcion] = useState('')
  const [zona, setZona]             = useState('')
  const [formError, setFormError]   = useState<string | null>(null)

  const pendientes = hallazgos.filter(h => !h.resuelto)
  const resueltos  = hallazgos.filter(h => h.resuelto)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!descripcion.trim()) { setFormError('La descripción es obligatoria.'); return }
    setFormError(null)

    startTransition(async () => {
      const result = await crearHallazgo(desarrolloId, {
        version_id:   versionId,
        categoria,
        severidad,
        descripcion:  descripcion.trim(),
        zona_prenda:  zona.trim() || undefined,
      })
      if (result.error) { setFormError(result.error); return }
      setDescripcion('')
      setZona('')
      setShowForm(false)
    })
  }

  function handleResolver(hallazgoId: string) {
    startTransition(async () => {
      await resolverHallazgo(hallazgoId, desarrolloId, versionN)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Hallazgos</span>
          {pendientes.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
              {pendientes.length} pendientes
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-wider"
        >
          <Plus className="w-3.5 h-3.5" />
          Registrar hallazgo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-400"
              >
                {CATEGORIAS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Severidad</label>
              <select
                value={severidad}
                onChange={e => setSeveridad(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-400"
              >
                {SEVERIDADES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción *</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Ej: Manga derecha 2cm más corta que la izquierda"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Zona de la prenda</label>
            <input
              type="text"
              value={zona}
              onChange={e => setZona(e.target.value)}
              placeholder="Ej: manga derecha, cuello, espalda baja..."
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-400"
            />
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={isPending}
              className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-50">
              {isPending ? 'Guardando...' : 'Registrar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <div className="space-y-2">
          {pendientes.map(h => (
            <HallazgoItem
              key={h.id}
              hallazgo={h}
              onResolver={() => handleResolver(h.id)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Resueltos */}
      {resueltos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resueltos</p>
          <div className="space-y-1.5 opacity-60">
            {resueltos.map(h => <HallazgoItem key={h.id} hallazgo={h} resuelto />)}
          </div>
        </div>
      )}

      {hallazgos.length === 0 && !showForm && (
        <p className="text-sm text-slate-400 italic text-center py-4">Sin hallazgos registrados</p>
      )}
    </div>
  )
}

function HallazgoItem({
  hallazgo,
  onResolver,
  isPending,
  resuelto,
}: {
  hallazgo:    DesarrolloHallazgo
  onResolver?: () => void
  isPending?:  boolean
  resuelto?:   boolean
}) {
  return (
    <div className={cn(
      'flex items-start gap-3 rounded-xl border p-3 transition-all',
      resuelto ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white'
    )}>
      <div className="flex flex-col gap-1.5 shrink-0 mt-0.5">
        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase', SEVERIDAD_COLORS[hallazgo.severidad])}>
          {hallazgo.severidad}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 text-slate-600 capitalize">
          {hallazgo.categoria}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800">{hallazgo.descripcion}</p>
        {hallazgo.zona_prenda && (
          <p className="text-[11px] text-slate-500 mt-0.5">📍 {hallazgo.zona_prenda}</p>
        )}
        {hallazgo.resuelto_en_version && (
          <p className="text-[10px] text-green-600 mt-0.5 font-semibold">Resuelto en v{hallazgo.resuelto_en_version}</p>
        )}
      </div>
      {!resuelto && onResolver && (
        <button
          onClick={onResolver}
          disabled={isPending}
          className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-green-600 hover:text-green-700 disabled:opacity-50"
          title="Marcar como resuelto"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      )}
      {resuelto && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />}
    </div>
  )
}
