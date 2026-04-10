'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Package, Box, ChevronRight, Scan } from 'lucide-react'
import { getBodegas } from '@/features/wms/services/bodegas-actions'
import { getPosicionesByBodega } from '@/features/wms/services/posiciones-actions'
import { getBinesEnBodega } from '@/features/wms/services/ajustes-actions'
import type { Bodega, Posicion, BinEnBodega } from '@/features/wms/types'

interface Location {
  bodegaId?: string
  posicionId?: string
  binId?: string
}

interface Props {
  label: string
  hideLabel?: boolean
  value: Location
  onChange: (loc: Location) => void
  excludeBinId?: string
  placeholder?: string
}

export function LocationSelector({ label, hideLabel, value, onChange, excludeBinId, placeholder }: Props) {
  const [bodegas, setBodegas] = useState<Bodega[]>([])
  const [posiciones, setPosiciones] = useState<Posicion[]>([])
  const [bines, setBines] = useState<BinEnBodega[]>([])
  
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'text' | 'selector'>('selector')
  const [searchText, setSearchText] = useState('')

  // Cargar bodegas al inicio
  useEffect(() => {
    getBodegas().then(setBodegas)
  }, [])

  // Cargar posiciones cuando cambia la bodega
  useEffect(() => {
    if (value.bodegaId) {
      getPosicionesByBodega(value.bodegaId).then(setPosiciones)
      // Reset niveles inferiores si la bodega cambió y no hay posicion/bin seleccionados consistentemente
      setBines([])
    } else {
      setPosiciones([])
      setBines([])
    }
  }, [value.bodegaId])

  // Cargar bines cuando cambia la posicion
  useEffect(() => {
    if (value.bodegaId && value.posicionId) {
      getBinesEnBodega(value.bodegaId).then(data => {
        // Filtrar bines que pertenecen a esta posición
        setBines(data.filter(b => b.posicion_id === value.posicionId && b.id !== excludeBinId))
      })
    } else {
      setBines([])
    }
  }, [value.posicionId, value.bodegaId, excludeBinId])

  const handleScan = (text: string) => {
    // Lógica de búsqueda "mágica" por código
    // 1. Buscar en bines cargados
    const foundBin = bines.find(b => b.codigo.toLowerCase() === text.toLowerCase())
    if (foundBin) {
      onChange({ ...value, binId: foundBin.id })
      return
    }
    
    // 2. Buscar en posiciones
    const foundPos = posiciones.find(p => p.codigo.toLowerCase() === text.toLowerCase())
    if (foundPos) {
      onChange({ ...value, posicionId: foundPos.id, binId: undefined })
      return
    }
    
    // Si no se encuentra, dejar como texto de búsqueda para filtros
    setSearchText(text)
  }

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
          <button 
            onClick={() => setMode(mode === 'text' ? 'selector' : 'text')}
            className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-1"
          >
            {mode === 'text' ? <Package className="w-3 h-3" /> : <Scan className="w-3 h-3" />}
            {mode === 'text' ? 'Selector Manual' : 'Modo Escaneo'}
          </button>
        </div>
      )}

      <div className="bg-neu-base border-2 border-neu-300 rounded-2xl p-4 shadow-neu-sm transition-all focus-within:border-primary-400 focus-within:shadow-neu-lg">
        {mode === 'text' ? (
          <div className="relative">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" />
            <input
              type="text"
              autoFocus
              placeholder={placeholder || "Escanee código de Bin o Posición..."}
              className="w-full pl-10 pr-4 py-2 bg-neu-100/50 rounded-xl outline-none text-sm font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleScan((e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {/* Bodega */}
            <div className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[10px] text-muted-foreground px-1">Bodega</span>
              <select
                value={value.bodegaId || ''}
                onChange={(e) => onChange({ bodegaId: e.target.value })}
                className="w-full px-2 py-1.5 bg-transparent border border-neu-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Seleccionar...</option>
                {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>

            <ChevronRight className="w-4 h-4 text-neu-400 mt-4 hidden sm:block" />

            {/* Posición */}
            <div className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[10px] text-muted-foreground px-1">Posición</span>
              <select
                value={value.posicionId || ''}
                disabled={!value.bodegaId}
                onChange={(e) => onChange({ ...value, posicionId: e.target.value, binId: undefined })}
                className="w-full px-2 py-1.5 bg-transparent border border-neu-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50"
              >
                <option value="">Seleccionar...</option>
                {posiciones.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
              </select>
            </div>

            <ChevronRight className="w-4 h-4 text-neu-400 mt-4 hidden sm:block" />

            {/* Bin */}
            <div className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[10px] text-muted-foreground px-1">Bin (Opcional)</span>
              <select
                value={value.binId || ''}
                disabled={!value.posicionId}
                onChange={(e) => onChange({ ...value, binId: e.target.value })}
                className="w-full px-2 py-1.5 bg-transparent border border-neu-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50"
              >
                <option value="">Todo el contenido / Loose</option>
                {bines.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.codigo} {b.es_fijo ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Resumen visual de selección */}
        {(value.bodegaId || value.posicionId || value.binId) && mode === 'selector' && (
          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-neu-200">
            <div className="px-2 py-1 bg-primary-50 text-primary-700 rounded-md text-[10px] font-bold flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {bodegas.find(b => b.id === value.bodegaId)?.nombre || '...'}
            </div>
            {value.posicionId && (
              <div className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                <Box className="w-3 h-3" />
                {posiciones.find(p => p.id === value.posicionId)?.codigo || '...'}
              </div>
            )}
            {value.binId && (
              <div className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                <Package className="w-3 h-3" />
                {bines.find(b => b.id === value.binId)?.codigo || '...'}
                {bines.find(b => b.id === value.binId)?.es_fijo && <span className="ml-1 text-[8px] opacity-70">(FIJO)</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
