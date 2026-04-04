'use client'

import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SaldoPT } from '@/features/kardex/services/kardex-actions'

interface Props {
  saldos: SaldoPT[]
  bodegas: Array<{ id: string; nombre: string }>
}

export function InventarioPTProducto({ saldos, bodegas }: Props) {
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState<string | null>(null)

  // Obtener tallas únicas (ordenadas)
  const tallasUnicas = useMemo(() => {
    const tallas = new Set<string>()
    for (const saldo of saldos) {
      if (saldo.talla) {
        tallas.add(saldo.talla)
      }
    }
    return Array.from(tallas).sort()
  }, [saldos])

  // Filtrar saldos por bodega seleccionada
  const saldosFiltrados = useMemo(() => {
    if (bodegaSeleccionada) {
      return saldos.filter(s => s.bodega_id === bodegaSeleccionada)
    }
    return saldos
  }, [saldos, bodegaSeleccionada])

  // Agrupar por bodega
  const porBodega = useMemo(() => {
    const mapa = new Map<string, SaldoPT[]>()
    for (const saldo of saldosFiltrados) {
      const clave = saldo.bodega_id
      if (!mapa.has(clave)) {
        mapa.set(clave, [])
      }
      mapa.get(clave)!.push(saldo)
    }
    return mapa
  }, [saldosFiltrados])

  // Total general
  const totalGeneral = useMemo(() => {
    return saldos.reduce((sum, s) => sum + s.saldo, 0)
  }, [saldos])

  // Si no hay saldos
  if (saldos.length === 0) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
        <p className="text-body-sm text-muted-foreground">Sin stock en inventario</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector de bodega */}
      {!bodegaSeleccionada && (
        <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
          <select
            value={bodegaSeleccionada || ''}
            onChange={e => setBodegaSeleccionada(e.target.value || null)}
            className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
          >
            <option value="">Todas las bodegas ({totalGeneral} uds)</option>
            {bodegas.map(b => {
              const total = saldosFiltrados
                .filter(s => s.bodega_id === b.id)
                .reduce((sum, s) => sum + s.saldo, 0)
              return (
                <option key={b.id} value={b.id}>
                  {b.nombre} ({total} uds)
                </option>
              )
            })}
          </select>
        </div>
      )}

      {/* Tabla de saldos */}
      <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-black/5">
          <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Bodega</span>
          {tallasUnicas.map(talla => (
            <span key={talla} className="col-span-1 text-xs font-semibold text-muted-foreground uppercase text-center">
              {talla}
            </span>
          ))}
          <span className="col-span-1 text-xs font-semibold text-muted-foreground uppercase text-right">Total</span>
          <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-right">CPP</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-black/5">
          {Array.from(porBodega.entries()).map(([bodegaId, saldosBodega]) => {
            const bodega = bodegas.find(b => b.id === bodegaId)
            const totalBodega = saldosBodega.reduce((sum, s) => sum + s.saldo, 0)
            const cpp = saldosBodega.length > 0 ? saldosBodega[0].costo_promedio : 0

            return (
              <div key={bodegaId} className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-black/2 transition-colors">
                <div className="col-span-2">
                  <p className="text-body-sm font-medium text-foreground">{bodega?.nombre || 'Desconocida'}</p>
                </div>

                {tallasUnicas.map(talla => {
                  const saldo = saldosBodega.find(s => s.talla === talla)
                  return (
                    <div key={talla} className="col-span-1 text-center">
                      <p className="text-body-sm font-medium text-foreground">
                        {saldo?.saldo ?? 0}
                      </p>
                    </div>
                  )
                })}

                <div className="col-span-1 text-right">
                  <p className="text-body-sm font-semibold text-foreground">{totalBodega}</p>
                </div>

                <div className="col-span-2 text-right">
                  <p className="text-body-sm text-foreground">
                    ${cpp?.toFixed(2) ?? '—'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Total row */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-black/2 font-semibold">
          <div className="col-span-2">
            <p className="text-body-sm font-semibold text-foreground">TOTAL</p>
          </div>

          {tallasUnicas.map(talla => {
            const total = saldosFiltrados
              .filter(s => s.talla === talla)
              .reduce((sum, s) => sum + s.saldo, 0)
            return (
              <div key={talla} className="col-span-1 text-center">
                <p className="text-body-sm font-semibold text-foreground">{total}</p>
              </div>
            )
          })}

          <div className="col-span-1 text-right">
            <p className="text-body-sm font-semibold text-foreground">
              {saldosFiltrados.reduce((sum, s) => sum + s.saldo, 0)}
            </p>
          </div>

          <div className="col-span-2 text-right">
            <p className="text-body-sm text-foreground">—</p>
          </div>
        </div>
      </div>
    </div>
  )
}
