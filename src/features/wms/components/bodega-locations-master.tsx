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
  Package,
  SlidersHorizontal,
  ShoppingCart,
  CheckCircle2,
  ExternalLink,
  Wrench,
  SquareArrowOutUpRight,
  AlertCircle,
  Eye,
  Grid3X3,
  List,
  ArrowRightLeft
} from 'lucide-react'
import { 
  getCenterPendingPurchases, 
  getWarehouseStats, 
  getZoneStats,
  getPositionStats, 
  processUnifiedMovement 
} from '@/features/wms/services/center-actions'
import { BinMovementModal } from './bin-movement-modal'
import { BinAdjustmentModal } from './bin-adjustment-modal'
import { TransferConfirmationModal } from './transfer-confirmation-modal'
import { BinToBinTransferModal } from './bin-to-bin-modal'
import { ConfirmActionModal } from './confirm-action-modal'
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

  // --- ESTADOS DE UI & OPERACIÓN ---
  const [mode, setMode] = useState<'DISE\u00D1O' | 'OPERACI\u00D3N'>('OPERACI\u00D3N')
  const [activeOC, setActiveOC] = useState<any>(null)
  const [pendientes, setPendientes] = useState<any[]>([])
  const [transferSource, setTransferSource] = useState<any>(null)
  const [suggestedPos, setSuggestedPos] = useState<string[]>([])
  const [adjustmentTarget, setAdjustmentTarget] = useState<any | null>(null)
  const [confirmDeleteBin, setConfirmDeleteBin] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedback, setFeedback] = useState<{ title: string, description: string, variant: 'danger' | 'warning' | 'info' } | null>(null)
  const [confirmTransfer, setConfirmTransfer] = useState<{ source: any, target: any } | null>(null)
  const [expandedBinId, setExpandedBinId] = useState<string | null>(null)
  const [binContents, setBinContents] = useState<Record<string, any[]>>({})
  const [binToBinTarget, setBinToBinTarget] = useState<any | null>(null)
  const [bodegaStats, setBodegaStats] = useState<Record<string, { units: number, value: number, capacity: number, occupied: number }>>({})
  const [zonaStats, setZonaStats] = useState<Record<string, { capacity: number, occupied: number }>>({})
  const [posicionStats, setPosicionStats] = useState<Record<string, { units: number, value: number, capacity: number, occupied: number }>>({})
  
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTargetBin, setModalTargetBin] = useState<any>(null)
  
  const [loading, setLoading] = useState(false)
  const [showForms, setShowForms] = useState({ bodega: false, zona: false, posicion: false })
  const [prodSearch, setProdSearch] = useState('')
  const [newNames, setNewNames] = useState({ 
    bodega: '', 
    zona: '', 
    posicion: '', 
    posicionCapacidad: 4,
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
      cargarPosicionStats(selPosicionId)
    }
  }, [selPosicionId])

  useEffect(() => {
    if (mode === 'OPERACIÓN' && selBodegaId) {
      cargarPendientes()
    }
    // Limpiar estados de transferencia al cambiar de modo
    if (mode === 'DISEÑO') {
      setTransferSource(null)
      setSuggestedPos([])
    }
  }, [mode, selBodegaId])

  useEffect(() => {
    const handlePartialTransfer = (e: any) => {
      const { sourceBin, targetPos } = e.detail;
      setTransferSource(sourceBin);
      // Creamos un bin virtual o usamos el de la posición si existe
      setBinToBinTarget({ 
        id: `NEW_BIN|${targetPos.id}|${targetPos.nombre || targetPos.codigo}`, 
        codigo: 'NUEVO CONTENEDOR',
        bodega_id: selBodegaId 
      });
    };

    window.addEventListener('OPEN_PARTIAL_TRANSFER', handlePartialTransfer);
    return () => window.removeEventListener('OPEN_PARTIAL_TRANSFER', handlePartialTransfer);
  }, [selBodegaId]);

  // --- FUNCIONES DE CARGA ---
  const cargarPendientes = async () => {
    const { getCenterPendingOperations } = await import('@/features/wms/services/center-actions')
    const data = await getCenterPendingOperations(selBodegaId)
    setPendientes(data)
  }

  const cargarWarehouseStats = async (bid: string) => {
    if (!bid) return
    const s = await getWarehouseStats(bid)
    setBodegaStats(prev => ({ ...prev, [bid]: { units: s.totalUnits, value: s.totalValue, capacity: s.capacity, occupied: s.occupied } }))
  }

  const cargarZoneStats = async (zid: string) => {
    if (!zid) return
    const s = await getZoneStats(zid)
    setZonaStats(prev => ({ ...prev, [zid]: { capacity: s.capacity, occupied: s.occupied } }))
  }

  const cargarPosicionStats = async (pid: string) => {
    if (!pid) return
    const s = await getPositionStats(pid)
    setPosicionStats(prev => ({ ...prev, [pid]: { units: s.totalUnits, value: s.totalValue, capacity: s.capacity, occupied: s.occupied } }))
  }
  
  const cargarBodegas = async () => {
    setLoading(true)
    const { getBodegas } = await import('@/features/wms/services/bodegas-actions')
    const data = await getBodegas()
    setBodegas(data)
    
    // Cargar stats para todas las bodegas
    data.forEach(b => cargarWarehouseStats(b.id))
    
    if (data.length > 0 && !selBodegaId) setSelBodegaId(data[0].id)
    setLoading(false)
  }

  const cargarZonas = async (bid: string) => {
    const { getZonasByBodega } = await import('@/features/wms/services/zonas-actions')
    const data = await getZonasByBodega(bid)
    setZonas(data)
    
    // Cargar stats para cada zona
    data.forEach(z => cargarZoneStats(z.id))
  }

  const cargarPosiciones = async (zid: string) => {
    const { getPosicionesByZona } = await import('@/features/wms/services/posiciones-actions')
    const data = await getPosicionesByZona(zid)
    setPosiciones(data)
    
    // Cargar stats para cada posición
    data.forEach(p => cargarPosicionStats(p.id))
  }

  const cargarBines = async (pid: string) => {
    const { getBinesByPosicion } = await import('@/features/bines/services/bines-actions')
    const { getBinItemsGrid } = await import('@/features/wms/services/center-actions')
    const data = await getBinesByPosicion(pid)
    setBines(data)

    // AUTO-CARGAR CONTENIDO SIEMPRE (X-RAY MODE)
    data.forEach(async (bin) => {
      const items = await getBinItemsGrid(bin.id)
      setBinContents(prev => ({ ...prev, [bin.id]: items }))
    })
  }

  const handleStartTransfer = async (bin: any) => {
    setTransferSource(bin)
    const { getSugerenciaPosicionInteligente } = await import('@/features/wms/services/posiciones-actions')
    const { data } = await getSugerenciaPosicionInteligente(selBodegaId, bin.id)
    setSuggestedPos(data || [])
  }

  const handleConfirmTransfer = (targetPos: any) => {
    if (!transferSource) return
    setConfirmTransfer({ source: transferSource, target: targetPos })
  }

  // --- EVENT HANDLERS (Iguales logicamente, solo limpieza) ---
  const handleCreateBodega = async () => {
    if (!newNames.bodega) return
    const { createBodega } = await import('@/features/wms/services/bodegas-actions')
    const { data, error } = await createBodega({ nombre: newNames.bodega, tipo: 'principal' })
    if (error) setFeedback({ title: 'Error al Crear Bodega', description: error, variant: 'danger' })
    else {
      await cargarBodegas()
      setNewNames(prev => ({ ...prev, bodega: '' }))
      setShowForms(prev => ({ ...prev, bodega: false }))
      if (data) setSelBodegaId(data.id)
    }
  }

  const handleCreateZona = async () => {
    if (!newNames.zona || !selBodegaId) return
    const { crearZona } = await import('@/features/wms/services/zonas-actions')
    const { error } = await crearZona({ nombre: newNames.zona, bodega_id: selBodegaId })
    if (error) setFeedback({ title: 'Error al Crear Zona', description: error, variant: 'danger' })
    else {
      await cargarZonas(selBodegaId)
      setNewNames(prev => ({ ...prev, zona: '' }))
      setShowForms(prev => ({ ...prev, zona: false }))
    }
  }

  const handleCreatePosicion = async () => {
    if (!newNames.posicion || !selZonaId || !selBodegaId) return
    const { crearPosicion } = await import('@/features/wms/services/posiciones-actions')
    const { error } = await crearPosicion({ 
      nombre: newNames.posicion, 
      zona_id: selZonaId,
      bodega_id: selBodegaId,
      capacidad_bines: newNames.posicionCapacidad || 4
    })
    if (error) setFeedback({ title: 'Error al Crear Posición', description: error, variant: 'danger' })
    else {
      await cargarPosiciones(selZonaId)
      setNewNames(prev => ({ ...prev, posicion: '' }))
      setShowForms(prev => ({ ...prev, posicion: false }))
    }
  }

  const handleCreateBin = async () => {
    const { crearBin } = await import('@/features/bines/services/bines-actions')
    if (!selPosicionId) return
    let codigoFinal = undefined
    const baseCode = activeOC ? activeOC.codigo : (posiciones.find(p => p.id === selPosicionId)?.codigo || 'BN')
    
    // Safely get the suffix and trim
    const rawSufijo = newNames.productoSeleccionado?.referencia || newNames.binSufijo || ''
    const sufijo = rawSufijo.trim()
    
    if (sufijo) {
      codigoFinal = `${baseCode}-${sufijo.toUpperCase()}`
    } else if (activeOC) {
      // Automatic generation with 4-digit timestamp suffix for uniqueness
      codigoFinal = `${activeOC.codigo}-${Date.now().toString().slice(-4)}`
    }

    const { error, data } = await crearBin(
      selPosicionId,
      codigoFinal,
      'interno',
      newNames.binFijo || false
    )
    if (error) setFeedback({ title: 'Límite de Aforo', description: error, variant: 'danger' })
    else {
      await cargarBines(selPosicionId)
      setNewNames(prev => ({ ...prev, binSufijo: '', binFijo: false, productoSeleccionado: null }))
      setProdSearch('')
      
      if (activeOC && data) {
        setModalTargetBin(data)
        setModalOpen(true)
      }
    }
  }

  const handleEliminarBin = (id: string) => {
    setConfirmDeleteBin(id)
  }

  const execDeleteBin = async () => {
    if (!confirmDeleteBin) return
    setIsDeleting(true)
    try {
      const { eliminarBin } = await import('@/features/bines/services/bines-actions')
      const { error } = await eliminarBin(confirmDeleteBin)
      if (error) setFeedback({ title: 'Error al Eliminar', description: error, variant: 'danger' })
      else {
        setConfirmDeleteBin(null) // Cerrar inmediatamente
        await Promise.all([
          cargarBines(selPosicionId),
          cargarPosicionStats(selPosicionId),
          cargarWarehouseStats(selBodegaId)
        ])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleBinExpansion = async (binId: string) => {
    if (expandedBinId === binId) {
      setExpandedBinId(null)
      return
    }
    setExpandedBinId(binId)
    if (!binContents[binId]) {
      const { getBinItemsGrid } = await import('@/features/wms/services/center-actions')
      const items = await getBinItemsGrid(binId)
      setBinContents(prev => ({ ...prev, [binId]: items }))
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

  // --- COMPONENTE INTERNO: BARRA DE CAPACIDAD ---
  const CapacityBar = ({ occupied, capacity, className = "" }: { occupied: number, capacity: number, className?: string }) => {
    const pct = capacity > 0 ? Math.min(100, (occupied / capacity) * 100) : 0
    let color = 'bg-emerald-500'
    if (pct >= 90) color = 'bg-red-500'
    else if (pct >= 70) color = 'bg-amber-500'

    return (
      <div className={`w-full h-1 bg-slate-100 rounded-full overflow-hidden ${className}`}>
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] p-4 gap-4 font-inter overflow-hidden select-none">
      
      {/* HEADER SUPER COMPACTO */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-[28px] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-800 leading-none">WMS Espacial</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Digital Twin Active</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-[16px]">
            <button 
              onClick={() => setMode('OPERACI\u00D3N')}
              className={`px-6 py-2 rounded-[12px] text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'OPERACI\u00D3N' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Package className="w-3.5 h-3.5" /> Operación
            </button>
            <button 
              onClick={() => setMode('DISE\u00D1O')}
              className={`px-6 py-2 rounded-[12px] text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'DISE\u00D1O' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Diseño
            </button>
          </div>
        </div>
      </div>

      {/* BANNER DE TRASLADO ACTIVO */}
      {transferSource && (
        <div className="bg-primary-600 px-6 py-3 rounded-[24px] shadow-lg shadow-primary-200 border border-primary-500 animate-in slide-in-from-top-4 duration-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary-100 uppercase tracking-widest leading-none">Traslado en Curso</p>
              <h4 className="text-sm font-black text-white mt-1">Origen: {transferSource.codigo}</h4>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <p className="hidden md:block text-[10px] font-bold text-primary-100 uppercase italic">Seleccione un bin destino para mover unidades o una posición vacía para mover el bulto completo.</p>
            <button 
              onClick={() => { setTransferSource(null); setSuggestedPos([]); }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/20"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD GRID 100% VIEWPORT */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        
        {/* COL 0: PENDIENTES (18%) */}
        <div className="w-[18%] flex flex-col bg-white/60 backdrop-blur-md rounded-[32px] border border-slate-200 p-4 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 flex items-center gap-2">
               <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" /> Tráfico Entrante
            </h3>
            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{pendientes.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {pendientes.map(item => {
              const isOC = item.tipo === 'OC'
              const bgActive = isOC ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-100' : 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-100'
              const codeColor = isOC ? 'text-amber-600' : 'text-blue-600'
              
              return (
                <button 
                  key={item.id}
                  onClick={() => setActiveOC(activeOC?.id === item.id ? null : item)}
                  className={`w-full p-3 rounded-[20px] text-left border transition-all flex flex-col gap-1 ${activeOC?.id === item.id ? bgActive : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <p className={`text-[10px] font-black ${activeOC?.id === item.id ? codeColor : 'text-slate-800'}`}>{item.codigo}</p>
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${isOC ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isOC ? 'COMPRA' : 'TRASLADO'}
                    </span>
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 mt-0.5 truncate uppercase">
                    {item.sublabel_formatted?.split('|')[0] || item.sublabel_formatted}
                  </p>
                </button>
              )
            })}
            {pendientes.length === 0 && <div className="h-20 flex items-center justify-center opacity-20"><Search className="w-8 h-8" /></div>}
          </div>
        </div>

        {/* COL 1: BODEGAS (14%) - Tactal icons stacked vertically */}
        <div className="w-[14%] flex flex-col bg-white/40 rounded-[32px] border border-slate-200 p-3 shadow-sm overflow-hidden">
           <div className="flex items-center justify-between mb-4 px-2">
             <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Bodegas</h3>
             <button onClick={() => setShowForms({...showForms, bodega: !showForms.bodega})} className="p-1.5 bg-primary-600 text-white rounded-lg hover:scale-110 transition-all"><Plus className="w-3 h-3"/></button>
           </div>
           {showForms.bodega && (
             <div className="mb-3 p-2 bg-white rounded-xl border border-primary-200 shadow-sm">
               <input autoFocus placeholder="..." className="w-full text-xs font-bold outline-none mb-1 text-center" value={newNames.bodega} onChange={e=>setNewNames({...newNames, bodega: e.target.value})}/>
               <button onClick={handleCreateBodega} className="w-full text-[8px] font-black uppercase py-1 bg-primary-600 text-white rounded-md">OK</button>
             </div>
           )}
           <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar px-1">
             {bodegas.map(b => (
               <button 
                 key={b.id} 
                 onClick={() => setSelBodegaId(b.id)}
                 className={`w-full py-4 px-2 rounded-[24px] flex flex-col items-center gap-2 transition-all border ${selBodegaId === b.id ? 'bg-primary-600 border-primary-400 shadow-lg text-white' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'}`}
               >
                 <div className="relative">
                   <Building2 className={`w-6 h-6 ${selBodegaId === b.id ? 'text-white' : 'text-slate-300'}`} />
                   {bodegaStats[b.id] && (
                     <div className={`absolute -top-2 -right-6 px-1.5 py-0.5 rounded-full text-[7px] font-black border-2 transition-all ${selBodegaId === b.id ? 'bg-white text-primary-600 border-primary-600' : 'bg-green-500 text-white border-white'}`}>
                       ${((bodegaStats[b.id].value) / 1000).toFixed(1)}k
                     </div>
                   )}
                 </div>
                 <div className="w-full px-4 text-center">
                   <p className="text-[9px] font-black uppercase tracking-tighter leading-none truncate mb-1">{b.nombre}</p>
                   {bodegaStats[b.id] && (
                     <>
                       <CapacityBar 
                        occupied={bodegaStats[b.id].occupied} 
                        capacity={bodegaStats[b.id].capacity} 
                        className={selBodegaId === b.id ? "opacity-40" : ""}
                      />
                      <p className="text-[7px] font-bold opacity-40 mt-1">{bodegaStats[b.id].occupied}/{bodegaStats[b.id].capacity} Bines</p>
                    </>
                   )}
                 </div>
               </button>
             ))}
           </div>
        </div>

        {/* COL 2: ZONAS (14%) */}
        <div className="w-[14%] flex flex-col bg-white/40 rounded-[32px] border border-slate-200 p-3 shadow-sm overflow-hidden">
           <div className="flex items-center justify-between mb-4 px-2">
             <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Zonas</h3>
             <button disabled={!selBodegaId} onClick={() => setShowForms({...showForms, zona: !showForms.zona})} className="p-1.5 bg-slate-800 text-white rounded-lg hover:scale-110 transition-all disabled:opacity-20"><Plus className="w-3 h-3"/></button>
           </div>
           {showForms.zona && (
             <div className="mb-3 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
               <input autoFocus placeholder="..." className="w-full text-xs font-bold outline-none mb-1 text-center" value={newNames.zona} onChange={e=>setNewNames({...newNames, zona: e.target.value})}/>
               <button onClick={handleCreateZona} className="w-full text-[8px] font-black uppercase py-1 bg-slate-800 text-white rounded-md">OK</button>
             </div>
           )}
           <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar px-1">
             {zonas.map(z => (
               <button 
                 key={z.id} 
                 onClick={() => setSelZonaId(z.id)}
                 className={`w-full py-4 px-2 rounded-[24px] flex flex-col items-center gap-2 transition-all border ${selZonaId === z.id ? 'bg-slate-800 border-slate-600 shadow-lg text-white' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'}`}
               >
                 <Layers className={`w-6 h-6 ${selZonaId === z.id ? 'text-white' : 'text-slate-300'}`} />
                 <div className="w-full px-4 text-center">
                   <p className="text-[9px] font-black uppercase tracking-tighter leading-none truncate mb-1">{z.nombre}</p>
                   {zonaStats[z.id] && (
                     <>
                       <CapacityBar 
                        occupied={zonaStats[z.id].occupied} 
                        capacity={zonaStats[z.id].capacity} 
                        className={selZonaId === z.id ? "opacity-30" : ""}
                      />
                      <p className="text-[7px] font-bold opacity-30 mt-1">{zonaStats[z.id].occupied}/{zonaStats[z.id].capacity} Bines</p>
                    </>
                   )}
                 </div>
               </button>
             ))}
           </div>
        </div>

        {/* COL 3: POSICIONES (18%) */}
        <div className="w-[18%] flex flex-col bg-white rounded-[32px] border border-slate-200 p-4 shadow-md overflow-hidden">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-800">Posiciones</h3>
              <button onClick={() => {
                if(!selZonaId) setFeedback({ title: 'Aviso', description: 'Selecciona una Zona primero para crear posiciones.', variant: 'warning' });
                else setShowForms({...showForms, posicion: !showForms.posicion});
              }} className={`p-1.5 bg-primary-600 text-white rounded-lg hover:scale-110 transition-all ${!selZonaId ? 'opacity-30' : ''}`}><Plus className="w-3 h-3"/></button>
           </div>
           {showForms.posicion && (
             <div className="mb-4 p-3 bg-primary-50 rounded-2xl border border-primary-200">
               <input autoFocus placeholder="Nombre (A1, B2...)" className="w-full bg-white px-2 py-1.5 rounded-lg text-xs font-bold outline-none mb-2" value={newNames.posicion} onChange={e=>setNewNames({...newNames, posicion: e.target.value})}/>
               <div className="flex items-center gap-2 mb-2">
                 <span className="text-[8px] font-black uppercase text-slate-400">Capacidad:</span>
                 <input type="number" className="w-12 bg-white px-2 py-1 rounded-lg text-[10px] font-black outline-none border border-slate-100" value={(newNames as any).posicionCapacidad || 4} onChange={e=>setNewNames({...newNames, posicionCapacidad: parseInt(e.target.value)}) as any}/>
               </div>
               <button onClick={handleCreatePosicion} className="w-full text-[9px] font-black uppercase py-2 bg-primary-600 text-white rounded-xl shadow-md">Crear Posición</button>
             </div>
           )}
           <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
             {!selZonaId ? <div className="h-full flex flex-col items-center justify-center opacity-10"><MapPin className="w-12 h-12" /></div> :
              posiciones.map(pos => {
                 const stats = posicionStats[pos.id];
                 const isFull = stats && stats.occupied >= stats.capacity;
                 
                 return (
                  <button 
                    key={pos.id} 
                    disabled={!!transferSource && isFull}
                    onClick={() => setSelPosicionId(pos.id)}
                    className={`w-full p-4 rounded-[24px] flex items-center gap-4 transition-all border ${selPosicionId === pos.id ? 'bg-primary-50 border-primary-500 ring-4 ring-primary-100' : 'bg-white border-slate-100 hover:border-primary-200'} ${transferSource && !suggestedPos.includes(pos.id) ? 'opacity-40 grayscale' : ''} ${transferSource && isFull ? 'opacity-20 cursor-not-allowed grayscale scale-95' : ''}`}
                  >
                     <div className={`p-2 rounded-xl border relative ${selPosicionId === pos.id ? 'bg-primary-600 text-white border-primary-400' : 'bg-slate-50 text-slate-400 border-slate-100'} ${suggestedPos.includes(pos.id) ? 'ring-2 ring-amber-400 ring-offset-2' : ''} ${isFull ? 'ring-2 ring-red-500/20' : ''}`}>
                     <MapPin className="w-4 h-4" />
                     {suggestedPos.includes(pos.id) && (
                       <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[6px] font-black px-1 rounded-sm uppercase whitespace-nowrap shadow-sm">Sug. Afin.</div>
                     )}
                     {posicionStats[pos.id] && (
                       <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${posicionStats[pos.id].occupied >= posicionStats[pos.id].capacity ? 'bg-red-500' : 'bg-green-500'}`} />
                     )}
                  </div>
                 <div className="flex-1 overflow-hidden text-left">
                   <div className="flex items-center justify-between gap-1 mb-1">
                     <p className="text-[10px] font-black text-slate-800 uppercase truncate leading-none">{pos.nombre || 'POSICIÓN'}</p>
                     {posicionStats[pos.id] && (
                       <span className="text-[8px] font-black text-green-600">${(posicionStats[pos.id].value / 1000).toFixed(1)}k</span>
                     )}
                   </div>
                   {posicionStats[pos.id] && (
                     <CapacityBar 
                       occupied={posicionStats[pos.id].occupied} 
                       capacity={posicionStats[pos.id].capacity}
                       className="mb-1"
                     />
                   )}
                   <div className="flex items-center justify-between text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                     {posicionStats[pos.id] && <span>{posicionStats[pos.id].occupied}/{posicionStats[pos.id].capacity} bines</span>}
                   </div>
                 </div>
               </button>
             )})}
           </div>
        </div>

        {/* COL 4: BINES & OPERACIÓN (36%) - EL CORAZÓN */}
        <div className="w-[36%] flex flex-col bg-slate-900 rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-60 h-60 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
                        {transferSource ? 'Destino de Traslado' : 'Contenedores'}
                      </h3>
                      <h2 className="text-2xl font-black text-white tracking-tighter">
                        {selPosicionId ? posiciones.find(p=>p.id===selPosicionId)?.nombre : transferSource ? 'Selecciona Destino' : 'Selecciona Posición'}
                      </h2>
                    </div>
                    {selPosicionId && (
                       <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-inner">
                          <MapPin className="w-3.5 h-3.5 text-primary-500" />
                          <span className="text-[10px] font-black text-slate-400 uppercase">{posSeleccionada?.nombre}</span>
                       </div>
                    )}
                </div>

                {!selPosicionId ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                      <div className={`w-24 h-24 rounded-[40px] flex items-center justify-center mb-6 border-2 border-dashed ${transferSource ? 'bg-primary-500/10 border-primary-500/40 animate-pulse' : 'bg-slate-900 border-slate-800'}`}>
                        {transferSource ? <SquareArrowOutUpRight className="w-10 h-10 text-primary-500" /> : <MapPin className="w-10 h-10 text-slate-800" />}
                      </div>
                      <h4 className="text-lg font-black text-white mb-2">{transferSource ? '¿Dónde quieres soltarlo?' : 'Área de Operación'}</h4>
                      <p className="text-[11px] font-medium text-slate-500 max-w-[240px] leading-relaxed">
                        {transferSource 
                          ? `Has seleccionado el bin ${transferSource.codigo}. Navega por el mapa y elige una posición destino para completar el traslado.` 
                          : 'Selecciona una posición en el mapa para gestionar sus bines activos o realizar ingresos.'}
                      </p>
                   </div>
                ) : (
                  <>
               <div className="mb-6 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700">
                      <Box className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{posSeleccionada?.nombre}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">ID: {posSeleccionada?.codigo}</span>
                         <span className="w-1 h-1 bg-primary-500 rounded-full" />
                         <span className="text-[8px] font-black text-primary-500 uppercase tracking-[0.1em]">Val: ${(posicionStats[posSeleccionada?.id || '']?.value || 0).toLocaleString()}</span>
                      </div>
                    </div>
                 </div>
               </div>

                 {/* PANEL DE OPERACIÓN DINÁMICO */}
                 <div className="mb-6">
                   {transferSource ? (
                     <div className="bg-primary-600/10 border-2 border-dashed border-primary-500 p-6 rounded-[32px] animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <ArrowRight className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest leading-none">Aterrizaje en {posSeleccionada?.nombre}</p>
                            <h4 className="text-sm font-black text-slate-200 mt-1">¿Qué tipo de traslado harás?</h4>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                           <button 
                             onClick={() => handleConfirmTransfer(posSeleccionada)}
                             className="w-full py-4 bg-primary-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                           >
                              <Archive className="w-4 h-4" /> Mover Bin Completo Aquí
                           </button>
                           <p className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-widest py-1">O selecciona un bin debajo para mover unidades</p>
                        </div>
                     </div>
                   ) : mode === 'DISEÑO' ? (
                    <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700 space-y-4">
                       <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                         <input 
                           placeholder="Bautizar bin o producto..."
                           value={prodSearch || newNames.binSufijo}
                           onChange={e => {
                             setProdSearch(e.target.value)
                             setNewNames({...newNames, binSufijo: e.target.value, productoSeleccionado: null})
                             buscarProductos(e.target.value)
                           }}
                           className="w-full bg-slate-900 border border-slate-600 rounded-2xl pl-10 pr-4 py-3 text-xs font-black text-white outline-none focus:ring-2 focus:ring-primary-500"
                         />
                         {productos.length > 0 && (
                            <div className="absolute z-10 w-full bg-slate-900 border border-slate-700 rounded-2xl mt-1 overflow-hidden shadow-2xl">
                               {productos.map(p => (
                                 <button key={p.id} onClick={()=>{setNewNames({...newNames, productoSeleccionado: p, binSufijo: p.referencia}); setProdSearch(p.nombre); setProductos([])}} className="w-full px-4 py-3 text-left hover:bg-slate-800 border-b border-slate-800 flex justify-between items-center group">
                                    <div className="flex flex-col"><span className="text-[10px] font-black text-white uppercase">{p.referencia}</span><span className="text-[8px] text-slate-500 font-bold">{p.nombre}</span></div>
                                    <Plus className="w-3 text-primary-500 opacity-0 group-hover:opacity-100" />
                                 </button>
                               ))}
                            </div>
                         )}
                       </div>
                        <button 
                          disabled={posicionStats[posSeleccionada?.id || '']?.occupied >= posicionStats[posSeleccionada?.id || '']?.capacity}
                          onClick={handleCreateBin} 
                          className="w-full py-3 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 active:scale-95 transition-all disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed disabled:scale-100"
                        >
                          {posicionStats[posSeleccionada?.id || '']?.occupied >= posicionStats[posSeleccionada?.id || '']?.capacity 
                            ? 'Posición Llena (Aforo Completo)' 
                            : `Crear Contenedor ${newNames.binSufijo ? `(${newNames.binSufijo})` : ''}`}
                        </button>
                    </div>
                  ) : activeOC ? (
                        <div className="bg-amber-600 p-5 rounded-3xl shadow-lg ring-4 ring-amber-600/20 mb-4 animate-in fade-in slide-in-from-top-4">
                       <div className="flex items-center justify-between gap-4 mb-4">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-white" /></div>
                           <div><p className="text-[8px] font-black text-amber-200 uppercase leading-none">Orden Pendiente</p><h5 className="text-sm font-black text-white">{activeOC.codigo}</h5></div>
                         </div>
                       </div>
                       
                       <div className="flex flex-col gap-2">
                         <button 
                            onClick={() => {
                              setModalTargetBin({ 
                                id: `NEW_BIN|${posSeleccionada?.id}|${posSeleccionada?.nombre}`, 
                                codigo: 'NUEVO CONTENEDOR (Auto)', 
                                bodega_id: posSeleccionada?.bodega_id || '' 
                              } as any)
                              setModalOpen(true)
                            }}
                            className="w-full py-3 bg-white text-amber-600 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                         >
                            <Box className="w-4 h-4" /> Recibir Nueva Caja Aquí
                         </button>
                         <p className="text-[8px] font-bold text-amber-100 opacity-80 uppercase leading-tight text-center">
                           O dale clic a "Recibir" sobre un Bin existente debajo para mezclar inventario.
                         </p>
                       </div>
                     </div>
                 ) : (
                    <div className="p-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-3xl text-slate-500 opacity-50">
                       <ArrowRight className="w-8 h-8 mb-2 animate-pulse" />
                       <span className="text-[9px] font-black uppercase">Operación en espera de Orden</span>
                    </div>
                 )}
               </div>

               {/* LISTA DE BINES DARK */}
               <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar-dark pr-1">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bines Activos</span>
                    <span className="text-[9px] font-black text-slate-700 bg-slate-800 px-2 rounded-lg">{bines.length}</span>
                  </div>
                  {bines.map(bin => (
                    <div key={bin.id} className="space-y-2">
                      <div 
                         onClick={() => {
                           if (transferSource && transferSource.id !== bin.id) {
                             setBinToBinTarget(bin)
                           }
                         }}
                         className={`p-4 bg-slate-800/40 border rounded-2xl flex items-center justify-between group transition-all ${transferSource && transferSource.id !== bin.id ? 'border-primary-500/50 bg-primary-500/5 hover:bg-primary-500/10 cursor-alias ring-2 ring-primary-500/20' : 'border-slate-700 hover:bg-slate-800 hover:border-slate-500'}`}
                      >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${bin.es_fijo ? 'bg-amber-900/10 border-amber-900/40 text-amber-500' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}>
                              <Box className="w-5 h-5 shadow-sm" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-slate-100 uppercase leading-none tracking-tight">{bin.codigo}</span>
                                {binContents[bin.id]?.length > 0 ? (
                                   <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md text-[7px] font-black uppercase tracking-widest">
                                     {binContents[bin.id].reduce((acc: number, item: any) => acc + item.count, 0)} ITEMS
                                   </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md text-[7px] font-black uppercase tracking-widest">
                                    VACÍO
                                  </span>
                                )}
                              </div>
                              <span className={`text-[7px] font-black uppercase mt-1.5 px-1.5 py-0.5 rounded-full inline-block w-fit ${bin.es_fijo ? 'bg-amber-900/40 text-amber-400 border border-amber-800' : 'bg-slate-700 text-slate-400'}`}>{bin.es_fijo ? 'Fijo' : 'Var'}</span>
                            </div>
                          </div>
                         
                         <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                            {mode === 'OPERACI\u00D3N' && activeOC && (
                              <button onClick={(e)=>{e.stopPropagation(); setModalTargetBin(bin); setModalOpen(true)}} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-amber-500 active:scale-95 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Recibir</button>
                            )}
                            {mode === 'OPERACI\u00D3N' && !activeOC && !transferSource && (
                              <>
                                <button onClick={(e)=>{e.stopPropagation(); setAdjustmentTarget(bin)}} title="Ajustar Inventario" className="p-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600"><Wrench className="w-3.5 h-3.5" /></button>
                                <button onClick={(e)=>{e.stopPropagation(); handleStartTransfer(bin)}} title="Mover Bin" className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"><SquareArrowOutUpRight className="w-3.5 h-3.5" /></button>
                              </>
                            )}
                            <button onClick={(e)=>{e.stopPropagation(); handleEliminarBin(bin.id)}} className="p-2 text-slate-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      </div>

                      {/* DETALLE INLINE SIEMPRE VISIBLE */}
                      <div className="mx-2 mb-4 p-4 bg-slate-900 border border-slate-700 rounded-2xl animate-in zoom-in-95 duration-200">
                         <h5 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">Contenido Real-Time</h5>
                         <div className="space-y-3">
                            {!binContents[bin.id] ? (
                              <div className="flex items-center gap-2 py-2">
                                 <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                 <span className="text-[9px] font-bold text-slate-500 uppercase">Consultando Kardex...</span>
                              </div>
                            ) : binContents[bin.id].length === 0 ? (
                              <div className="text-[9px] font-bold text-slate-600 uppercase py-2">Bin Vacío</div>
                            ) : (
                              binContents[bin.id].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between group/item">
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-slate-200 uppercase leading-none">{item.label}</span>
                                      <span className="text-[7px] font-bold text-slate-500 uppercase mt-1 truncate max-w-[120px]">{item.sublabel}</span>
                                   </div>
                                   <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg">
                                      <span className="text-[10px] font-black text-primary-400">{item.count}</span>
                                      <span className="text-[7px] font-bold text-slate-500 ml-1 uppercase">{item.metadata?.unidad || 'un'}</span>
                                   </div>
                                </div>
                              ))
                            )}
                         </div>
                      </div>
                    </div>
                  ))}
               </div>
             </>
           )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar-dark::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>

      {/* MODAL DE MOVIMIENTOS */}
      <BinMovementModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        activeOC={activeOC}
        targetBin={modalTargetBin}
        onSuccess={() => {
          cargarBines(selPosicionId)
          cargarPosicionStats(selPosicionId)
          cargarWarehouseStats(selBodegaId)
          cargarPendientes()
          setActiveOC(null)
        }}
      />

      {/* MODAL DE AJUSTES */}
      <BinAdjustmentModal 
        isOpen={!!adjustmentTarget}
        onClose={() => setAdjustmentTarget(null)}
        bin={adjustmentTarget}
        onSuccess={() => {
          cargarBines(selPosicionId)
          cargarPosicionStats(selPosicionId)
        }}
      />

      {/* MODAL CONFIRMAR TRASLADO */}
      <TransferConfirmationModal 
        isOpen={!!confirmTransfer}
        onClose={() => setConfirmTransfer(null)}
        sourceBin={confirmTransfer?.source}
        targetPos={confirmTransfer?.target}
        onSuccess={() => {
          setTransferSource(null)
          setSuggestedPos([])
          cargarBines(selPosicionId)
          cargarWarehouseStats(selBodegaId)
          // Recargar destino si es posible
          if (confirmTransfer?.target?.id) cargarPosicionStats(confirmTransfer.target.id)
          setConfirmTransfer(null)
        }}
      />

      {/* MODAL TRASLADO ENTRE BINES */}
      <BinToBinTransferModal 
        isOpen={!!binToBinTarget}
        onClose={() => setBinToBinTarget(null)}
        sourceBin={transferSource}
        targetBin={binToBinTarget}
        onSuccess={() => {
          setTransferSource(null)
          setSuggestedPos([])
          cargarBines(selPosicionId)
          cargarWarehouseStats(selBodegaId)
          setBinToBinTarget(null)
        }}
      />

      <ConfirmActionModal 
        isOpen={!!confirmDeleteBin}
        onClose={() => setConfirmDeleteBin(null)}
        onConfirm={execDeleteBin}
        isLoading={isDeleting}
        title="Eliminar Contenedor"
        description="¿Estás seguro de que deseas eliminar este bin? Esta acción no se puede deshacer y fallará si el bin tiene movimientos históricos."
        confirmText="Eliminar permanentemente"
        variant="danger"
      />

      {/* MODAL FEEDBACK / ALERTAS */}
      <ConfirmActionModal 
        isOpen={!!feedback}
        onClose={() => setFeedback(null)}
        title={feedback?.title || ''}
        description={feedback?.description || ''}
        variant={feedback?.variant || 'info'}
        confirmText="Entendido"
      />

      {/* FLOATING ACTION BAR: TRANSFER MODE */}
      {transferSource && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 border border-slate-700 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 ring-8 ring-primary-500/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center animate-bounce"><SquareArrowOutUpRight className="w-5 h-5 text-white" /></div>
              <div>
                <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none">Modo Traslado Activo</p>
                <h6 className="text-sm font-black text-white leading-tight">Moviendo Bin: {transferSource.codigo}</h6>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-700 mx-2" />
            <div className="text-[10px] font-bold text-slate-400 max-w-[200px] leading-tight">Haz clic en la posición o bin destino para confirmar el traslado.</div>
            <button 
              onClick={() => {setTransferSource(null); setSuggestedPos([])}}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all font-black shadow-lg shadow-red-900/40"
            >
              Cancelar Movimiento
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
