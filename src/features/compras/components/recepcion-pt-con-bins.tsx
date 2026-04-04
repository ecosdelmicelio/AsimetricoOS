'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import { BinExport } from '@/features/bines/components/bin-export'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'
import type { BinContenido } from '@/features/bines/types'

interface RecepcionItem {
  producto_id: string
  referencia: string
  nombre: string
  color: string | null
  talla: string
  cantidad: number
}

interface BinAgrupado {
  binIndex: number
  binCodigo?: string
  items: RecepcionItem[]
  binContenido?: BinContenido
}

interface Props {
  ocId: string
  bodegaId: string
  productosActivos: Array<{
    id: string
    referencia: string
    nombre: string
    color?: string | null
  }>
  onGuardar?: (bins: BinAgrupado[]) => Promise<void>
}

export function RecepcionPTConBins({
  ocId,
  bodegaId,
  productosActivos,
  onGuardar,
}: Props) {
  const [binesAgrupados, setBinesAgrupados] = useState<BinAgrupado[]>([
    { binIndex: 0, items: [] },
  ])
  const [binActual, setBinActual] = useState(0)
  const [cargando, setCargando] = useState(false)

  const agregarBin = useCallback(() => {
    setBinesAgrupados(prev => [
      ...prev,
      { binIndex: prev.length, items: [] },
    ])
  }, [])

  const eliminarBin = useCallback((binIndex: number) => {
    if (binesAgrupados.length === 1) return

    setBinesAgrupados(prev => {
      const filtered = prev.filter((_, idx) => idx !== binIndex)
      return filtered.map((bin, idx) => ({ ...bin, binIndex: idx }))
    })

    if (binActual >= binesAgrupados.length - 1) {
      setBinActual(Math.max(0, binActual - 1))
    }
  }, [binActual, binesAgrupados.length])

  const actualBin = binesAgrupados[binActual]

  const handleActualizarCantidad = (productoId: string, talla: string, cantidad: number) => {
    setBinesAgrupados(prev => {
      const newBines = [...prev]
      const items = newBines[binActual].items

      const existingIdx = items.findIndex(
        i => i.producto_id === productoId && i.talla === talla
      )

      if (cantidad === 0) {
        if (existingIdx >= 0) {
          items.splice(existingIdx, 1)
        }
      } else {
        if (existingIdx >= 0) {
          items[existingIdx].cantidad = cantidad
        } else {
          const producto = productosActivos.find(p => p.id === productoId)
          if (producto) {
            items.push({
              producto_id: productoId,
              referencia: producto.referencia,
              nombre: producto.nombre,
              color: producto.color || null,
              talla,
              cantidad,
            })
          }
        }
      }

      return newBines
    })
  }

  const handleRemover = (productoId: string) => {
    setBinesAgrupados(prev => {
      const newBines = [...prev]
      newBines[binActual].items = newBines[binActual].items.filter(
        i => i.producto_id !== productoId
      )
      return newBines
    })
  }

  const handleGuardar = async () => {
    if (binesAgrupados.every(b => b.items.length === 0)) {
      alert('Agrega al menos un producto a un bin')
      return
    }

    setCargando(true)
    try {
      if (onGuardar) {
        await onGuardar(binesAgrupados)
      }
    } finally {
      setCargando(false)
    }
  }

  const productosEnMatriz: ProductoEnMatriz[] = actualBin.items.map(item => ({
    producto_id: item.producto_id,
    referencia: item.referencia,
    nombre: item.nombre,
    color: item.color,
    precio_unitario: 0,
    cantidades: { [item.talla]: item.cantidad },
  }))

  const productosUnicos = Array.from(
    new Map(
      productosEnMatriz.map(p => [p.producto_id, p])
    ).values()
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-neu-base shadow-neu p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {binesAgrupados.map((bin, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                onClick={() => setBinActual(idx)}
                className={`px-4 py-2 rounded-lg font-semibold text-body-sm transition-all ${
                  binActual === idx
                    ? 'bg-primary-600 text-white shadow-neu-lg'
                    : 'bg-white shadow-neu text-muted-foreground hover:text-foreground'
                }`}
              >
                Caja {idx + 1}
                {bin.items.length > 0 && <span className="ml-1">({bin.items.length})</span>}
              </button>
              {binesAgrupados.length > 1 && (
                <button
                  onClick={() => eliminarBin(idx)}
                  className="p-1 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={agregarBin}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white shadow-neu text-primary-600 font-semibold text-body-sm transition-all hover:shadow-neu-lg"
          >
            <Plus className="w-4 h-4" />
            Nueva Caja
          </button>
        </div>

        {actualBin.items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-black/5">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{actualBin.items.length}</span> referencias
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-neu-base shadow-neu p-6">
        {actualBin.items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-body-sm mb-4">
              Selecciona referencias para agregar a esta caja
            </p>
            <select
              onChange={e => {
                const productoId = e.target.value
                if (productoId) {
                  const producto = productosActivos.find(p => p.id === productoId)
                  if (producto) {
                    handleActualizarCantidad(productoId, 'UNICA', 1)
                  }
                  e.target.value = ''
                }
              }}
              className="px-4 py-2 rounded-lg bg-white shadow-neu-inset text-foreground outline-none"
            >
              <option value="">Seleccionar producto...</option>
              {productosActivos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.referencia} — {p.nombre} {p.color ? `(${p.color})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <MatrizProductos
            productos={productosUnicos}
            tallas={['UNICA']}
            mostrarPrecio={false}
            onActualizarCantidad={handleActualizarCantidad}
            onRemover={handleRemover}
          />
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          disabled={actualBin.items.length === 0 || cargando}
          onClick={handleGuardar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold text-body-sm transition-all hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {cargando ? 'Guardando...' : 'Guardar Recepción'}
        </button>
      </div>

      {binesAgrupados.some(b => b.items.length > 0) && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
          <p className="text-body-sm font-semibold text-green-900 mb-2">Resumen:</p>
          <ul className="space-y-1 text-body-sm text-green-800">
            {binesAgrupados.map((bin, idx) =>
              bin.items.length > 0 ? (
                <li key={idx}>
                  <strong>Caja {idx + 1}:</strong> {bin.items.length} referencias, {bin.items.reduce((sum, item) => sum + item.cantidad, 0)} unidades
                </li>
              ) : null
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
