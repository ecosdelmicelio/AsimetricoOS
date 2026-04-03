'use client'

import { useState, useTransition, useMemo } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { createReporteCorte } from '@/features/reporte-corte/services/reporte-corte-actions'
import type { LineaOPSimple } from './reporte-corte-form'

interface ConsumoLinea {
  productoId: string
  color: string | null
  referencia: string
  talla: string
  cantidadAsignada: number
  cantidadCortada: number
  metrosUsados: number
  desperdicio_kg: number
  material_devuelto_kg: number
}

interface Props {
  opId: string
  lineasOP: LineaOPSimple[]
}

export function ReporteCorteMejorado({ opId, lineasOP }: Props) {
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<'resumen' | 'consumos'>('resumen')
  const [error, setError] = useState<string | null>(null)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')

  // Estado para consumos por línea OP
  const [consumos, setConsumos] = useState<Record<string, ConsumoLinea>>({})

  // Inicializar consumos con cada línea OP
  useMemo(() => {
    const inicial: Record<string, ConsumoLinea> = {}
    for (const linea of lineasOP) {
      const key = `${linea.producto_id}|${linea.talla}`
      inicial[key] = {
        productoId: linea.producto_id,
        color: linea.color,
        referencia: linea.referencia,
        talla: linea.talla,
        cantidadAsignada: linea.cantidad_asignada,
        cantidadCortada: 0,
        metrosUsados: 0,
        desperdicio_kg: 0,
        material_devuelto_kg: 0,
      }
    }
    setConsumos(inicial)
  }, [lineasOP])

  // Agrupar para visualización
  const gruposPorRefColor = useMemo(() => {
    const grupos = new Map<
      string,
      {
        referencia: string
        color: string | null
        lineas: LineaOPSimple[]
        totalUds: number
      }
    >()

    for (const linea of lineasOP) {
      const key = `${linea.referencia}|${linea.color}`
      if (!grupos.has(key)) {
        grupos.set(key, {
          referencia: linea.referencia,
          color: linea.color,
          lineas: [],
          totalUds: 0,
        })
      }
      const grupo = grupos.get(key)!
      grupo.lineas.push(linea)
      grupo.totalUds += linea.cantidad_asignada
    }

    return Array.from(grupos.values())
  }, [lineasOP])

  const handleSiguiente = () => {
    if (!fecha.trim()) {
      setError('Selecciona una fecha')
      return
    }
    setStep('consumos')
    setError(null)
  }

  const handleVolver = () => {
    setStep('resumen')
  }

  const actualizarConsumo = (key: string, field: string, value: string | number) => {
    const consumo = consumos[key]
    if (!consumo) return

    setConsumos({
      ...consumos,
      [key]: {
        ...consumo,
        [field]:
          field === 'cantidadCortada'
            ? Math.max(0, parseInt(String(value)) || 0)
            : Math.max(0, parseFloat(String(value)) || 0),
      },
    })
  }

  const handleGuardar = () => {
    setError(null)

    // Agrupar consumos por referencia+color para crear tendidos
    const tendidosMap = new Map<
      string,
      {
        color: string
        metros_usados: number
        peso_desperdicio_kg: number
        lineas: Array<{
          producto_id: string
          color?: string | null
          material_id?: string | null
          talla: string
          cantidad_cortada: number
          metros_usados: number
          desperdicio_kg: number
          material_devuelto_kg: number
        }>
      }
    >()

    let hayAlgunoConCantidad = false

    for (const consumo of Object.values(consumos)) {
      if (consumo.cantidadCortada > 0) {
        hayAlgunoConCantidad = true
        const key = `${consumo.referencia}|${consumo.color}`

        if (!tendidosMap.has(key)) {
          tendidosMap.set(key, {
            color: consumo.color ?? 'Sin color',
            metros_usados: 0,
            peso_desperdicio_kg: 0,
            lineas: [],
          })
        }

        const tendido = tendidosMap.get(key)!
        tendido.metros_usados += consumo.metrosUsados
        tendido.peso_desperdicio_kg += consumo.desperdicio_kg

        tendido.lineas.push({
          producto_id: consumo.productoId,
          color: consumo.color,
          talla: consumo.talla,
          cantidad_cortada: consumo.cantidadCortada,
          metros_usados: consumo.metrosUsados,
          desperdicio_kg: consumo.desperdicio_kg,
          material_devuelto_kg: consumo.material_devuelto_kg,
        })
      }
    }

    if (!hayAlgunoConCantidad) {
      setError('Registra al menos una cantidad mayor a 0')
      return
    }

    const tendidos = Array.from(tendidosMap.values())

    startTransition(async () => {
      const res = await createReporteCorte({
        op_id: opId,
        fecha,
        notas: notas || undefined,
        tendidos,
      })

      if (res.error) {
        setError(res.error)
        return
      }

      // Reset para nuevo corte
      setFecha(new Date().toISOString().split('T')[0])
      setNotas('')
      const inicial: Record<string, ConsumoLinea> = {}
      for (const linea of lineasOP) {
        const key = `${linea.producto_id}|${linea.talla}`
        inicial[key] = {
          productoId: linea.producto_id,
          color: linea.color,
          referencia: linea.referencia,
          talla: linea.talla,
          cantidadAsignada: linea.cantidad_asignada,
          cantidadCortada: 0,
          metrosUsados: 0,
          desperdicio_kg: 0,
          material_devuelto_kg: 0,
        }
      }
      setConsumos(inicial)
      setStep('resumen')
    })
  }

  if (step === 'resumen') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
          <h3 className="font-semibold text-foreground text-body-md">
            Datos del Corte
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-body-sm font-medium text-foreground">
                Fecha del Corte <span className="text-red-500">*</span>
              </label>
              <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
                <input
                  type="date"
                  value={fecha}
                  onChange={e => {
                    setFecha(e.target.value)
                    setError(null)
                  }}
                  required
                  className="w-full bg-transparent text-body-sm text-foreground outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-body-sm font-medium text-foreground">
                Notas (opcional)
              </label>
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
        </div>

        {/* Resumen de líneas */}
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
          <h3 className="font-semibold text-foreground text-body-md">
            Líneas a Cortar
          </h3>

          <div className="space-y-3">
            {gruposPorRefColor.map(grupo => (
              <div
                key={`${grupo.referencia}|${grupo.color}`}
                className="rounded-xl bg-neu-base shadow-neu-inset p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-body-sm">
                      {grupo.referencia}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {grupo.color ?? 'Sin color'}
                    </p>
                  </div>
                  <p className="text-display-xs font-bold text-primary-600">
                    {grupo.totalUds} uds
                  </p>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  {grupo.lineas.map(linea => (
                    <div key={linea.producto_id + linea.talla}>
                      {linea.talla}: {linea.cantidad_asignada} ud
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-body-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSiguiente}
          className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Siguiente <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="font-semibold text-foreground text-body-md">
          Entrada de Consumos
        </h3>

        {/* Agrupar por referencia + color */}
        <div className="space-y-4">
          {gruposPorRefColor.map(grupo => (
            <div
              key={`${grupo.referencia}|${grupo.color}`}
              className="rounded-xl border border-black/5 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {grupo.referencia} — {grupo.color ?? 'Sin color'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {grupo.totalUds} uds totales
                </p>
              </div>

              {/* Tabla de entrada por talla */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left px-2 py-1 font-medium text-muted-foreground">
                        Talla
                      </th>
                      <th className="text-center px-2 py-1 font-medium text-muted-foreground">
                        Asign.
                      </th>
                      <th className="text-center px-2 py-1 font-medium text-muted-foreground">
                        Cortada
                      </th>
                      <th className="text-center px-2 py-1 font-medium text-muted-foreground">
                        Metros
                      </th>
                      <th className="text-center px-2 py-1 font-medium text-muted-foreground">
                        Desp. (kg)
                      </th>
                      <th className="text-center px-2 py-1 font-medium text-muted-foreground">
                        Dev. (kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.lineas.map(linea => {
                      const key = `${linea.producto_id}|${linea.talla}`
                      const consumo = consumos[key]
                      if (!consumo) return null

                      return (
                        <tr key={key} className="border-b border-black/5 last:border-0">
                          <td className="px-2 py-2 font-mono text-xs">
                            {linea.talla}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {consumo.cantidadAsignada}
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              value={consumo.cantidadCortada}
                              onChange={e =>
                                actualizarConsumo(key, 'cantidadCortada', e.target.value)
                              }
                              className="w-12 text-center bg-neu-base shadow-neu-inset rounded px-1 py-0.5 text-xs"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step={0.1}
                              min={0}
                              value={consumo.metrosUsados}
                              onChange={e =>
                                actualizarConsumo(key, 'metrosUsados', e.target.value)
                              }
                              className="w-12 text-center bg-neu-base shadow-neu-inset rounded px-1 py-0.5 text-xs"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step={0.01}
                              min={0}
                              value={consumo.desperdicio_kg}
                              onChange={e =>
                                actualizarConsumo(key, 'desperdicio_kg', e.target.value)
                              }
                              className="w-12 text-center bg-neu-base shadow-neu-inset rounded px-1 py-0.5 text-xs"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step={0.01}
                              min={0}
                              value={consumo.material_devuelto_kg}
                              onChange={e =>
                                actualizarConsumo(
                                  key,
                                  'material_devuelto_kg',
                                  e.target.value
                                )
                              }
                              className="w-12 text-center bg-neu-base shadow-neu-inset rounded px-1 py-0.5 text-xs"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-body-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleVolver}
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl bg-neu-base shadow-neu text-body-sm text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
        >
          ← Atrás
        </button>
        <button
          onClick={handleGuardar}
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isPending ? 'Guardando...' : 'Guardar Corte'}
        </button>
      </div>
    </div>
  )
}
