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
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin saldos de productos terminados</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1.5 rounded-[22px] border border-slate-200">
          <button
            onClick={() => setAgrupacion('referencia')}
            className={`px-5 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
              agrupacion === 'referencia'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Por Referencia
          </button>
          <button
            onClick={() => setAgrupacion('bodega')}
            className={`px-5 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
              agrupacion === 'bodega'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Por Bodega
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-800 shadow-lg shadow-slate-200"
        >
          <Download className="w-4 h-4" />
          Exportar Matriz (CSV)
        </button>
      </div>

      {/* Matriz */}
      <div className="space-y-4">
        {grupos.map(grupo => {
          const isExpanded = expandedGroups[grupo.referencia] ?? true

          return (
            <div key={grupo.referencia} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group">
              {/* Header collapsible */}
              <button
                type="button"
                onClick={() =>
                  setExpandedGroups(prev => ({
                    ...prev,
                    [grupo.referencia]: !prev[grupo.referencia],
                  }))
                }
                className="w-full px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-lg bg-slate-50 border border-slate-100 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="font-black text-slate-900 text-sm tracking-tight truncate">
                    {grupo.referencia}
                  </span>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Stock Total</p>
                    <p className="text-sm font-black text-slate-900">{grupo.totalUnidades.toLocaleString()} uts</p>
                  </div>
                  <div className="text-right border-l border-slate-100 pl-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Valorización</p>
                    <p className="text-sm font-black text-slate-900">${(grupo.totalValor || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </button>

              {/* Contenido: tabla matricial */}
              {isExpanded && (
                <div className="border-t border-slate-50 p-6 bg-slate-50/20">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            {agrupacion === 'referencia' ? 'Destino / Bodega' : 'Referencia Prod'}
                          </th>
                          {tallasReales.map(talla => (
                            <th
                              key={talla}
                              className="text-center py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2"
                            >
                              {talla}
                            </th>
                          ))}
                          <th className="text-right py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Subtotal
                          </th>
                          <th className="text-right py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">
                            Valor Rep.
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {grupo.rows.map(row => (
                          <tr key={row.id} className="hover:bg-white transition-colors group/row">
                            <td className="py-4 whitespace-nowrap">
                              <span className="text-xs font-bold text-slate-700 group-hover/row:text-primary-600 transition-colors">
                                {row.label}
                              </span>
                            </td>
                            {tallasReales.map(talla => {
                              const saldoParaTalla = row.tallas[talla] || 0
                              return (
                                <td
                                  key={talla}
                                  className={`text-center py-4 px-2 text-xs font-black ${
                                    saldoParaTalla > 0 ? 'text-slate-900' : 'text-slate-200'
                                  }`}
                                >
                                  {saldoParaTalla > 0 ? saldoParaTalla.toFixed(0) : '—'}
                                </td>
                              )
                            })}
                            <td className="text-right py-4 whitespace-nowrap">
                              <p className="text-xs font-black text-slate-900">{row.total.toFixed(0)}</p>
                            </td>
                            <td className="text-right py-4 whitespace-nowrap pl-6">
                              <p className="text-xs font-bold text-slate-400">${(row.valor || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
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
