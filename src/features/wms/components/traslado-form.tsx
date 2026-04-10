'use client'

import { useState } from 'react'
import { Plus, X, ArrowRightLeft, Package, Repeat2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { crearTraslado, confirmarTraslado } from '@/features/wms/services/traslados-actions'
import { LocationSelector } from '@/features/wms/components/location-selector'
import type { Bodega } from '@/features/wms/types'

interface Props {
  bodegas: Bodega[]
  bodegaOrigen?: string
}

interface ItemTraslado {
  id: string
  producto_id?: string
  material_id?: string
  bin_id?: string
  talla?: string
  cantidad: number
  unidad: string
}

export function TrasladoForm({ bodegas, bodegaOrigen }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [source, setSource] = useState<{ bodegaId?: string; posicionId?: string; binId?: string }>({
    bodegaId: bodegaOrigen || '',
  })
  
  const [target, setTarget] = useState<{ bodegaId?: string; posicionId?: string; binId?: string }>({})
  
  const [tipo, setTipo] = useState<'movimiento_bin' | 'movimiento_items'>('movimiento_bin')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemTraslado[]>([])

  const agregarItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36),
        cantidad: 1,
        unidad: 'unidades',
      },
    ])
  }

  const eliminarItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(
      items.map(i =>
        i.id === id ? { ...i, [field]: value } : i,
      ),
    )
  }

  const handleCrearTraslado = async () => {
    if (!source.bodegaId || !target.bodegaId) {
      setError('Selecciona bodega origen y destino')
      return
    }

    if (tipo === 'movimiento_bin') {
      if (!source.binId || !target.posicionId) {
        setError('Para mover un bin completo, selecciona el bin de origen y la posición de destino')
        return
      }
    } else {
      if (!source.binId || !target.binId) {
        setError('Para mover items, selecciona el bin de origen y el bin de destino')
        return
      }
      if (items.length === 0) {
        setError('Agrega al menos un item')
        return
      }
    }

    setLoading(true)
    setError(null)

    // Adaptamos al API existente
    const apiTipo = tipo === 'movimiento_bin' ? 'bin_completo' : 'bin_a_bin'

    const result = await crearTraslado({
      tipo: apiTipo,
      bodega_origen_id: source.bodegaId,
      bodega_destino_id: target.bodegaId,
      bin_origen_id: source.binId,
      bin_destino_id: target.binId,
      items: items.map(i => ({
        producto_id: i.producto_id,
        material_id: i.material_id,
        bin_id: i.bin_id,
        talla: i.talla,
        cantidad: i.cantidad,
        unidad: i.unidad,
      })),
      notas: notas || undefined,
    })
    
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      const confirmResult = await confirmarTraslado(result.data.id)
      if (confirmResult.error) {
        setError(`Traslado creado pero error al confirmar: ${confirmResult.error}`)
      } else {
        setSource({ bodegaId: bodegaOrigen || '' })
        setTarget({})
        setItems([])
        setNotas('')
        setError(null)
      }
    }
  }

  return (
    <div className="bg-neu-base border border-neu-300 rounded-3xl p-6 space-y-8 shadow-neu">
      <div className="flex items-center justify-between border-b border-neu-200 pb-4">
        <h3 className="font-bold text-xl text-foreground">Gestor de Traslados</h3>
        <div className="flex bg-neu-200 p-1 rounded-xl">
          <button
            onClick={() => setTipo('movimiento_bin')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tipo === 'movimiento_bin' ? 'bg-white shadow-sm text-primary-700' : 'text-muted-foreground'}`}
          >
            Mover Bin
          </button>
          <button
            onClick={() => setTipo('movimiento_items')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tipo === 'movimiento_items' ? 'bg-white shadow-sm text-primary-700' : 'text-muted-foreground'}`}
          >
            Mover Items
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-sm text-red-700 animate-in fade-in slide-in-from-top-2 duration-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
        {/* Origen */}
        <div className="space-y-4">
          <LocationSelector 
            label="Origen" 
            value={source} 
            onChange={setSource}
            placeholder="Escanee Bin de origen..."
          />
        </div>

        {/* Decoración flecha */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white border-2 border-neu-200 rounded-full items-center justify-center shadow-md z-10">
          <ArrowRightLeft className="w-5 h-5 text-primary-500" />
        </div>

        {/* Destino */}
        <div className="space-y-4">
          <LocationSelector 
            label="Destino" 
            value={target} 
            onChange={setTarget}
            excludeBinId={source.binId}
            placeholder={tipo === 'movimiento_bin' ? "Escanee Posición destino..." : "Escanee Bin destino..."}
          />
        </div>
      </div>

      {/* Items Section (Solo si es movimiento_items) */}
      {tipo === 'movimiento_items' && (
        <div className="space-y-4 pt-4 border-t border-neu-200 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm">Items a Trasladar</h4>
            <button
              onClick={agregarItem}
              className="px-4 py-1.5 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-all shadow-md"
            >
              + Agregar Item
            </button>
          </div>

          <div className="grid gap-3">
            {items.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-neu-300 rounded-2xl text-center text-muted-foreground text-sm italic">
                Seleccione items para iniciar el traspaso
              </div>
            ) : (
              items.map(item => (
                <div key={item.id} className="flex flex-wrap gap-3 items-end bg-neu-100 p-4 rounded-2xl border border-neu-200">
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Producto</span>
                    <input 
                      className="w-full px-3 py-2 bg-white rounded-xl border border-neu-300 text-sm outline-none" 
                      placeholder="SKU o Referencia..."
                      value={item.producto_id || ''}
                      onChange={e => updateItem(item.id, 'producto_id', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Cantidad</span>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-neu-300 text-sm outline-none" 
                      value={item.cantidad}
                      onChange={e => updateItem(item.id, 'cantidad', parseInt(e.target.value))}
                    />
                  </div>
                  <button
                    onClick={() => eliminarItem(item.id)}
                    className="p-2 mb-0.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-neu-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:flex-1">
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Notas adicionales del movimiento..."
            className="w-full px-4 py-2 bg-neu-100 rounded-2xl border border-neu-300 text-sm outline-none focus:ring-2 focus:ring-primary-300 h-10 resize-none"
          />
        </div>
        <button
          onClick={handleCrearTraslado}
          disabled={loading || (!source.binId) || (tipo === 'movimiento_bin' ? !target.posicionId : !target.binId)}
          className="w-full sm:w-auto px-8 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-lg hover:bg-primary-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Procesando...' : 'Confirmar Movimiento'}
          {!loading && <ArrowRightLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
