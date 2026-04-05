'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/shared/lib/utils'
import { derivarNombreBase, extraerColorDelNombre } from '@/shared/lib/productos-utils'
import { createOrdenProduccion, getServiciosBOM } from '@/features/ordenes-produccion/services/op-actions'
import { TALLAS_STANDARD } from '@/shared/constants/tallas'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'

interface ServicioBOM {
  servicio_id: string
  nombre: string
  codigo: string
  tipo_proceso: string
  tarifa_unitaria: number
  cantidad_por_unidad: number
}

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
  const [productosEnMatriz, setProductosEnMatriz] = useState<ProductoEnMatriz[]>([])
  const [maxCantidades, setMaxCantidades] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [servicios, setServicios] = useState<ServicioBOM[]>([])
  const [tarifasAjustadas, setTarifasAjustadas] = useState<Record<string, number>>({})

  const ovSeleccionada = useMemo(() => ovs.find(o => o.id === ovId), [ovs, ovId])

  // Agrupar ov_detalle por producto_id y construir ProductoEnMatriz[]
  function agruparPorProducto(detalles: OVItem['ov_detalle']): { productos: ProductoEnMatriz[]; maxCantidades: Record<string, number> } {
    const map = new Map<string, { referencia: string; nombre: string; lineas: typeof detalles }>()

    for (const linea of detalles) {
      const key = linea.producto_id
      if (!map.has(key)) {
        map.set(key, {
          referencia: linea.productos?.referencia ?? '',
          nombre: linea.productos?.nombre ?? 'Producto desconocido',
          lineas: [],
        })
      }
      map.get(key)!.lineas.push(linea)
    }

    const maxCant: Record<string, number> = {}
    const productos: ProductoEnMatriz[] = []

    for (const { referencia, nombre, lineas } of map.values()) {
      const productId = lineas[0].producto_id
      const cantidades: Record<string, number> = {}

      // Extraer color del nombre del producto
      const colorReal = extraerColorDelNombre(nombre, null)
      const nombreBase = derivarNombreBase(nombre, colorReal)

      for (const talla of TALLAS_STANDARD) {
        cantidades[talla] = 0
      }

      for (const linea of lineas) {
        cantidades[linea.talla] = 0
        maxCant[`${productId}:${linea.talla}`] = linea.cantidad_disponible
      }

      productos.push({
        producto_id: productId,
        referencia,
        nombre: nombreBase,
        color: colorReal,
        precio_unitario: 0,
        cantidades,
      })
    }

    return { productos, maxCantidades: maxCant }
  }

  function handleOVChange(id: string, precargarCantidades = false) {
    setOvId(id)
    const ov = ovs.find(o => o.id === id)
    if (ov) {
      const { productos, maxCantidades: max } = agruparPorProducto(ov.ov_detalle)
      // Si viene preseleccionada, cargar cantidades disponibles por defecto
      const productosConCantidades = precargarCantidades
        ? productos.map(p => ({
            ...p,
            cantidades: Object.fromEntries(
              Object.entries(p.cantidades).map(([talla]) => [
                talla,
                max[`${p.producto_id}:${talla}`] ?? 0,
              ])
            ),
          }))
        : productos
      setProductosEnMatriz(productosConCantidades)
      setMaxCantidades(max)
    } else {
      setProductosEnMatriz([])
      setMaxCantidades({})
    }
  }

  // Cuando cambian los productos, cargar servicios del BOM
  useEffect(() => {
    const productoIds = [...new Set(productosEnMatriz.map(p => p.producto_id))]
    if (productoIds.length === 0) { setServicios([]); return }
    getServiciosBOM(productoIds).then(data => {
      setServicios(data)
      const init: Record<string, number> = {}
      data.forEach(s => { init[s.servicio_id] = s.tarifa_unitaria })
      setTarifasAjustadas(init)
    })
  }, [productosEnMatriz])

  // Inicializar con OV preseleccionada al montar
  useEffect(() => {
    if (ovPreseleccionada) handleOVChange(ovPreseleccionada, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function actualizarCantidad(productoId: string, talla: string, cantidad: number) {
    setProductosEnMatriz(prev =>
      prev.map(p =>
        p.producto_id === productoId
          ? { ...p, cantidades: { ...p.cantidades, [talla]: cantidad } }
          : p
      )
    )
  }

  function calcularTotalLineas() {
    return productosEnMatriz.reduce((total, producto) => {
      const productTotal = Object.values(producto.cantidades).reduce((s, q) => s + q, 0)
      return total + productTotal
    }, 0)
  }

  function hayDisponible() {
    return Object.values(maxCantidades).some(max => max > 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!ovId) { setError('Selecciona una OV'); return }
    if (!tallerId) { setError('Selecciona un taller'); return }
    if (!fechaPromesa) { setError('Indica la fecha promesa'); return }

    const lineas = productosEnMatriz.flatMap(producto =>
      TALLAS_STANDARD.map(talla => ({
        producto_id: producto.producto_id,
        producto_nombre: producto.nombre,
        talla,
        cantidad_asignada: producto.cantidades[talla] ?? 0,
      })).filter(l => l.cantidad_asignada > 0)
    )

    if (lineas.length === 0) {
      setError('Al menos una línea debe tener cantidad mayor a 0')
      return
    }

    startTransition(async () => {
      const serviciosInput = servicios.map(s => ({
        servicio_id: s.servicio_id,
        tarifa_unitaria: tarifasAjustadas[s.servicio_id] ?? s.tarifa_unitaria,
      }))

      const result = await createOrdenProduccion({
        ov_id: ovId,
        taller_id: tallerId,
        fecha_promesa: fechaPromesa,
        notas: notas || undefined,
        lineas,
        servicios: serviciosInput,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(`/ordenes-produccion/${result.data?.id}`)
    })
  }


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
                onChange={e => handleOVChange(e.target.value, false)}
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

          <MatrizProductos
            productos={productosEnMatriz}
            tallas={TALLAS_STANDARD}
            mostrarPrecio={false}
            maxCantidades={maxCantidades}
            onActualizarCantidad={actualizarCantidad}
            onRemover={() => {}}
          />
        </div>
      )}

      {/* Servicios del BOM */}
      {ovSeleccionada && servicios.length > 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-foreground text-body-md">Servicios de la OP</h2>
            <p className="text-muted-foreground text-body-sm mt-0.5">
              Cargados del BOM. Puedes ajustar la tarifa si aplica para esta OP.
            </p>
          </div>
          <div className="space-y-2">
            {servicios.map(s => (
              <div key={s.servicio_id} className="flex items-center justify-between gap-4 rounded-xl bg-neu-base shadow-neu-inset px-4 py-3">
                <div>
                  <p className="text-body-sm font-medium text-foreground">{s.nombre}</p>
                  <p className="text-xs text-muted-foreground">{s.codigo} · {s.tipo_proceso} · {s.cantidad_por_unidad} × prenda</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">Tarifa</span>
                  <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-1.5 w-28">
                    <input
                      type="number"
                      min={0}
                      value={tarifasAjustadas[s.servicio_id] ?? s.tarifa_unitaria}
                      onChange={e => setTarifasAjustadas(prev => ({
                        ...prev,
                        [s.servicio_id]: parseFloat(e.target.value) || 0,
                      }))}
                      className="w-full bg-transparent text-body-sm text-foreground outline-none text-right"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">/ud</span>
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
