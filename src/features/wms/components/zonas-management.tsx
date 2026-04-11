'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  LayoutGrid, 
  MapPin, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  FolderPlus,
  ArrowRight
} from 'lucide-react'
import { getZonasByBodega, crearZona, eliminarZona, asignarPosicionesAZona } from '@/features/wms/services/zonas-actions'
import { getPosicionesByBodega } from '@/features/wms/services/posiciones-actions'
import type { Bodega, Zona, Posicion } from '@/features/wms/types'

interface Props {
  bodegas: Bodega[]
}

export function ZonasManagement({ bodegas }: Props) {
  const [selectedBodegaId, setSelectedBodegaId] = useState<string>(bodegas[0]?.id || '')
  const [zonas, setZonas] = useState<Zona[]>([])
  const [posiciones, setPosiciones] = useState<Posicion[]>([])
  
  const [nuevaZonaStatus, setNuevaZonaStatus] = useState({ nombre: '', loading: false, error: '' })
  const [selectedPosiciones, setSelectedPosiciones] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedBodegaId) {
      cargarData()
    }
  }, [selectedBodegaId])

  const cargarData = async () => {
    setLoading(true)
    const [z, p] = await Promise.all([
      getZonasByBodega(selectedBodegaId),
      getPosicionesByBodega(selectedBodegaId)
    ])
    setZonas(z)
    setPosiciones(p)
    setLoading(false)
  }

  const handleCrearZona = async () => {
    if (!nuevaZonaStatus.nombre.trim()) return
    setNuevaZonaStatus(prev => ({ ...prev, loading: true, error: '' }))
    
    const { error } = await crearZona({
      bodega_id: selectedBodegaId,
      nombre: nuevaZonaStatus.nombre
    })

    if (error) {
      setNuevaZonaStatus(prev => ({ ...prev, loading: false, error }))
    } else {
      setNuevaZonaStatus({ nombre: '', loading: false, error: '' })
      cargarData()
    }
  }

  const handleAsignar = async (zonaId: string) => {
    if (selectedPosiciones.length === 0) return
    setLoading(true)
    const { error } = await asignarPosicionesAZona(zonaId, selectedPosiciones)
    if (!error) {
      setSelectedPosiciones([])
      cargarData()
    }
    setLoading(false)
  }

  const togglePosicion = (id: string) => {
    setSelectedPosiciones(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Selector de Bodega */}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-neu-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-xl">
            <LayoutGrid className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">Gestión de Zonas</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Agrupador de Posiciones</p>
          </div>
        </div>
        
        <select 
          value={selectedBodegaId}
          onChange={(e) => setSelectedBodegaId(e.target.value)}
          className="bg-neu-100 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-primary-300 transition-all"
        >
          {bodegas.map(b => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: Posiciones Disponibles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Posiciones sin Zona / Todas
            </h4>
            <span className="px-2 py-1 bg-neu-200 rounded-lg text-[10px] font-black">{posiciones.length} total</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {posiciones.map(pos => {
              const belongsToZona = zonas.find(z => z.id === pos.zona_id)
              const isSelected = selectedPosiciones.includes(pos.id)
              
              return (
                <button
                  key={pos.id}
                  onClick={() => togglePosicion(pos.id)}
                  className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-left relative group
                    ${isSelected ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-100' : 'border-neu-200 bg-white hover:border-neu-300 shadow-sm'}
                  `}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-[10px] font-black uppercase text-muted-foreground truncate max-w-[100px]">{pos.codigo}</span>
                    {belongsToZona && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase">
                        {belongsToZona.nombre}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-black truncate">{pos.nombre || pos.codigo}</span>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-primary-600" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Columna Derecha: Gestión de Zonas */}
        <div className="space-y-6">
          {/* Nueva Zona Form */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-neu-200 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FolderPlus className="w-4 h-4" />
              Nueva Zona
            </h4>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Nombre de la zona (ej. Picking)"
                value={nuevaZonaStatus.nombre}
                onChange={(e) => setNuevaZonaStatus(prev => ({ ...prev, nombre: e.target.value }))}
                className="flex-1 bg-neu-100 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-300 transition-all"
              />
              <button 
                onClick={handleCrearZona}
                disabled={nuevaZonaStatus.loading || !nuevaZonaStatus.nombre}
                className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {nuevaZonaStatus.error && <p className="text-[10px] font-bold text-red-500 uppercase">{nuevaZonaStatus.error}</p>}
          </div>

          {/* Lista de Zonas */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Zonas Definidas
            </h4>
            
            <div className="space-y-3">
              {zonas.map(zona => (
                <div key={zona.id} className="bg-white border border-neu-200 rounded-3xl p-4 shadow-sm group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-neu-100 rounded-xl group-hover:bg-amber-100 transition-colors">
                        <LayoutGrid className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black">{zona.nombre}</h5>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{zona.codigo}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => eliminarZona(zona.id).then(cargarData)}
                      className="p-2 text-neu-400 hover:text-red-500 hover:bg-neutral-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedPosiciones.length > 0 && (
                    <button
                      onClick={() => handleAsignar(zona.id)}
                      className="w-full py-2 bg-primary-50 text-primary-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-100 transition-all flex items-center justify-center gap-2 border border-dashed border-primary-300"
                    >
                      Asignar {selectedPosiciones.length} posiciones <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              {zonas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic border-2 border-dashed border-neu-200 rounded-3xl space-y-2">
                  <AlertCircle className="w-8 h-8 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No hay zonas creadas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
