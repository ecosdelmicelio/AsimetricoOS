'use client'

import { useState, useTransition, useRef } from 'react'
import { Upload, Loader2, X, FileText, Image } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { uploadDesarrolloAsset, eliminarAsset } from '@/features/desarrollo/services/versiones-actions'
import type { DesarrolloAsset } from '@/features/desarrollo/types'

const TIPOS = [
  { value: 'foto_muestra',    label: 'Foto Muestra' },
  { value: 'sketch',          label: 'Sketch Técnico' },
  { value: 'foto_hallazgo',   label: 'Foto Hallazgo' },
  { value: 'optitex',         label: 'Optitex' },
  { value: 'ficha_tecnica',   label: 'Ficha Técnica' },
  { value: 'marquilla_comp',  label: 'Marquilla Composición' },
  { value: 'marquilla_imp',   label: 'Marquilla Impresa' },
  { value: 'empaque',         label: 'Empaque' },
  { value: 'etiqueta',        label: 'Etiqueta' },
  { value: 'accesorio',       label: 'Accesorio' },
]

const IMAGE_TYPES = ['foto_muestra', 'sketch', 'foto_hallazgo']

interface Props {
  assets:       DesarrolloAsset[]
  versionId:    string
  desarrolloId: string
  onGaleriaClick?: (url: string, index: number, fotos: string[]) => void
}

export function AssetUploader({ assets, versionId, desarrolloId, onGaleriaClick }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [tipo, setTipo]           = useState('foto_muestra')
  const [descripcion, setDescripcion] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fotos   = assets.filter(a => IMAGE_TYPES.includes(a.tipo))
  const archivos = assets.filter(a => !IMAGE_TYPES.includes(a.tipo))
  const fotosUrls = fotos.map(f => f.url)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)

    startTransition(async () => {
      const result = await uploadDesarrolloAsset(
        versionId,
        desarrolloId,
        file,
        tipo,
        descripcion || undefined
      )
      setUploading(false)
      if (result.error) {
        setUploadError(result.error)
      } else {
        setDescripcion('')
        if (inputRef.current) inputRef.current.value = ''
      }
    })
  }

  function handleDelete(assetId: string) {
    startTransition(async () => {
      await eliminarAsset(assetId, desarrolloId)
    })
  }

  return (
    <div className="space-y-5">
      {/* Upload form */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex items-center gap-3 mb-3">
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-400"
          >
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            type="text"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción (opcional)"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-400"
          />
        </div>
        <label className={cn(
          'flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all',
          'border border-slate-200 bg-white hover:bg-primary-50 hover:border-primary-300',
          isPending && 'opacity-50 cursor-not-allowed'
        )}>
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
          ) : (
            <Upload className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs text-slate-500 font-medium">
            {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
          </span>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.dxf,.ai,.eps"
            onChange={handleFileChange}
            disabled={isPending}
          />
        </label>
        {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
      </div>

      {/* Galería de fotos */}
      {fotos.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Fotos ({fotos.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {fotos.map((foto, idx) => (
              <div key={foto.id} className="group relative rounded-xl overflow-hidden bg-slate-100 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt={foto.descripcion ?? foto.tipo}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onGaleriaClick?.(foto.url, idx, fotosUrls)}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-white font-medium truncate">{foto.descripcion ?? foto.tipo}</p>
                </div>
                <button
                  onClick={() => handleDelete(foto.id)}
                  disabled={isPending}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archivos técnicos */}
      {archivos.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Archivos técnicos
          </p>
          <div className="space-y-1.5">
            {archivos.map(archivo => (
              <div key={archivo.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <a href={archivo.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 truncate block">
                    {archivo.descripcion ?? archivo.tipo}
                  </a>
                  <span className="text-[10px] text-slate-400 capitalize">{archivo.tipo.replace(/_/g, ' ')}</span>
                </div>
                <button
                  onClick={() => handleDelete(archivo.id)}
                  disabled={isPending}
                  className="shrink-0 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {assets.length === 0 && (
        <p className="text-sm text-slate-400 italic text-center py-2">Sin archivos subidos</p>
      )}
    </div>
  )
}
