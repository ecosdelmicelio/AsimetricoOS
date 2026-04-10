'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, MapPin, Loader2, Search, QrCode, Printer, AlertCircle } from 'lucide-react'
import { getPosicionesByBodega, crearPosicion, eliminarPosicion, actualizarPosicion } from '@/features/wms/services/posiciones-actions'
import { generatePositionLabelPDF } from '@/features/wms/services/label-service'
import type { Posicion } from '@/features/wms/types'

interface Props {
  bodegaId: string
}

export function PosicionesTab({ bodegaId }: Props) {
  const [posiciones, setPosiciones] = useState<(Posicion & { bines_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Quick Add State
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaCapacidad, setNuevaCapacidad] = useState(4)
  const [creando, setCreando] = useState(false)
  
  // Editing State
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCapacidad, setEditCapacidad] = useState(4)
  const [actualizando, setActualizando] = useState(false)

  useEffect(() => {
    if (bodegaId) {
      loadPosiciones()
    }
  }, [bodegaId])

  const loadPosiciones = async () => {
    setLoading(true)
    const data = await getPosicionesByBodega(bodegaId)
    setPosiciones(data)
    setLoading(false)
  }

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoNombre.trim() || creando) return

    setCreando(true)
    setError(null)
    const result = await crearPosicion({
      bodega_id: bodegaId,
      nombre: nuevoNombre.trim(),
      capacidad_bines: nuevaCapacidad
    })
    setCreando(false)

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      // Forzamos recarga para obtener el bines_count correcto o simplemente inicializamos en 0
      setPosiciones(prev => [...prev, { ...result.data!, bines_count: 0 }])
      setNuevoNombre('')
      setNuevaCapacidad(4)
    }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta posición?')) return
    
    const result = await eliminarPosicion(id)
    if (!result.error) {
      setPosiciones(prev => prev.filter(p => p.id !== id))
    }
  }

  const handleActualizar = async () => {
    if (!editId || !editNombre.trim() || actualizando) return
    
    setActualizando(true)
    setError(null)
    const result = await actualizarPosicion(editId, { 
      nombre: editNombre.trim(),
      capacidad_bines: editCapacidad
    })
    setActualizando(false)

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setPosiciones(prev => prev.map(p => p.id === editId ? { ...result.data!, bines_count: p.bines_count } : p))
      setEditId(null)
    }
  }

  const imprimirEtiqueta = async (pos: Posicion) => {
    await generatePositionLabelPDF({
      codigo: pos.codigo,
      nombre: pos.nombre || pos.codigo
    })
  }

  const imprimirTodas = async () => {
    await generatePositionLabelPDF(posiciones.map(p => ({
      codigo: p.codigo,
      nombre: p.nombre || p.codigo
    })))
  }

  return (
    <div className="space-y-6">
      {/* Advertencia de Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-sm text-red-700 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Header & Quick Add */}
      <div className="bg-neu-base border border-neu-300 rounded-3xl p-6 shadow-neu">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-bold text-xl text-foreground">Gestión de Posiciones</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-primary-500" />
              Organice los lugares físicos y sus capacidades de almacenamiento
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <form onSubmit={handleCrear} className="flex-1 flex gap-2">
              <div className="relative flex-1 group">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${creando ? 'text-primary-500' : 'text-muted-foreground'}`}>
                  {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </div>
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                  placeholder="Nombre de la posición..."
                  className="w-full pl-11 pr-4 py-3 bg-neu-100 border-2 border-transparent rounded-2xl outline-none text-sm font-medium transition-all focus:border-primary-400 focus:bg-white shadow-neu-inset"
                  disabled={creando}
                />
              </div>
              <div className="w-32 group">
                <input
                  type="number"
                  value={nuevaCapacidad}
                  onChange={e => setNuevaCapacidad(parseInt(e.target.value) || 1)}
                  placeholder="Cap."
                  className="w-full px-4 py-3 bg-neu-100 border-2 border-transparent rounded-2xl outline-none text-sm font-bold text-center transition-all focus:border-primary-400 focus:bg-white shadow-neu-inset"
                  disabled={creando}
                  title="Capacidad de bines"
                />
              </div>
              <button 
                type="submit" 
                disabled={creando || !nuevoNombre.trim()}
                className="px-6 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-md disabled:opacity-50"
              >
                {creando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Añadir'}
              </button>
            </form>

            <button
              onClick={imprimirTodas}
              disabled={posiciones.length === 0}
              className="px-6 bg-white border-2 border-neu-200 text-foreground font-bold rounded-2xl hover:shadow-neu transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir Todas
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-neu-base border border-neu-300 rounded-3xl overflow-hidden shadow-neu">
        <table className="w-full text-left">
          <thead className="bg-neu-100 border-b border-neu-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Código de Escaneo</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre / Descripción</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ocupación / Capacidad</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right w-44">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neu-200">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic text-sm">
                  Cargando posiciones...
                </td>
              </tr>
            ) : posiciones.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic text-sm">
                  No hay posiciones creadas para esta bodega.
                </td>
              </tr>
            ) : (
              posiciones.map(pos => {
                const porcentaje = Math.min((pos.bines_count / pos.capacidad_bines) * 100, 100)
                const colorClase = 
                  porcentaje === 100 ? 'bg-red-500' : 
                  porcentaje > 75 ? 'bg-amber-500' : 
                  'bg-emerald-500'

                return (
                  <tr key={pos.id} className="group hover:bg-neu-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-neu-200 rounded-md text-[10px] font-bold text-primary-700">
                          {pos.codigo}
                        </code>
                        <button onClick={() => imprimirEtiqueta(pos)} title="Imprimir QR" className="p-1 hover:bg-primary-100 rounded text-primary-600">
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editId === pos.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={editNombre}
                            onChange={e => setEditNombre(e.target.value)}
                            className="px-2 py-1 bg-white border-2 border-primary-300 rounded-xl text-sm outline-none w-full"
                          />
                          <input
                            type="number"
                            value={editCapacidad}
                            onChange={e => setEditCapacidad(parseInt(e.target.value) || 1)}
                            className="px-2 py-1 bg-white border-2 border-primary-300 rounded-xl text-sm outline-none w-16 text-center font-bold"
                          />
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-foreground">{pos.nombre || pos.codigo}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                          <span className={pos.bines_count >= pos.capacidad_bines ? 'text-red-600' : 'text-muted-foreground'}>
                            {pos.bines_count} / {pos.capacidad_bines} bines
                          </span>
                          <span className="text-muted-foreground">{Math.round(porcentaje)}%</span>
                        </div>
                        <div className="h-2 w-full bg-neu-200 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full transition-all duration-500 ${colorClase}`}
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editId === pos.id ? (
                          <>
                            <button onClick={handleActualizar} disabled={actualizando} className="p-2 text-green-600 hover:bg-green-50 rounded-xl">
                              <Check className="w-5 h-5" />
                            </button>
                            <button onClick={() => setEditId(null)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl">
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditId(pos.id); setEditNombre(pos.nombre || ''); setEditCapacidad(pos.capacidad_bines) }}
                              className="p-2 text-muted-foreground hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEliminar(pos.id)}
                              className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
