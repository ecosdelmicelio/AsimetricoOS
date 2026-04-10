'use client'

import { useState, useEffect } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Plus, X, Loader2, AlertTriangle } from 'lucide-react'
import { BinSelector } from '@/features/wms/components/bin-selector'
import { crearAjuste } from '@/features/wms/services/ajustes-actions'
import { createClient } from '@/shared/lib/supabase/client'

interface ProductoOpcion {
  id: string
  label: string
  tipo: 'producto' | 'material'
  unidadDefault: string
}

interface ItemForm {
  id: string
  productoId: string
  talla: string
  cantidad: number
  unidad: string
}

interface Props {
  bodegaId: string
  onSuccess?: () => void
}

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única', '6', '8', '10', '12', '14', '16']
const UNIDADES = ['unidades', 'kg', 'metros', 'yardas', 'rollos', 'cajas']

export function AjusteForm({ bodegaId, onSuccess }: Props) {
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada')
  const [binId, setBinId] = useState<string | null>(null)
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemForm[]>([])
  const [productos, setProductos] = useState<ProductoOpcion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProductos = async () => {
      const supabase = createClient()
      const [{ data: prods }, { data: mats }] = await Promise.all([
        supabase
          .from('productos')
          .select('id, referencia, nombre')
          .eq('estado', 'activo')
          .order('referencia'),
        supabase
          .from('materiales')
          .select('id, codigo, nombre, unidad')
          .eq('activo', true)
          .order('codigo'),
      ])

      const opciones: ProductoOpcion[] = [
        ...(prods ?? []).map((p: { id: string; referencia: string; nombre: string }) => ({
          id: p.id,
          label: `${p.referencia} — ${p.nombre}`,
          tipo: 'producto' as const,
          unidadDefault: 'unidades',
        })),
        ...(mats ?? []).map((m: { id: string; codigo: string; nombre: string; unidad: string }) => ({
          id: m.id,
          label: `${m.codigo} — ${m.nombre}`,
          tipo: 'material' as const,
          unidadDefault: m.unidad || 'metros',
        })),
      ]
      setProductos(opciones)
    }

    loadProductos()
  }, [])

  // Reset bin cuando cambia bodega
  useEffect(() => {
    setBinId(null)
  }, [bodegaId])

  const agregarItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        productoId: '',
        talla: '',
        cantidad: 1,
        unidad: 'unidades',
      },
    ])
  }

  const actualizarItem = (id: string, campo: keyof ItemForm, valor: string | number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        if (campo === 'productoId') {
          const opcion = productos.find(p => p.id === valor)
          return { ...item, productoId: valor as string, unidad: opcion?.unidadDefault ?? item.unidad }
        }
        return { ...item, [campo]: valor }
      }),
    )
  }

  const eliminarItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const canGuardar = binId && notas.trim().length > 0 && items.length > 0 && items.every(i => i.productoId && i.cantidad > 0)

  const handleGuardar = async () => {
    if (!canGuardar) return
    setLoading(true)
    setError(null)

    const result = await crearAjuste({
      tipo,
      bodegaId,
      binId: binId!,
      notas,
      items: items.map(item => {
        const opcion = productos.find(p => p.id === item.productoId)
        return {
          productoId: opcion?.tipo === 'producto' ? item.productoId : undefined,
          materialId: opcion?.tipo === 'material' ? item.productoId : undefined,
          talla: item.talla || undefined,
          cantidad: item.cantidad,
          unidad: item.unidad,
        }
      }),
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    // Reset form
    setBinId(null)
    setNotas('')
    setItems([])
    setError(null)
    onSuccess?.()
  }

  return (
    <div className="space-y-5">
      {/* Tipo de ajuste */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Dirección
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('entrada')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              tipo === 'entrada'
                ? 'bg-green-50 border-green-400 text-green-700'
                : 'bg-neu-base border-transparent shadow-neu text-muted-foreground hover:shadow-neu-lg'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Entrada
          </button>
          <button
            type="button"
            onClick={() => setTipo('salida')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              tipo === 'salida'
                ? 'bg-red-50 border-red-400 text-red-700'
                : 'bg-neu-base border-transparent shadow-neu text-muted-foreground hover:shadow-neu-lg'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Salida
          </button>
        </div>
      </div>

      {/* Bin */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Bin *
        </label>
        <BinSelector
          bodegaId={bodegaId}
          value={binId}
          onChange={setBinId}
        />
      </div>

      {/* Ítems */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Ítems *
          </label>
          <button
            type="button"
            onClick={agregarItem}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors font-semibold"
          >
            <Plus className="w-3 h-3" />
            Agregar
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl bg-neu-base shadow-neu-inset py-6 text-center text-xs text-muted-foreground">
            Sin ítems — agrega al menos uno
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex gap-2 items-start">
                {/* Producto */}
                <div className="flex-1 rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5 min-w-0">
                  <select
                    value={item.productoId}
                    onChange={e => actualizarItem(item.id, 'productoId', e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none appearance-none truncate"
                  >
                    <option value="">Seleccionar...</option>
                    <optgroup label="Productos">
                      {productos.filter(p => p.tipo === 'producto').map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Materiales">
                      {productos.filter(p => p.tipo === 'material').map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Talla */}
                <div className="w-16 rounded-lg bg-neu-base shadow-neu-inset px-2 py-1.5">
                  <select
                    value={item.talla}
                    onChange={e => actualizarItem(item.id, 'talla', e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none appearance-none"
                  >
                    <option value="">—</option>
                    {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Cantidad */}
                <div className="w-16 rounded-lg bg-neu-base shadow-neu-inset px-2 py-1.5">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.cantidad}
                    onChange={e => actualizarItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-xs text-foreground outline-none text-right"
                  />
                </div>

                {/* Unidad */}
                <div className="w-20 rounded-lg bg-neu-base shadow-neu-inset px-2 py-1.5">
                  <select
                    value={item.unidad}
                    onChange={e => actualizarItem(item.id, 'unidad', e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none appearance-none"
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => eliminarItem(item.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0 mt-0.5"
                >
                  <X className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Notas * <span className="normal-case font-normal">(obligatorio para guardar)</span>
        </label>
        <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Motivo del ajuste... ej: Sobrante detectado en recepción, merma por daño en almacenamiento..."
            rows={2}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground resize-none"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={!canGuardar || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 text-sm font-semibold transition-all active:shadow-neu-inset disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-neu-lg"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loading ? 'Guardando...' : 'Guardar Ajuste'}
        </button>
      </div>

      {/* Hint cuando no puede guardar */}
      {!canGuardar && (items.length > 0 || binId) && (
        <p className="text-xs text-muted-foreground text-right -mt-3">
          {!binId && 'Selecciona un bin · '}
          {items.length === 0 && 'Agrega ítems · '}
          {!notas.trim() && 'Escribe las notas'}
        </p>
      )}
    </div>
  )
}
