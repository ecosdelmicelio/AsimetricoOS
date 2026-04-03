'use client'

import { useState, useTransition, useMemo } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { createReporteCorte } from '@/features/reporte-corte/services/reporte-corte-actions'
import type { LineaOPSimple } from './reporte-corte-form'

interface ConsumoMaterial {
  materialId: string
  materialNombre: string
  bomTotal: number
  metrosUsados: number
  desperdicio_kg: number
  material_devuelto_kg: number
  referencias: Array<{
    referencia: string
    color: string | null
    bomMetros: number
  }>
}

interface Props {
  opId: string
  lineasOP: LineaOPSimple[]
}

export function ReporteCorteMejorado({ opId, lineasOP }: Props) {
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<'referencias' | 'consumos'>('referencias')
  const [error, setError] = useState<string | null>(null)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')

  // Estado para consumos de materiales
  const [consumosMateriales, setConsumosMateriales] = useState<Record<string, ConsumoMaterial>>({})

  // Agrupar referencias seleccionadas por ref+color
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

  // Calcular BOM consolidado por material (mock, será real cuando tengamos BOM en BD)
  const materiales = useMemo(() => {
    // Esto es un mock. En realidad buscaría en la tabla BOM
    // Por ahora retorna estructura vacía para que user registre
    const materialesMap = new Map<string, ConsumoMaterial>()

    // Aquí iría la lógica de: para cada referencia seleccionada, buscar su BOM
    // y consolidar por material
    // Por ahora dejamos que el usuario registre los consumos

    return materialesMap
  }, [gruposPorRefColor])

  const handleSiguiente = () => {
    if (!fecha.trim()) {
      setError('Selecciona una fecha')
      return
    }
    setStep('consumos')
    setError(null)
  }

  const handleVolver = () => {
    setStep('referencias')
  }

  const actualizarConsumoPantalla2 = (
    materialName: string,
    field: string,
    value: string | number
  ) => {
    setConsumosMateriales(prev => {
      const existente = prev[materialName]
      if (!existente) return prev

      return {
        ...prev,
        [materialName]: {
          ...existente,
          [field]:
            field === 'metrosUsados'
              ? Math.max(0, parseFloat(String(value)) || 0)
              : Math.max(0, parseFloat(String(value)) || 0),
        },
      }
    })
  }

  const handleGuardar = () => {
    setError(null)

    const materialesConConsumo = Object.values(consumosMateriales).filter(
      m => m.metrosUsados > 0
    )

    if (materialesConConsumo.length === 0) {
      setError('Registra al menos una tela con consumo > 0')
      return
    }

    // Construir datos para server action
    // Por ahora, pasamos las referencias seleccionadas y los consumos de materiales
    const referenciasSeleccionadas = gruposPorRefColor.map(g => ({
      referencia: g.referencia,
      color: g.color,
    }))

    startTransition(async () => {
      const res = await createReporteCorte({
        op_id: opId,
        fecha,
        notas: notas || undefined,
        referencias_seleccionadas: referenciasSeleccionadas,
        consumo_materiales: materialesConConsumo.map(m => ({
          material_id: m.materialId,
          metros_usados: m.metrosUsados,
          desperdicio_kg: m.desperdicio_kg,
          material_devuelto_kg: m.material_devuelto_kg,
          referencias_cortadas: m.referencias,
        })),
      })

      if (res.error) {
        setError(res.error)
        return
      }

      // Reset
      setFecha(new Date().toISOString().split('T')[0])
      setNotas('')
      setConsumosMateriales({})
      setStep('referencias')
    })
  }

  // ============ PANTALLA 1: REFERENCIAS ============
  if (step === 'referencias') {
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

        {/* Referencias a cortar */}
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
          <h3 className="font-semibold text-foreground text-body-md">
            Referencias a Cortar
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

  // ============ PANTALLA 2: CONSUMO DE TELAS ============
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="font-semibold text-foreground text-body-md">
          Registro de Consumo de Telas
        </h3>

        <p className="text-body-sm text-muted-foreground">
          Registra el consumo de cada tela utilizada en este corte
        </p>

        {/* Campos dinámicos para cada material */}
        <div className="space-y-4">
          {gruposPorRefColor.length === 0 ? (
            <p className="text-muted-foreground text-body-sm">
              No hay referencias seleccionadas
            </p>
          ) : (
            // Mostrar ejemplo de entrada para primer material
            <div className="space-y-4">
              <div className="rounded-xl border border-black/5 p-4 space-y-3">
                <div>
                  <p className="font-semibold text-foreground">TELA NEGRA</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se cortarán: {gruposPorRefColor.map(g => `${g.referencia} ${g.color}`).join(', ')}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Metros usados
                    </label>
                    <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        placeholder="50.0"
                        className="w-full bg-transparent text-body-sm text-foreground outline-none"
                        onChange={e =>
                          actualizarConsumoPantalla2('tela_negra', 'metrosUsados', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Desperdicio (kg)
                    </label>
                    <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        placeholder="1.2"
                        className="w-full bg-transparent text-body-sm text-foreground outline-none"
                        onChange={e =>
                          actualizarConsumoPantalla2('tela_negra', 'desperdicio_kg', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Material devuelto (kg)
                    </label>
                    <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        placeholder="0.5"
                        className="w-full bg-transparent text-body-sm text-foreground outline-none"
                        onChange={e =>
                          actualizarConsumoPantalla2(
                            'tela_negra',
                            'material_devuelto_kg',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground px-2">
                💡 Tip: Registra una fila por cada tela utilizada en el corte
              </p>
            </div>
          )}
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
