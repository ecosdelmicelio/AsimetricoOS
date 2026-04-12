'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  Map, 
  MapPin, 
  Box, 
  Plus, 
  ChevronRight, 
  Search,
  Trash2,
  Archive,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'
import { getBodegas, createBodega } from '@/features/wms/services/bodegas-actions'
import { getZonasByBodega, crearZona } from '@/features/wms/services/zonas-actions'
import { getPosicionesByZona, crearPosicion } from '@/features/wms/services/posiciones-actions'
import { getBinesByPosicion, crearBin, eliminarBin } from '@/features/bines/services/bines-actions'
import type { Bodega, Zona, Posicion } from '@/features/wms/types'
import type { Bin } from '@/features/bines/types'

export function BodegaLocationsMaster() {
  // --- ESTADOS DE DATOS ---
  const [bodegas, setBodegas] = useState<Bodega[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [posiciones, setPosiciones] = useState<Posicion[]>([])
  const [bines, setBines] = useState<Bin[]>([])
  const [productos, setProductos] = useState<any[]>([])

  // --- ESTADOS DE SELECCIÓN ---
  const [selBodegaId, setSelBodegaId] = useState<string>('')
  const [selZonaId, setSelZonaId] = useState<string>('')
  const [selPosicionId, setSelPosicionId] = useState<string>('')

  // --- ESTADOS DE UI ---
  const [loading, setLoading] = useState(false)
  const [showForms, setShowForms] = useState({ bodega: false, zona: false, posicion: false })
  const [prodSearch, setProdSearch] = useState('')
  const [newNames, setNewNames] = useState({ 
    bodega: '', 
    zona: '', 
    posicion: '', 
    binSufijo: '', 
    binFijo: false,
    productoSeleccionado: null as any
  })

  // --- EFECTOS PARA CARGAR DATOS EN CASCADA ---
  useEffect(() => { cargarBodegas() }, [])

  useEffect(() => {
    if (selBodegaId) {
      cargarZonas(selBodegaId)
      setSelZonaId('')
      setPosiciones([])
      setBines([])
      setSelPosicionId('')
    }
  }, [selBodegaId])

  useEffect(() => {
    if (selZonaId) {
      cargarPosiciones(selZonaId)
      setSelPosicionId('')
      setBines([])
    }
  }, [selZonaId])

  useEffect(() => {
    if (selPosicionId) {
      cargarBines(selPosicionId)
    }
  }, [selPosicionId])

  // --- FUNCIONES DE CARGA ---
  const cargarBodegas = async () => {
    const data = await getBodegas()
    setBodegas(data)
    if (data.length > 0 && !selBodegaId) setSelBodegaId(data[0].id)
  }

  const cargarZonas = async (bid: string) => {
    setLoading(true)
    const data = await getZonasByBodega(bid)
    setZonas(data)
    setLoading(false)
  }

  const cargarPosiciones = async (zid: string) => {
    setLoading(true)
    const data = await getPosicionesByZona(zid)
    setPosiciones(data)
    setLoading(false)
  }

  const cargarBines = async (pid: string) => {
    const data = await getBinesByPosicion(pid)
    setBines(data)
  }

  // --- ACCIONES DE CREACIÓN ---
  const handleCreateBodega = async () => {
    if (!newNames.bodega) return
    const { data, error } = await createBodega({ nombre: newNames.bodega, tipo: 'principal' })
    if (error) alert(error)
    else {
      await cargarBodegas()
      setNewNames(prev => ({ ...prev, bodega: '' }))
      setShowForms(prev => ({ ...prev, bodega: false }))
      if (data) setSelBodegaId(data.id)
    }
  }

  const handleCreateZona = async () => {
    if (!newNames.zona || !selBodegaId) return
    const { error } = await crearZona({ nombre: newNames.zona, bodega_id: selBodegaId })
    if (error) alert(error)
    else {
      await cargarZonas(selBodegaId)
      setNewNames(prev => ({ ...prev, zona: '' }))
      setShowForms(prev => ({ ...prev, zona: false }))
    }
  }

  const handleCreatePosicion = async () => {
    if (!newNames.posicion || !selZonaId || !selBodegaId) return
    const { error } = await crearPosicion({ 
      nombre: newNames.posicion, 
      zona_id: selZonaId,
      bodega_id: selBodegaId 
    })
    if (error) alert(error)
    else {
      await cargarPosiciones(selZonaId)
      setNewNames(prev => ({ ...prev, posicion: '' }))
      setShowForms(prev => ({ ...prev, posicion: false }))
    }
  }

  const handleCreateBin = async () => {
    if (!selPosicionId) return
    let codigoFinal = undefined
    const sufijo = newNames.productoSeleccionado?.referencia || newNames.binSufijo
    if (sufijo.trim()) {
      const pos = posiciones.find(p => p.id === selPosicionId)
      codigoFinal = `${pos?.codigo || 'BN'}-${sufijo.trim().toUpperCase()}`
    }

    const { error } = await crearBin(selPosicionId, codigoFinal, 'interno', newNames.binFijo)
    if (error) alert(error)
    else {
      await cargarBines(selPosicionId)
      setNewNames(prev => ({ ...prev, binSufijo: '', binFijo: false, productoSeleccionado: null }))
      setProdSearch('')
    }
  }

  const buscarProductos = async (query: string) => {
    if (!query) return setProductos([])
    const { createClient } = await import('@/shared/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase
      .from('productos')
      .select('id, referencia, nombre')
      .or(`referencia.ilike.%${query}%,nombre.ilike.%${query}%`)
      .limit(5)
    setProductos(data ?? [])
  }

  const posSeleccionada = posiciones.find(p => p.id === selPosicionId)

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-6 gap-6 font-inter overflow-hidden">
      {/* Header Unificado */}
      <div className="flex items-center justify-between bg-white p-4 rounded-[24px] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-600 rounded-xl shadow-lg shadow-primary-100">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">Cerebro de Infraestructura</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Operativo en Tiempo Real
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-4 text-slate-400 px-4 py-2 border-r border-slate-100">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase">{bodegas.length}</p>
              <p className="text-[8px] font-bold">Bodegas</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black uppercase">{zonas.length}</p>
              <p className="text-[8px] font-bold">Zonas</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest">Asimetrico OS</span>
             <span className="text-[8px] font-bold text-slate-400">Layout Manager V3</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 min-h-0">
        
        {/* COL 1: Bodegas */}
        <div className="md:col-span-2 flex flex-col gap-3 bg-white/50 rounded-[32px] border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bodegas</h3>
            <button 
              onClick={() => setShowForms({...showForms, bodega: !showForms.bodega})} 
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-600 text-white rounded-xl text-[8px] font-black uppercase shadow-md shadow-primary-100 hover:bg-primary-700 active:scale-95 transition-all"
            >
              <Plus className="w-3 h-3" /> Nueva
            </button>
          </div>
          {showForms.bodega && (
            <div className="p-2 bg-white rounded-xl border border-primary-100 shadow-sm flex flex-col gap-2">
              <input 
                autoFocus
                type="text"
                placeholder="Nombre..."
                className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                value={newNames.bodega}
                onChange={e => setNewNames({...newNames, bodega: e.target.value})}
              />
              <button onClick={handleCreateBodega} className="w-full h-7 bg-primary-600 text-white rounded-lg text-[10px] font-black uppercase">Crear</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
            {bodegas.map(b => (
              <button 
                key={b.id}
                onClick={() => setSelBodegaId(b.id)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group ${selBodegaId === b.id ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <p className="text-[10px] font-black tracking-tight truncate">{b.nombre}</p>
                {selBodegaId === b.id && <ChevronRight className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* COL 2: Zonas */}
        <div className="md:col-span-2 flex flex-col gap-3 bg-white/50 rounded-[32px] border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Zonas</h3>
            <button 
              onClick={() => setShowForms({...showForms, zona: !showForms.zona})} 
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 text-white rounded-xl text-[8px] font-black uppercase shadow-md hover:bg-black active:scale-95 transition-all"
              disabled={!selBodegaId}
            >
              <Plus className="w-3 h-3" /> Nueva
            </button>
          </div>
          {showForms.zona && (
            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <input 
                autoFocus
                type="text"
                placeholder="Nombre..."
                className="w-full bg-slate-50 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                value={newNames.zona}
                onChange={e => setNewNames({...newNames, zona: e.target.value})}
              />
              <button onClick={handleCreateZona} className="w-full h-7 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase">Añadir</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
            {!selBodegaId ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20"><Map className="w-8 h-8" /></div>
            ) : zonas.map(z => (
              <button 
                key={z.id}
                onClick={() => setSelZonaId(z.id)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group ${selZonaId === z.id ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <p className="text-[10px] font-black tracking-tight truncate">{z.nombre}</p>
                {selZonaId === z.id && <ChevronRight className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* COL 3 & 4 (Detalle Maestro): Posiciones y Bines */}
        <div className="md:col-span-8 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          
          {/* SubCol: Lista de Posiciones (4/12) */}
          <div className="lg:col-span-4 flex flex-col gap-4 bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-[10px] font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-500" /> Posiciones
              </h3>
              <button 
                onClick={() => setShowForms({...showForms, posicion: !showForms.posicion})}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-xl text-[9px] font-black uppercase"
                disabled={!selZonaId}
              >
                <Plus className="w-3 h-3" /> Nueva
              </button>
            </div>

            {showForms.posicion && (
              <div className="p-3 bg-primary-50 rounded-2xl border-2 border-dashed border-primary-200 mb-2">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Ej. Estante A1..."
                  className="w-full bg-white border border-primary-100 rounded-lg px-3 py-2 text-xs font-bold outline-none mb-2"
                  value={newNames.posicion}
                  onChange={e => setNewNames({...newNames, posicion: e.target.value})}
                />
                <button onClick={handleCreatePosicion} className="w-full py-1.5 bg-primary-600 text-white rounded-lg text-[9px] font-black uppercase">Confirmar Posición</button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {!selZonaId ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 py-10"><MapPin className="w-16 h-16" /></div>
              ) : posiciones.map(pos => (
                <button 
                  key={pos.id}
                  onClick={() => setSelPosicionId(pos.id)}
                  className={`w-full p-4 rounded-3xl border transition-all text-left flex items-center justify-between group ${selPosicionId === pos.id ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-100' : 'bg-white border-slate-100 hover:border-primary-200'}`}
                >
                  <div>
                    <p className="text-[11px] font-black text-slate-800">{pos.nombre || pos.codigo}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{pos.codigo}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-all ${selPosicionId === pos.id ? 'translate-x-1 text-primary-500' : 'opacity-20 group-hover:opacity-100'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* SubCol: Detalle de Bines (8/12 - El Corazón) */}
          <div className="lg:col-span-8 flex flex-col gap-4 bg-slate-900 rounded-[32px] p-6 shadow-2xl relative overflow-hidden group">
            {/* Decoración Fondo */}
            <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-primary-600/10 rounded-full blur-3xl transition-all group-hover:bg-primary-600/20" />
            
            {!selPosicionId ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
                  <Archive className="w-10 h-10 text-slate-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Selecciona una Posición</h4>
                  <p className="text-[10px] opacity-60 px-6">Para empezar a bautizar y gestionar bines fijos o variables.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-xl">
                      <Box className="w-4 h-4 text-primary-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{posSeleccionada?.nombre}</h4>
                      <div className="flex items-center gap-2">
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">ID: {posSeleccionada?.codigo}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-700" />
                         <span className="text-[8px] font-black text-primary-500 uppercase tracking-widest">{bines.length} BINES TOTALES</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formulario de Creación con Cerebro */}
                <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-3xl border border-slate-700 space-y-4 shadow-xl">
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Buscador de Productos */}
                      <div className="space-y-2 relative">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Bautizar Bin (Sufijo o Producto)</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                            type="text"
                            placeholder="Buscar producto..."
                            value={prodSearch || newNames.binSufijo}
                            onChange={e => {
                              setProdSearch(e.target.value)
                              setNewNames({...newNames, binSufijo: e.target.value, productoSeleccionado: null})
                              buscarProductos(e.target.value)
                            }}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                          />
                        </div>
                        
                        {productos.length > 0 && (
                          <div className="absolute z-30 w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl mt-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-2 border-b border-slate-800 flex justify-between items-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase">Resultados</span>
                              <button onClick={() => setProductos([])} className="text-[8px] font-bold text-primary-500 hover:text-primary-400">Cerrar</button>
                            </div>
                            {productos.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => {
                                  setNewNames({...newNames, productoSeleccionado: p, binSufijo: p.referencia})
                                  setProdSearch(p.nombre)
                                  setProductos([])
                                }}
                                className="w-full px-4 py-3 text-left text-[10px] font-bold hover:bg-primary-600/20 border-b border-slate-800 last:border-none group/item flex items-center justify-between"
                              >
                                <div className="flex flex-col">
                                  <span className="text-primary-400 group-hover/item:text-primary-300">{p.referencia}</span>
                                  <span className="text-slate-400 text-[9px] truncate max-w-[150px]">{p.nombre}</span>
                                </div>
                                <ExternalLink className="w-3 h-3 text-slate-600 opacity-0 group-hover/item:opacity-100 transition-all" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Toggle Fijo/Variable Pro */}
                      <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-700 cursor-pointer group/toggle"
                        onClick={() => setNewNames(prev => ({ ...prev, binFijo: !prev.binFijo }))}
                      >
                        <div className={`w-12 h-6 rounded-full relative transition-all duration-300 border-2 ${newNames.binFijo ? 'bg-amber-600 border-amber-500' : 'bg-slate-600 border-slate-500'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-300 ${newNames.binFijo ? 'right-1' : 'left-1'}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[10px] font-black uppercase ${newNames.binFijo ? 'text-amber-500' : 'text-slate-300'}`}>
                            {newNames.binFijo ? 'Es Bin Fijo' : 'Bin Variable'}
                          </span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{newNames.binFijo ? 'Pertenencia Permanente' : 'Contenedor Temporal'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Creacion con Preview */}
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-700">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase">Vista Previa Código</span>
                        <code className="text-xs font-black text-primary-400">
                          {posSeleccionada?.codigo}-{(newNames.productoSeleccionado?.referencia || newNames.binSufijo || '00X').toUpperCase()}
                        </code>
                      </div>

                      <button 
                        onClick={handleCreateBin}
                        className="px-8 py-3 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-900/20 active:scale-95 transition-all"
                      >
                        Crear Bin
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Bines en modo Dark Pro */}
                <div className="flex-1 overflow-y-auto space-y-2 mt-4 custom-scrollbar-dark pr-1">
                  <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                    Bines en este Estante <span className="w-1.5 h-1.5 rounded-full bg-slate-700" /> {bines.length}
                  </h5>
                  <div className="grid grid-cols-1 gap-2">
                    {bines.map(bin => (
                      <div key={bin.id} className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700 rounded-2xl group hover:bg-slate-800 hover:border-slate-500 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${bin.es_fijo ? 'bg-amber-900/20 border-amber-900/50 text-amber-500' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}>
                            <Box className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-100">{bin.codigo}</p>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${bin.es_fijo ? 'bg-amber-900/40 border-amber-700/50 text-amber-500' : 'bg-blue-900/40 border-blue-700/50 text-blue-400'} uppercase`}>
                              {bin.es_fijo ? 'Fijo' : 'Variable'}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if(confirm('¿Eliminar este bin?')) eliminarBin(bin.id).then(() => cargarBines(selPosicionId))
                          }}
                          className="p-2 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {bines.length === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-[32px] opacity-30 text-slate-500">
                        <Archive className="w-10 h-10 mb-2" />
                        <p className="text-[10px] font-black uppercase">Sin bines asignados</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  )
}
