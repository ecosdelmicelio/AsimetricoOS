'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createReporteCorte } from '@/features/reporte-corte/services/reporte-corte-actions'

export interface LineaOPSimple {
  producto_id: string
  referencia: string
  nombre: string
  color: string | null
  talla: string
  cantidad_asignada: number
}

interface TendidoState {
  id: string
  color: string
  metros: string
  peso: string
  cantidades: Record<string, string>  // key: `${producto_id}:${talla}`
}

interface Props {
  opId: string
  lineasOP: LineaOPSimple[]
}

function inicializarTendidos(lineasOP: LineaOPSimple[]): TendidoState[] {
  // Agrupar por color único
  const coloresUnicos = [...new Set(lineasOP.map(l => l.color ?? 'Sin color'))]

  return coloresUnicos.map(color => {
    const cantidades: Record<string, string> = {}
    lineasOP
      .filter(l => (l.color ?? 'Sin color') === color)
      .forEach(l => {
        cantidades[`${l.producto_id}:${l.talla}`] = ''
      })

    return {
      id: Math.random().toString(36).slice(2),
      color,
      metros: '',
      peso: '',
      cantidades,
    }
  })
}

export function ReporteCorteeForm({ opId, lineasOP }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [tendidos, setTendidos] = useState<TendidoState[]>(inicializarTendidos(lineasOP))
  const [error, setError] = useState<string | null>(null)

  // Agrupar líneas por color para cada tendido
  const lineasPorColor = useMemo(() => {
    const mapa: Record<string, LineaOPSimple[]> = {}
    lineasOP.forEach(l => {
      const color = l.color ?? 'Sin color'
      if (!mapa[color]) mapa[color] = []
      mapa[color].push(l)
    })
    return mapa
  }, [lineasOP])

  // Agrupar por referencia (para la tabla horizontal)
  const referencias = useMemo(() => {
    const refs = new Set<string>()
    lineasOP.forEach(l => refs.add(l.referencia))
    return Array.from(refs)
  }, [lineasOP])

  // Tallas únicas por color
  const tallasPorColor = useMemo(() => {
    const mapa: Record<string, Set<string>> = {}
    tendidos.forEach(t => {
      mapa[t.color] = new Set(
        lineasPorColor[t.color]?.map(l => l.talla) ?? []
      )
    })
    return mapa
  }, [tendidos, lineasPorColor])

  function actualizarTendido(id: string, field: 'color' | 'metros' | 'peso', value: string) {
    setTendidos(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  function actualizarCantidad(tendidoId: string, key: string, value: string) {
    setTendidos(prev => prev.map(t =>
      t.id === tendidoId
        ? { ...t, cantidades: { ...t.cantidades, [key]: value } }
        : t
    ))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    for (const t of tendidos) {
      if (!t.color.trim()) { setError('Todos los colores deben estar rellenados'); return }
      if (!t.metros || parseFloat(t.metros) <= 0) {
        setError('Los metros usados deben ser mayores a 0'); return
      }
    }

    startTransition(async () => {
      const res = await createReporteCorte({
        op_id: opId,
        fecha,
        notas: notas || undefined,
        tendidos: tendidos.map(t => ({
          color: t.color.trim(),
          metros_usados: parseFloat(t.metros),
          peso_desperdicio_kg: parseFloat(t.peso) || 0,
          lineas: lineasOP
            .filter(l => (l.color ?? 'Sin color') === t.color)
            .map(l => ({
              producto_id: l.producto_id,
              talla: l.talla,
              cantidad_cortada: parseInt(t.cantidades[`${l.producto_id}:${l.talla}`]) || 0,
            })),
        })),
      })
      if (res.error) { setError(res.error); return }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Fecha + Notas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">
            Fecha del Corte <span className="text-red-500">*</span>
          </label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              required
              className="w-full bg-transparent text-body-sm text-foreground outline-none"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Notas (opcional)</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <input
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones del corte..."
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Tendidos por color */}
      <div className="space-y-4">
        {tendidos.map((tendido) => {
          const lineasColor = lineasPorColor[tendido.color] ?? []
          const tallas = Array.from(tallasPorColor[tendido.color] ?? new Set()).sort()

          return (
            <div key={tendido.id} className="rounded-xl bg-neu-base shadow-neu p-4 space-y-4">
              {/* Color / Metros / Peso */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Color <span className="text-red-500">*</span></label>
                  <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2">
                    <input
                      value={tendido.color}
                      onChange={e => actualizarTendido(tendido.id, 'color', e.target.value)}
                      placeholder="Ej: Azul Navy"
                      className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Metros usados <span className="text-red-500">*</span></label>
                  <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={tendido.metros}
                      onChange={e => actualizarTendido(tendido.id, 'metros', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Desperdicio (kg)</label>
                  <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.001}
                      value={tendido.peso}
                      onChange={e => actualizarTendido(tendido.id, 'peso', e.target.value)}
                      placeholder="0.000"
                      className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Matriz horizontal: Tallas como columnas */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Unidades cortadas por referencia y talla</p>
                <div className="rounded-xl bg-neu-base shadow-neu-inset overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-black/5">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Ref</th>
                        {tallas.map(talla => (
                          <th key={talla} className="text-center px-2 py-2 font-medium text-muted-foreground text-xs min-w-12">
                            {talla}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {referencias.map(ref => {
                        // Solo mostrar referencias que tienen líneas en este color
                        const lineasRef = lineasColor.filter(l => l.referencia === ref)
                        if (lineasRef.length === 0) return null

                        return (
                          <tr key={ref} className="border-b border-black/5 last:border-0">
                            <td className="px-3 py-2">
                              <span className="font-mono text-xs text-primary-600">{ref}</span>
                            </td>
                            {tallas.map(talla => {
                              const linea = lineasColor.find(l => l.referencia === ref && l.talla === talla)
                              const key = linea ? `${linea.producto_id}:${linea.talla}` : null

                              return (
                                <td key={talla} className="px-2 py-1.5 text-center">
                                  {key ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <input
                                        type="number"
                                        min={0}
                                        value={tendido.cantidades[key] ?? ''}
                                        onChange={e => actualizarCantidad(tendido.id, key, e.target.value)}
                                        placeholder="0"
                                        className="w-12 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-1 py-1 outline-none text-foreground text-xs"
                                      />
                                      <span className="text-xs text-muted-foreground">/{linea?.cantidad_asignada}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-red-600 text-body-sm">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Registrar Reporte de Corte
      </button>
    </form>
  )
}
