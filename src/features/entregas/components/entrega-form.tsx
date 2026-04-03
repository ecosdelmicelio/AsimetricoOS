'use client'

import { useState, useTransition, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { createEntrega } from '@/features/entregas/services/entregas-actions'

export interface LineaOPSimple {
  producto_id: string
  referencia: string
  nombre: string
  talla: string
  cantidad_asignada: number
}

interface Props {
  opId: string
  lineasOP: LineaOPSimple[]
  onSuccess: () => void
  onCancel: () => void
}

export function EntregaForm({ opId, lineasOP, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [cantidades, setCantidades] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    lineasOP.forEach(l => { init[`${l.producto_id}:${l.talla}`] = '' })
    return init
  })
  const [error, setError] = useState<string | null>(null)

  // Agrupar referencias únicas (sorted)
  const referencias = useMemo(() => {
    const refs = new Set(lineasOP.map(l => l.referencia))
    return Array.from(refs).sort()
  }, [lineasOP])

  // Agrupar tallas únicas (sorted)
  const tallas = useMemo(() => {
    const tallaSet = new Set(lineasOP.map(l => l.talla))
    return Array.from(tallaSet).sort()
  }, [lineasOP])

  function handleCantidad(key: string, valor: string) {
    const num = parseInt(valor) || 0
    setCantidades(prev => ({ ...prev, [key]: Math.max(0, num).toString() }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const lineas = lineasOP
      .map(l => ({
        producto_id: l.producto_id,
        talla: l.talla,
        cantidad_entregada: parseInt(cantidades[`${l.producto_id}:${l.talla}`]) || 0,
      }))
      .filter(l => l.cantidad_entregada > 0)

    if (lineas.length === 0) {
      setError('Ingresa al menos una cantidad mayor a 0')
      return
    }

    startTransition(async () => {
      const res = await createEntrega({ op_id: opId, fecha_entrega: fecha, notas: notas || undefined, lineas })
      if (res.error) { setError(res.error); return }
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">
            Fecha de Entrega <span className="text-red-500">*</span>
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
              placeholder="Observaciones..."
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Matriz horizontal: Tallas como columnas */}
      <div className="space-y-2">
        <p className="text-body-sm font-medium text-foreground">Unidades a entregar</p>
        <div className="rounded-xl bg-neu-base shadow-neu-inset overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Ref</th>
                {tallas.map(talla => (
                  <th key={talla} className="text-center px-2 py-2 font-medium text-muted-foreground text-xs min-w-14">
                    {talla}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referencias.map(ref => {
                const lineasRef = lineasOP.filter(l => l.referencia === ref)
                return (
                  <tr key={ref} className="border-b border-black/5 last:border-0">
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-primary-600">{ref}</span>
                    </td>
                    {tallas.map(talla => {
                      const linea = lineasRef.find(l => l.talla === talla)
                      const key = linea ? `${linea.producto_id}:${linea.talla}` : null

                      return (
                        <td key={talla} className="px-2 py-1.5 text-center">
                          {key && linea ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <input
                                type="number"
                                min={0}
                                max={linea.cantidad_asignada}
                                value={cantidades[key] ?? ''}
                                onChange={e => handleCantidad(key, e.target.value)}
                                placeholder="0"
                                className="w-12 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-1 py-1 outline-none text-foreground text-xs"
                              />
                              <span className="text-xs text-muted-foreground">/{linea.cantidad_asignada}</span>
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

      {error && <p className="text-red-600 text-body-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-neu-base shadow-neu text-body-sm text-muted-foreground hover:text-foreground transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Registrar Entrega
        </button>
      </div>
    </form>
  )
}
