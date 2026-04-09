'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Loader2, ChevronDown, Trash2 } from 'lucide-react'
import { consolidarMaterialesDelCorte, type MaterialConsolidado, getSumaCortesPrevios, getTotalAsignadoOP, createReporteCorte, updateReporteCorte } from '@/features/reporte-corte/services/reporte-corte-actions'
import type { ReporteCorteCompleto } from '@/features/reporte-corte/types'
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

interface ProgresoCorte {
  totalAsignado: number
  totalCortadoPrevio: number
  maximo105: number
  espacioDisponible: number
}

interface Props {
  opId: string
  lineasOP: LineaOPSimple[]
  bodegaTallerId: string | null
  reporteAEditar?: ReporteCorteCompleto | null
  onEditComplete?: () => void
}

export function ReporteCorteMejorado({ opId, lineasOP, bodegaTallerId, reporteAEditar, onEditComplete }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isLoadingMateriales, setIsLoadingMateriales] = useState(false)
  const [isLoadingProgreso, setIsLoadingProgreso] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fecha, setFecha] = useState(reporteAEditar?.fecha ?? new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState(reporteAEditar?.notas ?? '')
  const [materiales, setMateriales] = useState<MaterialConsolidado[]>([])
  const [consumosPorMaterial, setConsumosPorMaterial] = useState<Record<string, ConsumoPorMaterial>>({})
  // Estado para cantidades cortadas editables
  const [cantidadesCortadas, setCantidadesCortadas] = useState<Record<string, Record<string, number>>>({})
  // Estado para referencias expandidas en la matriz
  const [expandedRefs, setExpandedRefs] = useState<Record<string, boolean>>({})
  // Estado para progreso de corte
  const [infoProgreso, setInfoProgreso] = useState<ProgresoCorte | null>(null)

  // Cargar información de progreso (cortes previos, total asignado, límite 105%)
  useEffect(() => {
    const cargarProgreso = async () => {
      setIsLoadingProgreso(true)
      try {
        const [totalAsignado, { totalCortado: totalCortadoPrevio }] = await Promise.all([
          getTotalAsignadoOP(opId),
          getSumaCortesPrevios(opId),
        ])

        const maximo103 = totalAsignado * 1.03
        const espacioDisponible = maximo103 - totalCortadoPrevio

        setInfoProgreso({
          totalAsignado,
          totalCortadoPrevio,
          maximo105: maximo103,
          espacioDisponible,
        })
      } catch (err) {
        console.error('Error cargando progreso:', err)
      }
      setIsLoadingProgreso(false)
    }

    cargarProgreso()
  }, [opId])

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
          // BLINDAJE: Calculamos el consumo basado en la cantidad asignada original 
          // para que la tela sea VISIBLE desde el primer segundo, incluso antes de escribir cantidades.
          const cantidadParaCalculo = material.referencias_que_usan.reduce(
            (sum, ref) => sum + (ref.cantidad_asignada ?? 0),
            0
          )

          const consumoPromedio = cantidadParaCalculo > 0
            ? material.consumo_estimado / cantidadParaCalculo
            : 0

          consumosIniciales[material.material_id] = {
            consumo_promedio: consumoPromedio,
            desperdicio_kg: 0,
          }
        }
        setConsumosPorMaterial(consumosInciales => ({
          ...consumosInciales,
          ...consumosIniciales
        }))
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
    if (isSaving) return;
    setError(null)

    if (!fecha.trim()) {
      setError('Selecciona una fecha')
      return
    }

    // Validar que hay al menos una cantidad cortada > 0
    const totalCortado = gruposPorRefColor.reduce((sum, g) => sum + g.totalUds, 0)
    if (totalCortado === 0) {
      setError('Ingresa al menos una cantidad cortada > 0')
      return
    }

    // VALIDACIÓN: Verificar límite del 103% (solo si no estamos editando)
    if (!reporteAEditar && infoProgreso) {
      const totalNuevo = infoProgreso.totalCortadoPrevio + totalCortado
      if (totalNuevo > infoProgreso.maximo105) {
        setError(
          `No puedes cortar ${totalCortado} uds más. ` +
          `Ya cortadas: ${infoProgreso.totalCortadoPrevio}. ` +
          `Máximo permitido: ${infoProgreso.maximo105.toFixed(0)} uds (103% de ${infoProgreso.totalAsignado}). ` +
          `Espacio disponible: ${infoProgreso.espacioDisponible.toFixed(0)} uds.`
        )
        return
      }
    }

    // Filtrar materiales con consumo_promedio > 0
    const materialesConConsumo = materiales.filter(
      m => consumosPorMaterial[m.material_id]?.consumo_promedio > 0
    )

    if (materialesConConsumo.length === 0) {
      setError('Registra al menos una tela con consumo > 0')
      return
    }

    if (!bodegaTallerId) {
      setError('La bodega del taller no está configurada')
      return
    }

    // Construir datos para server action
    setIsSaving(true)
    startTransition(async () => {
      const input = {
        op_id: opId,
        fecha,
        notas: notas || undefined,
        bodega_id: bodegaTallerId,
        cantidad_total_cortada: totalCortado,
        referencias_cortadas_detalle: gruposPorRefColor.flatMap(grupo => 
          Object.entries(grupo.cantidadesCortadas)
            .filter(([_, cant]) => cant > 0)
            .map(([talla, cant]) => ({
              producto_id: grupo.producto_id,
              talla,
              cantidad_cortada: cant,
              color: grupo.color
            }))
        ),
        consumo_materiales: materialesConConsumo.map(m => {
          const consumo = consumosPorMaterial[m.material_id]
          const cantidadTotalActual = m.referencias_que_usan.reduce(
            (sum, ref) => sum + (ref.cantidad_real_cortada ?? 0),
            0
          )
          const metros_usados = (consumo?.consumo_promedio ?? 0) * cantidadTotalActual

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
      }

      // Si estamos editando, usar updateReporteCorte, sino createReporteCorte
      const res = reporteAEditar
        ? await updateReporteCorte(reporteAEditar.id, input)
        : await createReporteCorte(input)

      if (res.error) {
        setError(res.error)
        setIsSaving(false)
        return
      }

      setIsSaving(false)

      // Cerrar modal en ambos casos (creación y edición)
      if (onEditComplete) {
        onEditComplete()
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* SECCIÓN 0: DATOS DEL CORTE (Compacto e Industrial) */}
      <div className="rounded-xl bg-white border border-slate-100 p-2.5 shadow-sm">
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 shadow-sm">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">FECHA</label>
            <input
              type="date"
              value={fecha}
              onChange={e => {
                setFecha(e.target.value)
                setError(null)
              }}
              className="bg-transparent border-none p-0 text-[12px] font-black focus:ring-0 outline-none w-full text-slate-900"
            />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 shadow-sm">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">NOTAS</label>
            <input
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Notas op..."
              className="bg-transparent border-none p-0 text-[12px] font-black focus:ring-0 outline-none w-full placeholder:text-slate-300 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: PROGRESO (Resumen compacto) */}
      {isLoadingProgreso ? (
        <div className="rounded-xl bg-slate-50 p-3 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
          <p className="text-[10px] text-slate-400 font-bold uppercase">Cargando...</p>
        </div>
      ) : infoProgreso ? (
        <div className="rounded-xl bg-slate-100/50 border border-slate-200 p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Asignado</p>
              <p className="text-sm font-black text-slate-900">{infoProgreso.totalAsignado}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cortadas</p>
              <p className="text-sm font-black text-primary-600">{infoProgreso.totalCortadoPrevio}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Máximo</p>
              <p className="text-sm font-black text-slate-900">{infoProgreso.maximo105.toFixed(0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Disponible</p>
              <p className={`text-sm font-black ${infoProgreso.espacioDisponible > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {infoProgreso.espacioDisponible.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* SECCIÓN 2: REFERENCIAS A CORTAR */}
      <div className="rounded-xl bg-white border border-slate-100 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Cantidades</h3>
          {gruposPorRefColor.length > 0 && (
            <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
              {gruposPorRefColor.length} Refs
            </span>
          )}
        </div>

        {gruposPorRefColor.length === 0 ? (
          <div className="text-[10px] text-slate-400 font-bold uppercase text-center py-2">No hay referencias</div>
        ) : (
          <div className="space-y-2">
            {gruposPorRefColor.map(grupo => {
              const refColorKey = `${grupo.referencia}|${grupo.color}`
              const isExpanded = expandedRefs[refColorKey] ?? true
              const tallasSorted = Array.from(grupo.lineas.map(l => l.talla)).sort((a, b) => {
                const indexA = TALLAS_STANDARD.indexOf(a as any)
                const indexB = TALLAS_STANDARD.indexOf(b as any)
                return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB)
              })

              return (
                <div key={refColorKey} className="rounded-lg border border-slate-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedRefs(prev => ({ ...prev, [refColorKey]: !prev[refColorKey] }))}
                    className="w-full px-3 py-2 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                      <div className="text-left">
                        <p className="text-[12px] font-black text-slate-900 truncate uppercase tracking-tight">{grupo.referencia}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{grupo.color ?? 'Sin color'}</p>
                      </div>
                    </div>
                    <p className="text-[14px] font-black text-primary-600">{grupo.totalUds} uds</p>
                  </button>

                  {isExpanded && (
                    <div className="p-3 bg-white border-t border-slate-50">
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {tallasSorted.map(talla => {
                          const cantidad = grupo.cantidadesCortadas[talla] ?? 0
                          const original = grupo.lineas.find(l => l.talla === talla)?.cantidad_asignada ?? 0

                          return (
                            <div key={talla} className="flex flex-col items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{talla}</span>
                              <input
                                type="number"
                                min="0"
                                value={cantidad || ''}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0
                                  actualizarCantidadCortada(refColorKey, talla, Math.max(0, val))
                                }}
                                className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg px-1 py-1.5 text-[14px] font-black focus:border-primary-500 focus:bg-white transition-all outline-none shadow-sm"
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 3: CONSUMO DE TELAS */}
      <div className="rounded-xl bg-white border border-slate-100 p-3 space-y-3">
        <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Consumo Telas</h3>

        {isLoadingMateriales ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-primary-600 mr-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">Cargando telas...</p>
          </div>
        ) : materiales.length === 0 ? (
          <div className="text-[10px] text-slate-400 font-bold uppercase text-center py-2">No se encontraron telas</div>
        ) : (
          <div className="space-y-2">
            {materiales.map(material => {
              const cantidadTotal = material.referencias_que_usan.reduce((sum, ref) => sum + ref.cantidad_asignada, 0)
              const consumoPromedio = consumosPorMaterial[material.material_id]?.consumo_promedio || 0
              const consumoReal = consumoPromedio * cantidadTotal

              return (
                <div key={material.material_id} className="rounded-lg border border-slate-100 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-black text-slate-900 uppercase truncate">{material.material_nombre}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">
                        {material.referencias_que_usan.map(r => r.referencia).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        step={0.001}
                        min={0}
                        value={consumoPromedio || ''}
                        onChange={e => actualizarConsumo(material.material_id, 'consumo_promedio', e.target.value)}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-[12px] font-black outline-none focus:border-primary-500 focus:bg-white transition-all shadow-sm"
                      />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">METROS POR PRENDA</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Total: <span className="text-slate-900 font-black ml-1">{consumoReal.toFixed(2)} {material.material_unidad}</span></span>
                    </div>
                    <div className="flex items-center gap-3 justify-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">DESPERDICIO (KG):</span>
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={consumosPorMaterial[material.material_id]?.desperdicio_kg || ''}
                        onChange={e => actualizarConsumo(material.material_id, 'desperdicio_kg', e.target.value)}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-[12px] font-black outline-none focus:border-primary-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-red-700 text-[9px] font-bold uppercase tracking-widest">{error}</div>}
      </div>

      <button
        onClick={handleGuardar}
        disabled={isSaving || isPending || isLoadingMateriales}
        className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[12px] uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl active:scale-95"
      >
        {(isSaving || isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
        {reporteAEditar ? ((isSaving || isPending) ? 'Guardando...' : 'Actualizar Reporte') : ((isSaving || isPending) ? 'Enviando...' : 'Confirmar Reporte de Corte')}
      </button>
    </div>
  )
}
