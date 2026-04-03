'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatDate } from '@/shared/lib/utils'
import { createOrdenProduccion } from '@/features/ordenes-produccion/services/op-actions'

interface OVItem {
  id: string
  codigo: string
  fecha_entrega: string
  terceros: { nombre: string } | null
  ov_detalle: {
    id: string
    producto_id: string
    talla: string
    cantidad: number
    cantidad_disponible: number
    productos: { nombre: string; referencia: string } | null
  }[]
}

interface Taller {
  id: string
  nombre: string
  capacidad_diaria: number | null
}

interface Props {
  ovs: OVItem[]
  talleres: Taller[]
  ovPreseleccionada?: string
}

export function OPForm({ ovs, talleres, ovPreseleccionada }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [ovId, setOvId] = useState(ovPreseleccionada ?? '')
  const [tallerId, setTallerId] = useState('')
  const [fechaPromesa, setFechaPromesa] = useState('')
  const [notas, setNotas] = useState('')
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const ovSeleccionada = useMemo(() => ovs.find(o => o.id === ovId), [ovs, ovId])

  // Inicializar cantidades con los valores disponibles de la OV cuando cambia la selección
  function handleOVChange(id: string) {
    setOvId(id)
    setCantidades({})
    const ov = ovs.find(o => o.id === id)
    if (ov) {
      const initial: Record<string, number> = {}
      ov.ov_detalle.forEach(d => {
        initial[d.id] = d.cantidad_disponible
      })
      setCantidades(initial)
    }
  }

  // Cuando se selecciona una OV al montar (preseleccionada), inicializar cantidades
  useState(() => {
    if (ovPreseleccionada) handleOVChange(ovPreseleccionada)
  })

  function handleCantidad(detalleId: string, valor: string) {
    const num = parseInt(valor) || 0
    setCantidades(prev => ({ ...prev, [detalleId]: Math.max(0, num) }))
  }

  function calcularTotalLineas() {
    if (!ovSeleccionada) return 0
    return ovSeleccionada.ov_detalle.reduce((s, d) => s + (cantidades[d.id] ?? d.cantidad_disponible), 0)
  }

  function hayDisponible() {
    if (!ovSeleccionada) return false
    return ovSeleccionada.ov_detalle.some(d => d.cantidad_disponible > 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!ovId) { setError('Selecciona una OV'); return }
    if (!tallerId) { setError('Selecciona un taller'); return }
    if (!fechaPromesa) { setError('Indica la fecha promesa'); return }

    const lineas = ovSeleccionada?.ov_detalle
      .filter(d => (cantidades[d.id] ?? d.cantidad) > 0)
      .map(d => ({
        producto_id: d.producto_id,
        producto_nombre: d.productos?.nombre ?? '',
        talla: d.talla,
        cantidad_asignada: cantidades[d.id] ?? d.cantidad,
      })) ?? []

    if (lineas.length === 0) {
      setError('Al menos una línea debe tener cantidad mayor a 0')
      return
    }

    startTransition(async () => {
      const result = await createOrdenProduccion({
        ov_id: ovId,
        taller_id: tallerId,
        fecha_promesa: fechaPromesa,
        notas: notas || undefined,
        lineas,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(`/ordenes-produccion/${result.data?.id}`)
    })
  }

  // Agrupar detalle de OV por producto
  const porProducto = useMemo(() => {
    if (!ovSeleccionada) return {}
    return ovSeleccionada.ov_detalle.reduce<Record<string, {
      referencia: string
      nombre: string
      lineas: typeof ovSeleccionada.ov_detalle
    }>>((acc, det) => {
      const key = det.productos?.referencia ?? 'sin-ref'
      if (!acc[key]) {
        acc[key] = {
          referencia: det.productos?.referencia ?? '',
          nombre: det.productos?.nombre ?? 'Producto desconocido',
          lineas: [],
        }
      }
      acc[key].lineas.push(det)
      return acc
    }, {})
  }, [ovSeleccionada])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* OV y Taller */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-body-md">Datos de la Orden</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* OV */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Orden de Venta <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select
                value={ovId}
                onChange={e => handleOVChange(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                required
              >
                <option value="">Seleccionar OV...</option>
                {ovs.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.codigo} — {o.terceros?.nombre ?? 'Sin cliente'} (entrega: {formatDate(o.fecha_entrega)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Taller */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Taller <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select
                value={tallerId}
                onChange={e => setTallerId(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                required
              >
                <option value="">Seleccionar taller...</option>
                {talleres.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}{t.capacidad_diaria ? ` (cap. ${t.capacidad_diaria}/día)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha promesa */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Fecha Promesa <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <input
                type="date"
                value={fechaPromesa}
                onChange={e => setFechaPromesa(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none"
                required
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">Notas (opcional)</label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <input
                type="text"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Instrucciones al taller..."
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Líneas de la OV */}
      {ovSeleccionada && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-body-md">Cantidades por Talla</h2>
            <span className="text-muted-foreground text-body-sm">
              Total: {calcularTotalLineas()} uds
            </span>
          </div>
          <p className="text-muted-foreground text-body-sm -mt-2">
            {hayDisponible() ? 'Ajusta las cantidades que irán a este taller' :
            <span className="text-red-600">No hay unidades disponibles en esta OV</span>}
          </p>

          <div className="space-y-3">
            {Object.values(porProducto).map(({ referencia, nombre, lineas }) => (
              <div key={referencia} className="rounded-xl bg-neu-base shadow-neu overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5">
                  <span className="font-semibold text-foreground text-body-sm">{referencia}</span>
                  <span className="text-muted-foreground text-body-sm ml-2">{nombre}</span>
                </div>
                <div className="px-4 py-3">
                  <div className="rounded-xl bg-neu-base shadow-neu-inset overflow-x-auto">
                    <table className="w-full text-body-sm">
                      <thead>
                        <tr className="border-b border-black/5">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Talla</th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground text-xs">Total</th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground text-xs">Disponible</th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground">Esta OP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map(linea => (
                          <tr key={linea.id} className="border-b border-black/5 last:border-0">
                            <td className="px-3 py-2">
                              <span className={cn(
                                'inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs font-bold',
                                'bg-neu-base shadow-neu-inset text-foreground'
                              )}>
                                {linea.talla}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-muted-foreground text-xs">{linea.cantidad}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={cn(
                                'text-xs font-semibold',
                                linea.cantidad_disponible === 0 ? 'text-red-600' : 'text-foreground'
                              )}>
                                {linea.cantidad_disponible}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={linea.cantidad_disponible}
                                  disabled={linea.cantidad_disponible === 0}
                                  value={cantidades[linea.id] ?? linea.cantidad_disponible}
                                  onChange={e => handleCantidad(linea.id, e.target.value)}
                                  className="w-20 text-center bg-neu-base rounded-lg shadow-neu-inset-sm px-2 py-1.5 outline-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      {ovSeleccionada && tallerId && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-5 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-body-sm">
              {talleres.find(t => t.id === tallerId)?.nombre ?? '—'}
            </p>
            <p className="font-bold text-foreground">{calcularTotalLineas()} unidades a enviar</p>
          </div>
          <button
            type="submit"
            disabled={isPending || !hayDisponible()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neu-base shadow-neu text-primary-700 font-bold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60 hover:shadow-neu-lg"
            title={!hayDisponible() ? 'No hay unidades disponibles en esta OV' : ''}
          >
            {isPending ? 'Creando...' : 'Crear OP'}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-body-sm">
          {error}
        </div>
      )}
    </form>
  )
}
