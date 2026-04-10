'use client'

import { useState, useMemo, useEffect } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import type { SaldoPT } from '../services/kardex-actions'

interface Props {
  saldos: SaldoPT[]
  tallas?: string[]
  agrupacionPor?: 'referencia' | 'bodega'
}

interface MatrixRow {
  id: string
  label: string
  tallas: Record<string, number>
  total: number
  valor: number
}

interface ReferenciaGroup {
  referencia: string
  bodega?: string
  rows: MatrixRow[]
  totalUnidades: number
  totalValor: number
}

const TALLAS_STANDARD = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'One Size',
  'Custom',
]

export function SaldosPTMatriz({ saldos, tallas = TALLAS_STANDARD, agrupacionPor = 'referencia' }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [agrupacion, setAgrupacion] = useState<'referencia' | 'bodega'>(agrupacionPor)

  // Obtener tallas únicas que realmente existen en los saldos
  const tallasReales = useMemo(() => {
    const set = new Set<string>()
    for (const s of saldos) {
      if (s.talla) set.add(s.talla)
    }
    return set.size > 0 ? Array.from(set).sort() : tallas
  }, [saldos, tallas])

  // Agrupar saldos
  const grupos: ReferenciaGroup[] = useMemo(() => {
    if (agrupacion === 'referencia') {
      const map = new Map<string, SaldoPT[]>()
      for (const s of saldos) {
        const key = s.referencia
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(s)
      }

      return Array.from(map.entries())
        .map(([ref, prods]) => {
          // Agrupar productos por bodega para la matriz
          const rowMap = new Map<string, MatrixRow>()
          for (const p of prods) {
            const rowId = p.bodega_id
            if (!rowMap.has(rowId)) {
              rowMap.set(rowId, {
                id: rowId,
                label: p.bodega_nombre || 'Sin bodega',
                tallas: {},
                total: 0,
                valor: 0,
              })
            }
            const row = rowMap.get(rowId)!
            const tallaKey = p.talla || 'N/A'
            row.tallas[tallaKey] = (row.tallas[tallaKey] || 0) + p.saldo
            row.total += p.saldo
            row.valor += p.valor_total || 0
          }

          const sortedRows = Array.from(rowMap.values()).sort((a, b) =>
            a.label.localeCompare(b.label)
          )

          return {
            referencia: ref,
            rows: sortedRows,
            totalUnidades: prods.reduce((s, p) => s + p.saldo, 0),
            totalValor: prods.reduce((s, p) => s + (p.valor_total || 0), 0),
          }
        })
        .sort((a, b) => a.referencia.localeCompare(b.referencia))
    } else {
      // Agrupar por bodega
      const map = new Map<string, SaldoPT[]>()
      for (const s of saldos) {
        const key = s.bodega_nombre
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(s)
      }

      return Array.from(map.entries())
        .map(([bodega, prods]) => {
          // Agrupar productos por referencia para la matriz
          const rowMap = new Map<string, MatrixRow>()
          for (const p of prods) {
            const rowId = p.producto_id
            if (!rowMap.has(rowId)) {
              rowMap.set(rowId, {
                id: rowId,
                label: p.referencia || 'Sin referencia',
                tallas: {},
                total: 0,
                valor: 0,
              })
            }
            const row = rowMap.get(rowId)!
            const tallaKey = p.talla || 'N/A'
            row.tallas[tallaKey] = (row.tallas[tallaKey] || 0) + p.saldo
            row.total += p.saldo
            row.valor += p.valor_total || 0
          }

          const sortedRows = Array.from(rowMap.values()).sort((a, b) =>
            a.label.localeCompare(b.label)
          )

          return {
            referencia: bodega,
            bodega,
            rows: sortedRows,
            totalUnidades: prods.reduce((s, p) => s + p.saldo, 0),
            totalValor: prods.reduce((s, p) => s + (p.valor_total || 0), 0),
          }
        })
        .sort((a, b) => a.referencia.localeCompare(b.referencia))
    }
  }, [saldos, agrupacion])

  // Auto-expand cuando se agrega nuevo grupo
  useEffect(() => {
    setExpandedGroups(prev => {
      const next = { ...prev }
      for (const g of grupos) {
        if (!(g.referencia in next)) {
          next[g.referencia] = true
        }
      }
      return next
    })
  }, [grupos])

  const handleExportCSV = () => {
    const headers = [
      agrupacion === 'referencia' ? 'Referencia' : 'Bodega',
      'Bodega',
      'Referencia',
      'Talla',
      'Saldo',
      'CPP',
      'Valor Total',
    ]
    const rows = saldos.map(s => [
      agrupacion === 'referencia' ? s.referencia : s.bodega_nombre,
      s.bodega_nombre,
      s.referencia,
      s.talla || '—',
      s.saldo.toFixed(0),
      (s.costo_promedio ?? 0).toFixed(2),
      (s.valor_total ?? 0).toFixed(2),
    ])

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `saldos-pt-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (saldos.length === 0) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
        <p className="text-body-sm text-muted-foreground">Sin saldos de productos terminados</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setAgrupacion('referencia')}
            className={`px-3 py-2 rounded-lg text-body-sm font-medium transition-all ${
              agrupacion === 'referencia'
                ? 'bg-primary-100 text-primary-700 shadow-neu'
                : 'bg-neu-base shadow-neu text-muted-foreground hover:text-foreground'
            }`}
          >
            Por Referencia
          </button>
          <button
            onClick={() => setAgrupacion('bodega')}
            className={`px-3 py-2 rounded-lg text-body-sm font-medium transition-all ${
              agrupacion === 'bodega'
                ? 'bg-primary-100 text-primary-700 shadow-neu'
                : 'bg-neu-base shadow-neu text-muted-foreground hover:text-foreground'
            }`}
          >
            Por Bodega
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all hover:shadow-neu-lg active:shadow-neu-inset"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </button>
      </div>

      {/* Matriz */}
      <div className="space-y-3">
        {grupos.map(grupo => {
          const isExpanded = expandedGroups[grupo.referencia] ?? true

          return (
            <div key={grupo.referencia} className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
              {/* Header collapsible */}
              <button
                type="button"
                onClick={() =>
                  setExpandedGroups(prev => ({
                    ...prev,
                    [grupo.referencia]: !prev[grupo.referencia],
                  }))
                }
                className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-black/2 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${
                      isExpanded ? '' : '-rotate-90'
                    }`}
                  />
                  <span className="font-semibold text-foreground text-body-md">
                    {grupo.referencia}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-body-sm shrink-0">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{grupo.totalUnidades}</span> uds
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      ${(grupo.totalValor || 0).toFixed(2)}
                    </span>
                  </span>
                </div>
              </button>

              {/* Contenido: tabla matricial */}
              {isExpanded && (
                <div className="border-t border-black/5 p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-black/5">
                          {agrupacion === 'referencia' && (
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                              Bodega
                            </th>
                          )}
                          {agrupacion === 'bodega' && (
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                              Referencia
                            </th>
                          )}
                          {tallasReales.map(talla => (
                            <th
                              key={talla}
                              className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase"
                            >
                              {talla}
                            </th>
                          ))}
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                            Total
                          </th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {grupo.rows.map(row => (
                          <tr key={row.id} className="hover:bg-black/2">
                            <td className="px-3 py-2 text-body-sm">
                              {agrupacion === 'referencia' ? (
                                <span className="text-muted-foreground">{row.label}</span>
                              ) : (
                                <span className="font-mono font-medium text-foreground">
                                  {row.label}
                                </span>
                              )}
                            </td>
                            {tallasReales.map(talla => {
                              const saldoParaTalla = row.tallas[talla] || 0
                              return (
                                <td
                                  key={talla}
                                  className="text-center px-3 py-2 text-body-sm font-medium text-foreground"
                                >
                                  {saldoParaTalla > 0 ? saldoParaTalla.toFixed(0) : '—'}
                                </td>
                              )
                            })}
                            <td className="text-right px-3 py-2 text-body-sm font-medium text-foreground">
                              {row.total.toFixed(0)} un.
                            </td>
                            <td className="text-right px-3 py-2 text-body-sm font-medium text-foreground">
                              ${(row.valor || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
