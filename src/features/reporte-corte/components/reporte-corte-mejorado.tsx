'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Loader2, ChevronDown, Trash2 } from 'lucide-react'
import { consolidarMaterialesDelCorte, type MaterialConsolidado } from '@/features/reporte-corte/services/reporte-corte-actions'
import { createReporteCorte } from '@/features/reporte-corte/services/reporte-corte-actions'
import { TALLAS_STANDARD } from '@/shared/constants/tallas'
import type { LineaOPSimple } from './reporte-corte-form'

interface ConsumoPorMaterial {
  consumo_promedio: number
  desperdicio_kg: number
}

interface MaterialConConsumoTotal extends MaterialConsolidado {
  cantidad_total_prendas: number
}

interface GrupoRefColor {
  referencia: string
  color: string | null
  producto_id: string
  lineas: LineaOPSimple[]
  // Cantidades editables por talla
  cantidadesCortadas: Record<string, number>
  // Total de prendas cortadas (suma de todas las tallas)
  totalUds: number
}

interface Props {
  opId: string
  lineasOP: LineaOPSimple[]
  bodegas?: Array<{ id: string; nombre: string }>
}

export function ReporteCorteMejorado({ opId, lineasOP, bodegas = [] }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isLoadingMateriales, setIsLoadingMateriales] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState(bodegas[0]?.id ?? '')
  const [materiales, setMateriales] = useState<MaterialConsolidado[]>([])
  const [consumosPorMaterial, setConsumosPorMaterial] = useState<Record<string, ConsumoPorMaterial>>({})
  // Estado para cantidades cortadas editables
  const [cantidadesCortadas, setCantidadesCortadas] = useState<Record<string, Record<string, number>>>({})
  // Estado para referencias expandidas en la matriz
  const [expandedRefs, setExpandedRefs] = useState<Record<string, boolean>>({})

  // Inicializar cantidades cortadas desde lineasOP
  useEffect(() => {
    if (Object.keys(cantidadesCortadas).length === 0 && lineasOP.length > 0) {
      const grupos = new Map<string, Set<string>>()

      for (const linea of lineasOP) {
        const key = `${linea.referencia}|${linea.color}`
        if (!grupos.has(key)) {
          grupos.set(key, new Set())
        }
        grupos.get(key)!.add(linea.talla)
      }

      const initial: Record<string, Record<string, number>> = {}
      for (const [key, tallas] of grupos.entries()) {
        initial[key] = {}
        for (const talla of tallas) {
          const linea = lineasOP.find(l => `${l.referencia}|${l.color}` === key && l.talla === talla)
          initial[key][talla] = linea?.cantidad_asignada ?? 0
        }
      }
      setCantidadesCortadas(initial)

      // Auto-expandir todas las referencias
      const expanded: Record<string, boolean> = {}
      for (const key of grupos.keys()) {
        expanded[key] = true
      }
      setExpandedRefs(expanded)
    }
  }, [lineasOP])

  // Agrupar referencias seleccionadas por ref+color
  const gruposPorRefColor = useMemo(() => {
    const grupos = new Map<
      string,
      {
        referencia: string
        color: string | null
        producto_id: string
        lineas: LineaOPSimple[]
      }
    >()

    for (const linea of lineasOP) {
      const key = `${linea.referencia}|${linea.color}`
      if (!grupos.has(key)) {
        grupos.set(key, {
          referencia: linea.referencia,
          color: linea.color,
          producto_id: linea.producto_id,
          lineas: [],
        })
      }
      const grupo = grupos.get(key)!
      grupo.lineas.push(linea)
    }

    // Convertir a array y construir grupos con cantidades editables
    const resultado: GrupoRefColor[] = Array.from(grupos.values()).map(g => {
      const key = `${g.referencia}|${g.color}`
      const cantsCortadas = cantidadesCortadas[key] ?? {}
      const totalUds = Object.values(cantsCortadas).reduce((s, q) => s + q, 0)

      return {
        referencia: g.referencia,
        color: g.color,
        producto_id: g.producto_id,
        lineas: g.lineas,
        cantidadesCortadas: cantsCortadas,
        totalUds,
      }
    })

    return resultado
  }, [lineasOP, cantidadesCortadas])

  // Cargar materiales consolidados cuando cambian las referencias o cantidades editadas
  useEffect(() => {
    const cargarMateriales = async () => {
      setIsLoadingMateriales(true)
      setError(null)

      // Construir referenciasAgrupadas CON cantidades editadas
      const referenciasAgrupadas = gruposPorRefColor.map(grupo => ({
        referencia: grupo.referencia,
        color: grupo.color,
        producto_id: grupo.producto_id,
        totalUds: grupo.totalUds, // Suma de cantidadesCortadas por talla
      }))

      const resultado = await consolidarMaterialesDelCorte(referenciasAgrupadas)

      if (resultado.error) {
        setError(resultado.error)
        setMateriales([])
        setConsumosPorMaterial({})
      } else {
        setMateriales(resultado.materiales)

        // Inicializar consumos con el promedio del BOM para cada material
        const consumosIniciales: Record<string, ConsumoPorMaterial> = {}
        for (const material of resultado.materiales) {
          // Calcular cantidad total de prendas que usan este material (con cantidades editadas)
          const cantidadTotal = material.referencias_que_usan.reduce(
            (sum, ref) => sum + ref.cantidad_asignada,
            0
          )

          // El consumo promedio inicial es el estimado dividido por la cantidad total editada
          const consumoPromedio = cantidadTotal > 0
            ? material.consumo_estimado / cantidadTotal
            : 0

          consumosIniciales[material.material_id] = {
            consumo_promedio: consumoPromedio,
            desperdicio_kg: 0,
          }
        }
        setConsumosPorMaterial(consumosIniciales)
      }
      setIsLoadingMateriales(false)
    }

    if (gruposPorRefColor.length > 0) {
      cargarMateriales()
    }
  }, [gruposPorRefColor])

  const actualizarConsumo = (materialId: string, field: string, value: string | number) => {
    setConsumosPorMaterial(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: Math.max(0, parseFloat(String(value)) || 0),
      },
    }))
  }

  const actualizarCantidadCortada = (refColorKey: string, talla: string, valor: string | number) => {
    const num = typeof valor === 'number' ? valor : parseInt(String(valor)) || 0
    setCantidadesCortadas(prev => ({
      ...prev,
      [refColorKey]: {
        ...prev[refColorKey],
        [talla]: Math.max(0, num),
      },
    }))
  }

  const handleGuardar = () => {
    setError(null)

    if (!fecha.trim()) {
      setError('Selecciona una fecha')
      return
    }

    if (!bodegaSeleccionada) {
      setError('Selecciona una bodega de taller')
      return
    }

    // Validar que hay al menos una cantidad cortada > 0
    const totalCortado = gruposPorRefColor.reduce((sum, g) => sum + g.totalUds, 0)
    if (totalCortado === 0) {
      setError('Ingresa al menos una cantidad cortada > 0')
      return
    }

    // Filtrar materiales con consumo_promedio > 0
    const materialesConConsumo = materiales.filter(
      m => consumosPorMaterial[m.material_id]?.consumo_promedio > 0
    )

    if (materialesConConsumo.length === 0) {
      setError('Registra al menos una tela con consumo > 0')
      return
    }

    // Construir datos para server action
    startTransition(async () => {
      const res = await createReporteCorte({
        op_id: opId,
        fecha,
        notas: notas || undefined,
        bodega_id: bodegaSeleccionada,
        consumo_materiales: materialesConConsumo.map(m => {
          const consumo = consumosPorMaterial[m.material_id]
          // Calcular cantidad total de prendas (con cantidades editadas)
          const cantidadTotal = m.referencias_que_usan.reduce(
            (sum, ref) => sum + ref.cantidad_asignada,
            0
          )
          // Calcular consumo real = promedio × cantidad
          const metros_usados = consumo.consumo_promedio * cantidadTotal

          return {
            material_id: m.material_id,
            metros_usados,
            desperdicio_kg: consumo.desperdicio_kg,
            material_devuelto_kg: 0,
            referencias_cortadas: m.referencias_que_usan.map(r => ({
              referencia: r.referencia,
              color: r.color,
              bomMetros: r.consumo_por_unidad,
            })),
          }
        }),
      })

      if (res.error) {
        setError(res.error)
        return
      }

      // Reset
      setFecha(new Date().toISOString().split('T')[0])
      setNotas('')
      setConsumosPorMaterial({})
      setCantidadesCortadas({})
    })
  }

  return (
    <div className="space-y-4">
      {/* SECCIÓN 1: DATOS DEL CORTE */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="font-semibold text-foreground text-body-md">
          Datos del Corte
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              Bodega Taller <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select
                value={bodegaSeleccionada}
                onChange={e => {
                  setBodegaSeleccionada(e.target.value)
                  setError(null)
                }}
                required
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
              >
                <option value="">Seleccionar bodega...</option>
                {bodegas.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
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

      {/* SECCIÓN 2: REFERENCIAS A CORTAR (EDITABLE) */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="font-semibold text-foreground text-body-md">
          Cantidades a Cortar
        </h3>

        <p className="text-body-sm text-muted-foreground">
          Edita las cantidades por talla. Los cambios recalcularán el consumo de telas automáticamente.
        </p>

        {gruposPorRefColor.length === 0 ? (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-yellow-700 text-body-sm">
            No hay referencias en esta orden
          </div>
        ) : (
          <div className="space-y-3">
            {gruposPorRefColor.map(grupo => {
              const refColorKey = `${grupo.referencia}|${grupo.color}`
              const isExpanded = expandedRefs[refColorKey] ?? true
              const tallasSorted = Array.from(grupo.lineas.map(l => l.talla)).sort()

              return (
                <div
                  key={refColorKey}
                  className="rounded-xl bg-neu-base shadow-neu overflow-hidden"
                >
                  {/* Header collapsible */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRefs(prev => ({
                        ...prev,
                        [refColorKey]: !prev[refColorKey],
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
                      <div>
                        <p className="font-semibold text-foreground text-body-sm">
                          {grupo.referencia}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {grupo.color ?? 'Sin color'}
                        </p>
                      </div>
                    </div>
                    <p className="text-display-xs font-bold text-primary-600 shrink-0">
                      {grupo.totalUds} uds
                    </p>
                  </button>

                  {/* Contenido editable */}
                  {isExpanded && (
                    <div className="border-t border-black/5 p-4 space-y-4">
                      {/* Grid de tallas */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {tallasSorted.map(talla => {
                          const cantidad = grupo.cantidadesCortadas[talla] ?? 0
                          const original = grupo.lineas.find(l => l.talla === talla)?.cantidad_asignada ?? 0

                          return (
                            <div key={talla} className="flex flex-col items-center gap-1">
                              <span className="text-muted-foreground text-xs font-medium">
                                {talla}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={cantidad || ''}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0
                                  actualizarCantidadCortada(refColorKey, talla, Math.max(0, val))
                                }}
                                placeholder="0"
                                className="w-12 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1 outline-none text-foreground placeholder:text-muted-foreground/50 text-body-sm"
                              />
                              <span className="text-muted-foreground/60 text-xs">
                                / {original}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Footer resumen */}
                      <div className="flex items-center justify-between pt-2 border-t border-black/5">
                        <span className="text-muted-foreground text-body-sm">
                          <span className="font-semibold text-foreground">{grupo.totalUds}</span> uds cortadas
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 3: CONSUMO DE TELAS CONSOLIDADAS */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="font-semibold text-foreground text-body-md">
          Consumo de Telas
        </h3>

        <p className="text-body-sm text-muted-foreground">
          Registra el consumo promedio por prenda. Los valores se basan en las cantidades que indicaste arriba.
        </p>

        {isLoadingMateriales ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary-600 mr-2" />
            <p className="text-body-sm text-muted-foreground">Cargando telas...</p>
          </div>
        ) : materiales.length === 0 ? (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-yellow-700 text-body-sm">
            No se encontraron telas en el BOM de las referencias seleccionadas
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabla de materiales */}
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left py-2 px-3 font-semibold text-foreground">Tela</th>
                    <th className="text-center py-2 px-3 font-semibold text-foreground">Promedio *</th>
                    <th className="text-center py-2 px-3 font-semibold text-foreground">Cant.</th>
                    <th className="text-center py-2 px-3 font-semibold text-foreground">Real</th>
                    <th className="text-center py-2 px-3 font-semibold text-foreground">Desperd. (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {materiales.map(material => {
                    const cantidadTotal = material.referencias_que_usan.reduce(
                      (sum, ref) => sum + ref.cantidad_asignada,
                      0
                    )
                    const consumoPromedio = consumosPorMaterial[material.material_id]?.consumo_promedio || 0
                    const consumoReal = consumoPromedio * cantidadTotal

                    return (
                      <tr key={material.material_id} className="border-b border-black/5 hover:bg-black/2">
                        <td className="py-3 px-3">
                          <div>
                            <p className="font-medium text-foreground">{material.material_nombre}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {material.referencias_que_usan
                                .map(r => `${r.referencia}${r.color ? ` (${r.color})` : ''}`)
                                .join(', ')}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step={0.001}
                              min={0}
                              placeholder="0"
                              value={consumoPromedio || ''}
                              onChange={e =>
                                actualizarConsumo(material.material_id, 'consumo_promedio', e.target.value)
                              }
                              className="w-16 bg-neu-base shadow-neu-inset rounded px-2 py-1 text-center text-body-sm outline-none"
                            />
                            <span className="text-xs text-muted-foreground shrink-0">{material.material_unidad}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <p className="text-muted-foreground font-medium">{cantidadTotal}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <p className="font-medium text-foreground">{consumoReal.toFixed(2)} {material.material_unidad}</p>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            step={0.01}
                            min={0}
                            placeholder="0"
                            value={consumosPorMaterial[material.material_id]?.desperdicio_kg || ''}
                            onChange={e =>
                              actualizarConsumo(material.material_id, 'desperdicio_kg', e.target.value)
                            }
                            className="w-full bg-neu-base shadow-neu-inset rounded px-2 py-1 text-center text-body-sm outline-none"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground px-2">
              💡 Ingresa el consumo promedio (*) por prenda. El consumo real se calcula automáticamente. El desperdicio es opcional.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-body-sm">
            {error}
          </div>
        )}
      </div>

      {/* BOTÓN GUARDAR */}
      <button
        onClick={handleGuardar}
        disabled={isPending || isLoadingMateriales}
        className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {isPending ? 'Guardando...' : 'Guardar Corte'}
      </button>
    </div>
  )
}
