'use client'

import { useState, useEffect } from 'react'
import { Package } from 'lucide-react'
import { getInventarioBodega, type InventarioItem } from '@/features/wms/services/bodegas-actions'

interface Props {
  bodegaId: string
  bodegaNombre: string
}

export function InventarioTable({ bodegaId, bodegaNombre }: Props) {
  const [items, setItems] = useState<InventarioItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInventario = async () => {
      setLoading(true)
      try {
        const data = await getInventarioBodega(bodegaId)
        setItems(data)
      } catch (e) {
        console.error('Error cargando inventario:', e)
      }
      setLoading(false)
    }

    loadInventario()
  }, [bodegaId])

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Cargando inventario...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-3">
          <Package className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">Sin inventario</p>
        <p className="text-body-sm text-muted-foreground mt-1">
          No hay productos en {bodegaNombre}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-neu-base shadow-neu overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black/5 bg-neu-base">
            <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 w-20">Bin</th>
            <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 whitespace-nowrap">Código</th>
            <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 min-w-[200px]">Descripción</th>
            <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 w-16">Talla</th>
            <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2 w-20">Cantidad</th>
            <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 w-16">Unidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-neu-100 transition-colors">
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="font-mono text-xs font-semibold text-primary-700">{item.bin_codigo}</span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="font-mono text-xs font-semibold text-foreground">{item.codigo}</span>
              </td>
              <td className="px-3 py-2 min-w-[200px]">
                <p className="text-xs font-medium text-foreground truncate">{item.nombre}</p>
              </td>
              <td className="px-3 py-2">
                <span className="text-xs text-muted-foreground">{item.talla || '—'}</span>
              </td>
              <td className="px-3 py-2 text-right">
                <span className="text-xs font-mono font-semibold text-foreground">{item.cantidad}</span>
              </td>
              <td className="px-3 py-2">
                <span className="text-xs text-muted-foreground">{item.unidad}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
