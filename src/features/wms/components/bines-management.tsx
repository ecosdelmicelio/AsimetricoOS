'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Layers, 
  MapPin, 
  Trash2, 
  AlertCircle,
  Archive,
  Search
} from 'lucide-react'
import { getBinesByPosicion, crearBin, eliminarBin } from '@/features/bines/services/bines-actions'
import { getPosicionesByBodega } from '@/features/wms/services/posiciones-actions'
import type { Bodega, Posicion } from '@/features/wms/types'
import type { Bin } from '@/features/bines/types'

interface Props {
  bodegas: Bodega[]
}

export function BinesManagement({ bodegas }: Props) {
  const [selectedBodegaId, setSelectedBodegaId] = useState<string>(bodegas[0]?.id || '')
  const [posiciones, setPosiciones] = useState<Posicion[]>([])
  const [selectedPosicionId, setSelectedPosicionId] = useState<string>('')
  const [bines, setBines] = useState<Bin[]>([])
  
  const [nuevoBin, setNuevoBin] = useState({ 
    codigo: '', 
    sufijo: '',
    esFijo: false,
    loading: false, 
    error: '' 
  })
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (selectedBodegaId) {
      cargarPosiciones()
    }
  }, [selectedBodegaId])

  useEffect(() => {
    if (selectedPosicionId) {
      cargarBines()
    } else {
      setBines([])
    }
  }, [selectedPosicionId])

  const cargarPosiciones = async () => {
    setLoading(true)
    const p = await getPosicionesByBodega(selectedBodegaId)
    setPosiciones(p)
    if (p.length > 0) {
      setSelectedPosicionId(p[0].id)
    } else {
      setSelectedPosicionId('')
    }
    setLoading(false)
  }

  const cargarBines = async () => {
    setLoading(true)
    const b = await getBinesByPosicion(selectedPosicionId)
    setBines(b)
    setLoading(false)
  }

  const handleCrearBin = async () => {
    if (!selectedPosicionId) return
    setNuevoBin(prev => ({ ...prev, loading: true, error: '' }))
    
    // Si hay sufijo, construimos el código manual [POSICION]-[SUFIJO]
    let codigoFinal = nuevoBin.codigo || undefined
    if (nuevoBin.sufijo.trim()) {
      const pos = posiciones.find(p => p.id === selectedPosicionId)
      codigoFinal = `${pos?.codigo || 'BN'}-${nuevoBin.sufijo.trim().toUpperCase()}`
    }

    const { error } = await crearBin(selectedPosicionId, codigoFinal, 'interno', nuevoBin.esFijo)

    if (error) {
      setNuevoBin(prev => ({ ...prev, loading: false, error }))
    } else {
      setNuevoBin({ codigo: '', sufijo: '', esFijo: false, loading: false, error: '' })
      cargarBines()
    }
  }

  const handleEliminar = async (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este bin? No debe tener stock.')) {
      const { error } = await eliminarBin(id)
      if (error) alert(error)
      else cargarBines()
    }
  }

  const filteredPosiciones = posiciones.filter(p => 
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Cabecera y Selector de Bodega */}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-neu-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-xl">
            <Layers className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">Gestión de Bines</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Ubicaciones Finales de Stock</p>
          </div>
        </div>
        
        <select 
          value={selectedBodegaId}
          onChange={(e) => setSelectedBodegaId(e.target.value)}
          className="bg-neu-100 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-primary-300 transition-all font-inter"
        >
          {bodegas.map(b => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda: Selector de Posición (4/12) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Buscar posición..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-neu-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-300 transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredPosiciones.map(pos => (
              <button
                key={pos.id}
                onClick={() => setSelectedPosicionId(pos.id)}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left
                  ${selectedPosicionId === pos.id 
                    ? 'border-primary-500 bg-primary-100/50 shadow-md ring-4 ring-primary-100' 
                    : 'border-white bg-white hover:border-neu-200 shadow-sm'}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg ${selectedPosicionId === pos.id ? 'bg-primary-600 text-white' : 'bg-neu-100 text-muted-foreground'}`}>
                    <MapPin className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-black truncate ${selectedPosicionId === pos.id ? 'text-primary-800' : 'text-foreground'}`}>
                      {pos.nombre || pos.codigo}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 truncate">{pos.codigo}</p>
                  </div>
                </div>
              </button>
            ))}
            {filteredPosiciones.length === 0 && (
              <p className="text-center py-8 text-xs text-muted-foreground italic">No se encontraron posiciones</p>
            )}
          </div>
        </div>

        {/* Columna Derecha: Bines y Formulario (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedPosicionId ? (
            <>
              {/* Formulario Nuevo Bin */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-neu-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    Nuevo Bin en esta Posición
                  </h4>
                </div>
                          <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sufijo Descriptivo (Opcional)</label>
                      <input 
                        type="text"
                        placeholder="Ej. HILOS, ETIQUETAS, TALLA-S"
                        value={nuevoBin.sufijo}
                        onChange={(e) => setNuevoBin(prev => ({ ...prev, sufijo: e.target.value, codigo: '' }))}
                        className="w-full bg-neu-100 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-300 transition-all font-inter"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Código Manual (Ocupa todo)</label>
                      <input 
                        type="text"
                        placeholder="Ej. BIN-PROPIO-01"
                        value={nuevoBin.codigo}
                        onChange={(e) => setNuevoBin(prev => ({ ...prev, codigo: e.target.value, sufijo: '' }))}
                        className="w-full bg-neu-100 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-300 transition-all font-inter"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-neu-50 p-4 rounded-2xl border border-dashed border-neu-300">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Vista Previa Código</span>
                        <code className="text-sm font-black text-primary-600 bg-white px-3 py-1 rounded-lg border border-neu-200">
                          {nuevoBin.codigo ? nuevoBin.codigo.toUpperCase() : (
                            nuevoBin.sufijo ? `${posiciones.find(p => p.id === selectedPosicionId)?.codigo}-${nuevoBin.sufijo.toUpperCase()}` : '[POSICIÓN]-00X'
                          )}
                        </code>
                      </div>

                      <div className="w-px h-8 bg-neu-200" />

                      <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border-2 border-slate-200 cursor-pointer select-none"
                        onClick={() => setNuevoBin(prev => ({ ...prev, esFijo: !prev.esFijo }))}
                      >
                        <div className={`w-10 h-5 rounded-full relative transition-all duration-300 border-2 ${nuevoBin.esFijo ? 'bg-primary-600 border-primary-700' : 'bg-slate-500 border-slate-600'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-300 ${nuevoBin.esFijo ? 'right-0.5' : 'left-0.5'}`} />
                        </div>
                        <span className={`text-[10px] font-black uppercase ${nuevoBin.esFijo ? 'text-primary-700' : 'text-slate-700'}`}>
                          {nuevoBin.esFijo ? 'Fijo' : 'Variable'}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={handleCrearBin}
                      disabled={nuevoBin.loading}
                      className="w-full md:w-auto px-12 py-3 bg-primary-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-primary-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {nuevoBin.loading ? 'Procesando...' : (
                        <>
                          <Plus className="w-4 h-4" />
                          Crear Bin
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {nuevoBin.error && <p className="text-[10px] font-bold text-red-500 uppercase mt-2">{nuevoBin.error}</p>}
                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mt-4">
                  Nota: Al crear un bin, se le asigna stock "interno" automáticamente.
                </p>
              </div>

              {/* Lista de Bines */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <Layers className="w-4 h-4" />
                  Bines Existentes ({bines.length})
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bines.map(bin => (
                    <div key={bin.id} className="bg-white border border-neu-200 rounded-2xl p-4 shadow-sm group hover:shadow-md transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-neu-100 rounded-xl flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                          <Archive className="w-5 h-5 text-neu-400 group-hover:text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground">{bin.codigo}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                              Stock: {bin.stock_tipo || 'interno'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${bin.es_fijo ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {bin.es_fijo ? 'Fijo' : 'Variable'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleEliminar(bin.id)}
                        className="p-2 text-neu-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {bines.length === 0 && !loading && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white border-2 border-dashed border-neu-200 rounded-3xl text-muted-foreground opacity-50 space-y-3">
                      <AlertCircle className="w-12 h-12" />
                      <p className="text-xs font-black uppercase tracking-widest">Esta posición no tiene bines configurados</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white border-2 border-dashed border-neu-200 rounded-3xl p-12 text-muted-foreground opacity-50 space-y-4">
              <MapPin className="w-16 h-16" />
              <div className="text-center">
                <h4 className="text-sm font-black uppercase tracking-widest mb-1">Selecciona una posición</h4>
                <p className="text-xs">Usa la columna izquierda para ver o crear bines en una ubicación específica</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
