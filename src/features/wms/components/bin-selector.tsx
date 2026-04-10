'use client'

import { useState, useEffect } from 'react'
import { Plus, X, MapPin, Loader2 } from 'lucide-react'
import { getBinesEnBodega, crearBinEnBodega } from '@/features/wms/services/ajustes-actions'
import type { BinEnBodega } from '@/features/wms/types'

interface Props {
  bodegaId: string
  value: string | null
  onChange: (binId: string) => void
  onBinCreated?: (bin: BinEnBodega) => void
}

export function BinSelector({ bodegaId, value, onChange, onBinCreated }: Props) {
  const [bines, setBines] = useState<BinEnBodega[]>([])
  const [loadingBines, setLoadingBines] = useState(false)
  const [showNuevoBin, setShowNuevoBin] = useState(false)
  const [nuevaPosicion, setNuevaPosicion] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)

  useEffect(() => {
    if (!bodegaId) {
      setBines([])
      return
    }
    const load = async () => {
      setLoadingBines(true)
      const data = await getBinesEnBodega(bodegaId)
      setBines(data)
      setLoadingBines(false)
    }
    load()
  }, [bodegaId])

  const handleCrearBin = async () => {
    setCreando(true)
    setErrorCrear(null)
    const result = await crearBinEnBodega(bodegaId, nuevaPosicion)
    setCreando(false)

    if (result.error || !result.data) {
      setErrorCrear(result.error ?? 'Error creando bin')
      return
    }

    const nuevo = result.data
    setBines(prev => [nuevo, ...prev])
    onChange(nuevo.id)
    onBinCreated?.(nuevo)
    setShowNuevoBin(false)
    setNuevaPosicion('')
  }

  const binSeleccionado = bines.find(b => b.id === value)

  return (
    <div className="space-y-2">
      {/* Selector principal */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
          {loadingBines ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-3 h-3 animate-spin" />
              Cargando bines...
            </div>
          ) : (
            <select
              value={value ?? ''}
              onChange={e => onChange(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none appearance-none"
              disabled={!bodegaId}
            >
              <option value="">Seleccionar bin...</option>
              {bines.map(bin => (
                <option key={bin.id} value={bin.id}>
                  {bin.codigo}{bin.posicion ? ` · ${bin.posicion}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {!showNuevoBin && (
          <button
            type="button"
            onClick={() => setShowNuevoBin(true)}
            disabled={!bodegaId}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neu-base shadow-neu text-primary-700 text-xs font-semibold hover:shadow-neu-lg transition-all disabled:opacity-40 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo
          </button>
        )}
      </div>

      {/* Posición del bin seleccionado */}
      {binSeleccionado?.posicion && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{binSeleccionado.posicion}</span>
        </div>
      )}

      {/* Form inline para nuevo bin */}
      {showNuevoBin && (
        <div className="rounded-xl bg-neu-base shadow-neu p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Nuevo bin</p>
            <button
              type="button"
              onClick={() => { setShowNuevoBin(false); setNuevaPosicion(''); setErrorCrear(null) }}
              className="p-0.5 hover:bg-neu-200 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Posición (opcional)
            </label>
            <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-1.5">
              <input
                type="text"
                value={nuevaPosicion}
                onChange={e => setNuevaPosicion(e.target.value)}
                placeholder="Ej: A-03, Rack-2, Zona-PT..."
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                onKeyDown={e => e.key === 'Enter' && handleCrearBin()}
              />
            </div>
          </div>

          {errorCrear && (
            <p className="text-xs text-red-600">{errorCrear}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowNuevoBin(false); setNuevaPosicion(''); setErrorCrear(null) }}
              className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCrearBin}
              disabled={creando}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neu-base shadow-neu text-primary-700 text-xs font-semibold transition-all active:shadow-neu-inset disabled:opacity-60"
            >
              {creando && <Loader2 className="w-3 h-3 animate-spin" />}
              Crear bin
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
