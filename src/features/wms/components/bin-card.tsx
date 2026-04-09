'use client'

import type { BinContenido } from '@/features/bines/types'

interface Props {
  contenido: BinContenido | null | undefined
}

export function BinCard({ contenido }: Props) {
  if (!contenido) {
    return (
      <div className="px-4 py-3 bg-neu-100 border-t border-neu-300 text-sm text-muted-foreground">
        Cargando contenido...
      </div>
    )
  }

  if (contenido.items.length === 0) {
    return (
      <div className="px-4 py-3 bg-neu-100 border-t border-neu-300 text-sm text-muted-foreground">
        Bin vacío
      </div>
    )
  }

  return (
    <div className="px-4 py-3 bg-neu-100 border-t border-neu-300 space-y-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground font-medium">
            <th className="text-left py-1">Producto/Material</th>
            <th className="text-center py-1">Talla</th>
            <th className="text-right py-1">Cantidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neu-300">
          {contenido.items.map((item, idx) => (
            <tr key={idx} className="text-foreground">
              <td className="py-2 pr-2">
                <div>
                  <p className="font-medium">{item.referencia || item.nombre}</p>
                  <p className="text-muted-foreground text-xs">{item.nombre}</p>
                </div>
              </td>
              <td className="text-center py-2">
                {item.talla || '—'}
              </td>
              <td className="text-right py-2 font-semibold">
                {item.cantidad}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-xs text-muted-foreground pt-2 border-t border-neu-300">
        Total: {contenido.items.reduce((sum, item) => sum + item.cantidad, 0)} items
      </div>
    </div>
  )
}
