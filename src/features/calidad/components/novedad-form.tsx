'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Plus, Loader2, AlertTriangle, ChevronDown } from 'lucide-react'
import { addNovedad, createTipoDefecto } from '@/features/calidad/services/calidad-actions'
import type { TipoDefecto, GravedadDefecto } from '@/features/calidad/types'

const CATEGORIAS = [
  { value: 'costura',   label: 'Costura' },
  { value: 'tela',      label: 'Tela' },
  { value: 'simetria',  label: 'Simetría' },
  { value: 'medidas',   label: 'Medidas' },
  { value: 'limpieza',  label: 'Limpieza' },
] as const

const GRAVEDADES: { value: GravedadDefecto; label: string; className: string }[] = [
  { value: 'menor',   label: 'Menor',   className: 'text-yellow-600 bg-yellow-50 border-yellow-300' },
  { value: 'mayor',   label: 'Mayor',   className: 'text-orange-600 bg-orange-50 border-orange-300' },
  { value: 'critico', label: 'Crítico', className: 'text-red-600 bg-red-50 border-red-300' },
]

const PUNTOS: Record<GravedadDefecto, number> = { menor: 1, mayor: 5, critico: 10 }

interface Props {
  inspeccion_id: string
  op_id: string
  tiposDefecto: TipoDefecto[]
}

