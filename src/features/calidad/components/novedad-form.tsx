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
    <div className="rounded-xl bg-neu-base shadow-neu-inset p-3 space-y-3">
      <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Nuevo tipo de defecto</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-muted-foreground">Descripción *</label>
          <div className="rounded-lg bg-neu-base shadow-neu px-2.5 py-1.5">
            <input
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Elastico flojo en cintura"
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
              autoFocus
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Categoría *</label>
          <div className="relative rounded-lg bg-neu-base shadow-neu px-2.5 py-1.5">
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              {CATEGORIAS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Gravedad *</label>
          <div className="relative rounded-lg bg-neu-base shadow-neu px-2.5 py-1.5">
            <select
              value={gravedad}
              onChange={e => setGravedad(e.target.value as GravedadDefecto)}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              {GRAVEDADES.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg bg-neu-base shadow-neu text-body-sm text-muted-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="flex-1 py-1.5 rounded-lg bg-primary-600 text-white font-semibold text-body-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" />}
          Crear y seleccionar
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
        className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-black/10 py-4 text-body-sm text-muted-foreground hover:text-foreground hover:border-black/20 transition-all"
      >
        <Plus className="w-4 h-4" />
        Registrar novedad
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4"
    >
      <h3 className="font-semibold text-foreground text-body-sm">Nueva novedad</h3>

      {/* Tipo de defecto */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Tipo de defecto *</label>
        <div className="relative rounded-xl bg-neu-base shadow-neu-inset">
          <select
            value={selectedTipoId}
            onChange={e => handleTipoChange(e.target.value)}
            className="w-full rounded-xl bg-transparent px-3 py-2.5 text-body-sm text-foreground focus:outline-none appearance-none"
          >
            <option value="">Seleccionar defecto...</option>
            {localTipos.map(t => (
              <option key={t.id} value={t.id}>
                {t.codigo} — {t.descripcion}
              </option>
            ))}
            <option value="__nuevo__">+ Crear nuevo tipo de defecto...</option>
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
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
        <div className="space-y-1.5">
          <label className="text-body-sm text-muted-foreground">Prendas afectadas *</label>
          <input
            type="number"
            name="cantidad_afectada"
            min={1}
            required
            defaultValue={1}
            className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 text-body-sm text-foreground focus:outline-none"
          />
        </div>
      )}

      {/* Descripción adicional */}
      {!creandoNuevo && (
        <div className="space-y-1.5">
          <label className="text-body-sm text-muted-foreground">Descripción adicional</label>
          <textarea
            name="descripcion"
            rows={2}
            placeholder="Describe el defecto con más detalle..."
            className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 text-body-sm text-foreground focus:outline-none resize-none"
          />
        </div>
      )}

      {/* Foto — OBLIGATORIA */}
      {!creandoNuevo && (
        <div className="space-y-1.5">
          <label className="text-body-sm text-muted-foreground">
            Foto <span className="text-red-500 font-semibold">* obligatoria</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-body-sm transition-all ${
                preview
                  ? 'bg-green-50 text-green-700 shadow-inner'
                  : 'bg-neu-base shadow-neu text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="w-4 h-4" />
              {preview ? 'Cambiar foto' : 'Tomar / adjuntar foto'}
            </button>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="w-12 h-12 object-cover rounded-xl shadow-neu-inset" />
            )}
            {!preview && (
              <span className="text-xs text-red-500">Sin foto</span>
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

      {error && <p className="text-red-600 text-body-sm">{error}</p>}

      {!creandoNuevo && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 py-2.5 rounded-xl bg-neu-base shadow-neu text-body-sm text-muted-foreground hover:text-foreground transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || !selectedTipoId || !gravedad || !preview}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Guardar novedad
          </button>
        </div>
      )}
    </form>
  )
}