/* ─── Mini-form para crear tipo de defecto inline ─── */
function NuevoDefectoForm({
  onCreado,
  onCancel,
}: {
  onCreado: (tipo: TipoDefecto) => void
  onCancel: () => void
}) {
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria]     = useState<string>('costura')
  const [gravedad, setGravedad]       = useState<GravedadDefecto>('menor')
  const [error, setError]             = useState<string | null>(null)
  const [pending, startTransition]    = useTransition()

  function handleSave() {
    if (!descripcion.trim()) { setError('La descripción es requerida'); return }
    setError(null)
    startTransition(async () => {
      const res = await createTipoDefecto({ descripcion, categoria, gravedad_sugerida: gravedad })
      if (res.error) { setError(res.error); return }
      onCreado(res.data!)
    })
  }

  return (
    <div className="rounded-2xl bg-slate-50/50 border border-slate-100 p-4 space-y-4">
      <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">NUEVO TIPO DE DEFECTO</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción *</label>
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm px-3 py-2">
            <input
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Elástico flojo en cintura"
              className="w-full bg-transparent text-sm text-slate-900 font-medium outline-none placeholder:text-slate-300"
              autoFocus
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría *</label>
          <div className="relative rounded-xl bg-white border border-slate-200 shadow-sm px-3 py-2">
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 font-medium outline-none appearance-none cursor-pointer"
            >
              {CATEGORIAS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Gravedad *</label>
          <div className="relative rounded-xl bg-white border border-slate-200 shadow-sm px-3 py-2">
            <select
              value={gravedad}
              onChange={e => setGravedad(e.target.value as GravedadDefecto)}
              className="w-full bg-transparent text-sm text-slate-900 font-medium outline-none appearance-none cursor-pointer"
            >
              {GRAVEDADES.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all"
        >
          CANCELAR
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" />}
          CREAR Y SELECCIONAR
        </button>
      </div>
    </div>
  )
}

/* ─── Formulario principal ─── */
export function NovedadForm({ inspeccion_id, op_id, tiposDefecto }: Props) {
  const [open, setOpen]                 = useState(false)
  const [pending, startTransition]      = useTransition()
  const [preview, setPreview]           = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [creandoNuevo, setCreandoNuevo] = useState(false)

  // Lista local — se extiende al crear un defecto nuevo
  const [localTipos, setLocalTipos]     = useState<TipoDefecto[]>(tiposDefecto)
  const [selectedTipoId, setSelectedTipoId] = useState('')
  const [gravedad, setGravedad]         = useState<GravedadDefecto | ''>('')
  const [gravedadBloqueada, setGravedadBloqueada] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleTipoChange(id: string) {
    if (id === '__nuevo__') {
      setCreandoNuevo(true)
      setSelectedTipoId('')
      setGravedad('')
      setGravedadBloqueada(false)
      return
    }
    setCreandoNuevo(false)
    setSelectedTipoId(id)
    const tipo = localTipos.find(t => t.id === id)
    if (tipo) {
      setGravedad(tipo.gravedad_sugerida)
      setGravedadBloqueada(true)
    }
  }

  function handleNuevoDefectoCreado(tipo: TipoDefecto) {
    setLocalTipos(prev => [...prev, tipo])
    setSelectedTipoId(tipo.id)
    setGravedad(tipo.gravedad_sugerida)
    setGravedadBloqueada(true)
    setCreandoNuevo(false)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  function resetForm() {
    formRef.current?.reset()
    setPreview(null)
    setError(null)
    setSelectedTipoId('')
    setGravedad('')
    setGravedadBloqueada(false)
    setCreandoNuevo(false)
    setOpen(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Validar foto obligatoria
    const fotoInput = fileRef.current
    if (!fotoInput?.files?.[0] || fotoInput.files[0].size === 0) {
      setError('La foto es obligatoria para registrar una novedad')
      return
    }
    if (!selectedTipoId) {
      setError('Selecciona el tipo de defecto')
      return
    }
    if (!gravedad) {
      setError('La gravedad es requerida')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('inspeccion_id', inspeccion_id)
    formData.set('op_id', op_id)
    formData.set('tipo_defecto_id', selectedTipoId)
    formData.set('gravedad', gravedad)

    startTransition(async () => {
      const result = await addNovedad(formData)
      if (result.error) {
        setError(result.error)
      } else {
        resetForm()
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full rounded-[2rem] border-2 border-dashed border-slate-200 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-900 hover:bg-slate-50 transition-all group"
      >
        <Plus className="w-4 h-4 transition-transform group-hover:scale-125" />
        REGISTRAR NOVEDAD TÉCNICA
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-[2.5rem] bg-white border border-slate-100 shadow-xl p-8 space-y-6"
    >
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
        <div className="w-1.5 h-4 bg-slate-900 rounded-full" />
        NUEVA NOVEDAD DE CALIDAD
      </h3>

      {/* Tipo de defecto */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de defecto *</label>
        <div className="relative rounded-xl bg-slate-50/50 border border-slate-100 focus-within:border-slate-900 transition-all">
          <select
            value={selectedTipoId}
            onChange={e => handleTipoChange(e.target.value)}
            className="w-full rounded-xl bg-transparent px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">Seleccionar defecto...</option>
            {localTipos.map(t => (
              <option key={t.id} value={t.id}>
                {t.codigo} — {t.descripcion}
              </option>
            ))}
            <option value="__nuevo__">+ Crear nuevo tipo de defecto...</option>
          </select>
          <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Form inline para crear nuevo defecto */}
      {creandoNuevo && (
        <NuevoDefectoForm
          onCreado={handleNuevoDefectoCreado}
          onCancel={() => { setCreandoNuevo(false); setSelectedTipoId('') }}
        />
      )}

      {/* Gravedad — badge de solo lectura, definida por el tipo de defecto */}
      {!creandoNuevo && gravedad && (
        <div className="space-y-1.5">
          <label className="text-body-sm text-muted-foreground">Gravedad</label>
          <div className="flex items-center gap-2">
            {(() => {
              const g = GRAVEDADES.find(x => x.value === gravedad)
              return g ? (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border-2 ${g.className}`}>
                  {g.label} · {PUNTOS[g.value]} pts
                </span>
              ) : null
            })()}
            <span className="text-xs text-muted-foreground">Definida por el tipo de defecto</span>
          </div>

          {/* Banner crítico */}
          {gravedad === 'critico' && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-700 text-xs font-semibold leading-snug">
                Defecto CRÍTICO — Este lote será rechazado automáticamente al cerrar la inspección.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cantidad afectada */}
      {!creandoNuevo && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prendas afectadas *</label>
          <div className="rounded-xl bg-slate-50/50 border border-slate-100">
            <input
              type="number"
              name="cantidad_afectada"
              min={1}
              required
              defaultValue={1}
              className="w-full bg-transparent px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Descripción adicional */}
      {!creandoNuevo && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción adicional</label>
          <div className="rounded-xl bg-slate-50/50 border border-slate-100">
            <textarea
              name="descripcion"
              rows={2}
              placeholder="Describe el defecto con más detalle..."
              className="w-full bg-transparent px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none resize-none placeholder:text-slate-300"
            />
          </div>
        </div>
      )}

      {/* Foto — OBLIGATORIA */}
      {!creandoNuevo && (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            Foto <span className="text-rose-500">* OBLIGATORIA</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                preview
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Camera className="w-4 h-4" />
              {preview ? 'CAMBIAR FOTO' : 'ADJUNTAR EVIDENCIA'}
            </button>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="w-14 h-14 object-cover rounded-xl border-2 border-white shadow-md" />
            )}
            {!preview && (
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest italic opacity-60">Falta evidencia visual</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            name="foto"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      )}

      {error && <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">{error}</p>}

      {!creandoNuevo && (
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 py-3.5 rounded-xl bg-white border border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            CANCELAR
          </button>
          <button
            type="submit"
            disabled={pending || !selectedTipoId || !gravedad || !preview}
            className="flex-1 py-3.5 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            GUARDAR NOVEDAD
          </button>
        </div>
      )}
    </form>
  )
}
