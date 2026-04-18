'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createOrdenVenta, updateOrdenVenta } from '@/features/ordenes-venta/services/ov-actions'
import { TALLAS_STANDARD } from '@/shared/constants/tallas'
import { derivarNombreBase, extraerColorDelNombre } from '@/shared/lib/productos-utils'
import type { LineaOV, OVConDetalle } from '@/features/ordenes-venta/types'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Producto {
  id: string
  nombre: string
  referencia: string
  color: string | null
  precio_base: number | null
  categoria: string | null
  origen_usa: boolean
  minimo_orden: number | null
  multiplo_orden: number | null
  leadtime_dias: number | null
}

type GrupoProducto = {
  nombreBase: string
  opciones: {
    productoId: string
    color: string | null
    referencia: string
    nombre: string
  }[]
}

function derivarGrupos(productos: Producto[]): GrupoProducto[] {
  const map = new Map<string, GrupoProducto>()
  for (const p of productos) {
    // Extrae el color real (del nombre si el campo color es null)
    const colorReal = extraerColorDelNombre(p.nombre, p.color)
    const base = derivarNombreBase(p.nombre, colorReal)

    if (!map.has(base)) {
      map.set(base, { nombreBase: base, opciones: [] })
    }
    map.get(base)!.opciones.push({
      productoId: p.id,
      color: colorReal,
      referencia: p.referencia,
      nombre: p.nombre,
    })
  }
  return [...map.values()].sort((a, b) => a.nombreBase.localeCompare(b.nombreBase))
}

// ---------------------------------------------------------------------------
// Helpers de cálculo
// ---------------------------------------------------------------------------

function calcularUnidadesProducto(producto: ProductoEnMatriz): number {
  return Object.values(producto.cantidades).reduce((s, q) => s + q, 0)
}

function calcularTotalProducto(producto: ProductoEnMatriz): number {
  return calcularUnidadesProducto(producto) * producto.precio_unitario
}

function calcularTotalOV(productos: ProductoEnMatriz[]): number {
  return productos.reduce((sum, p) => sum + calcularTotalProducto(p), 0)
}

function calcularTotalUds(productos: ProductoEnMatriz[]): number {
  return productos.reduce((sum, p) => sum + calcularUnidadesProducto(p), 0)
}

// ---------------------------------------------------------------------------
// Tipos de props del form
// ---------------------------------------------------------------------------

interface Cliente {
  id: string
  nombre: string
  plazo_pago_dias: number | null
}

export type ProductoAlias = {
  producto_id: string
  cliente_id: string
  sku_cliente: string
  nombre_comercial_cliente: string | null
  precio_acordado: number | null
}

interface Props {
  clientes: Cliente[]
  productos: Producto[]
  aliases?: ProductoAlias[]
  initialData?: OVConDetalle
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function OVForm({ clientes, productos, aliases = [], initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [clienteId, setClienteId] = useState(initialData?.cliente_id ?? '')
  const [fechaEntrega, setFechaEntrega] = useState(initialData?.fecha_entrega ?? '')
  const [plazoPago, setPlazoPago] = useState(initialData?.plazo_pago_dias ?? 30)
  const [notas, setNotas] = useState(initialData?.notas ?? '')
  const [productosEnForm, setProductosEnForm] = useState<ProductoEnMatriz[]>(() => {
    if (!initialData) return []
    
    // Reconstruir la estructura para la matriz
    const matrixMap = new Map<string, ProductoEnMatriz>()
    
    for (const line of initialData.ov_detalle) {
      if (!matrixMap.has(line.producto_id)) {
        const prod = line.productos
        const colorReal = prod ? extraerColorDelNombre(prod.nombre, prod.color) : null
        const nombreBase = prod ? derivarNombreBase(prod.nombre, colorReal) : 'Producto'
        
        matrixMap.set(line.producto_id, {
          producto_id: line.producto_id,
          referencia: prod?.referencia ?? '',
          nombre: nombreBase,
          color: colorReal,
          precio_unitario: line.precio_pactado,
          cantidades: Object.fromEntries(TALLAS_STANDARD.map(t => [t, 0])),
        })
      }
      const entry = matrixMap.get(line.producto_id)!
      entry.cantidades[line.talla] = line.cantidad
    }
    
    return Array.from(matrixMap.values())
  })
  const [nombreBaseSeleccionado, setNombreBaseSeleccionado] = useState('')
  const [colorSeleccionado, setColorSeleccionado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [condicionesMap, setCondicionesMap] = useState<Record<string, {
    minimo_orden: number | null; multiplo_orden: number | null; leadtime_dias: number | null; nombre: string
  }>>({})

  // Lógica inteligente de Catálogo "Private Label" / Aliases B2B
  const productosFiltrados = useMemo(() => {
    if (!clienteId) return productos

    // Buscar si este cliente tiene AL MENOS UN alias configurado
    const aliasDelCliente = aliases.filter(a => a.cliente_id === clienteId)
    
    // Si no tiene aliases, mostramos todo el catálogo por defecto (para no bloquear cuentas nuevas)
    if (aliasDelCliente.length === 0) return productos

    // Si tiene aliases, cruzamos los IDs y forzamos nombres y referencias custom B2B (Private Label Override)
    const allowedIds = new Set(aliasDelCliente.map(a => a.producto_id))
    return productos.filter(p => allowedIds.has(p.id)).map(p => {
      // Si el cliente quiere llamarlo de otra forma, aplicamos overrides de Alias
      const aliasData = aliasDelCliente.find(a => a.producto_id === p.id)!
      return {
        ...p,
        nombre: aliasData.nombre_comercial_cliente ?? p.nombre, // Sobrescribe el nombre por el B2B
        referencia: aliasData.sku_cliente ?? p.referencia,       // Sobrescribe el SKU por el B2B
        precio_base: aliasData.precio_acordado ?? p.precio_base  // Congela el Precio Pactado B2B
      }
    })
  }, [productos, aliases, clienteId])

  // Grupos derivados del catálogo (ahora usa solo productosFiltrados)
  const grupos = useMemo(() => derivarGrupos(productosFiltrados), [productosFiltrados])
  const grupoActual = grupos.find(g => g.nombreBase === nombreBaseSeleccionado)
  const coloresDisponibles = grupoActual?.opciones.filter(
    opt => !productosEnForm.some(pf => pf.producto_id === opt.productoId)
  ) ?? []

  // Opciones para agregar color inline en MatrizProductos
  const opcionesAgregarColor = useMemo(() => {
    const result: Record<string, { productoId: string; color: string | null }[]> = {}
    for (const grupo of grupos) {
      const referenciaKey = grupo.opciones[0]?.referencia
      if (!referenciaKey) continue
      const disponibles = grupo.opciones.filter(
        opt => !productosEnForm.some(pf => pf.producto_id === opt.productoId)
      )
      if (disponibles.length > 0) {
        result[referenciaKey] = disponibles
      }
    }
    return result
  }, [grupos, productosEnForm])

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  function agregarProductoPorId(productoId: string) {
    const producto = productosFiltrados.find(p => p.id === productoId)
    if (!producto) return

    if (productosEnForm.some(p => p.producto_id === productoId)) return

    const colorReal = extraerColorDelNombre(producto.nombre, producto.color)
    const nombreBase = derivarNombreBase(producto.nombre, colorReal)

    const nuevoProducto: ProductoEnMatriz = {
      producto_id: producto.id,
      referencia: producto.referencia,
      nombre: nombreBase, // Alias name or Base name
      color: colorReal,
      precio_unitario: producto.precio_base ?? 0, // Alias price or Base price
      cantidades: Object.fromEntries(TALLAS_STANDARD.map(t => [t, 0])),
    }

    // Store conditions for validation
    setCondicionesMap(prev => ({
      ...prev,
      [productoId]: {
        minimo_orden: producto.minimo_orden,
        multiplo_orden: producto.multiplo_orden,
        leadtime_dias: producto.leadtime_dias,
        nombre: nombreBase,
      }
    }))

    setProductosEnForm(prev => [...prev, nuevoProducto])
  }

  function agregarProducto() {
    if (!colorSeleccionado) return
    agregarProductoPorId(colorSeleccionado)
    setNombreBaseSeleccionado('')
    setColorSeleccionado('')
  }

  function actualizarCantidad(productoId: string, talla: string, valor: string | number) {
    const num = typeof valor === 'number' ? valor : parseInt(String(valor)) || 0
    setProductosEnForm(prev =>
      prev.map(p =>
        p.producto_id === productoId
          ? { ...p, cantidades: { ...p.cantidades, [talla]: Math.max(0, num) } }
          : p
      )
    )
  }

  function actualizarPrecio(productoId: string, valor: string | number) {
    const num = typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0
    setProductosEnForm(prev =>
      prev.map(p =>
        p.producto_id === productoId
          ? { ...p, precio_unitario: Math.max(0, num) }
          : p
      )
    )
  }

  function removerProducto(productoId: string) {
    setProductosEnForm(prev => prev.filter(p => p.producto_id !== productoId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clienteId) { setError('Selecciona un cliente'); return }
    if (!fechaEntrega) { setError('Selecciona una fecha de entrega'); return }

    const lineasValidas: LineaOV[] = productosEnForm.flatMap(p =>
      TALLAS_STANDARD.map(talla => ({
        producto_id: p.producto_id,
        producto_nombre: p.nombre,
        talla,
        cantidad: p.cantidades[talla] ?? 0,
        precio_pactado: p.precio_unitario,
      })).filter(l => l.cantidad > 0)
    )

    if (lineasValidas.length === 0) {
      setError('Agrega al menos un producto con cantidad mayor a 0')
      return
    }

    startTransition(async () => {
        const payload = {
        cliente_id: clienteId,
        fecha_entrega: fechaEntrega,
        plazo_pago_dias: plazoPago,
        notas: notas || undefined,
        lineas: lineasValidas,
      }

      const result = initialData
        ? await updateOrdenVenta(initialData.id, payload)
        : await createOrdenVenta(payload)

      if (result.error) {
        setError(result.error)
        return
      }

      const id = initialData?.id ?? (result.data as { id: string }).id
      router.push(`/ordenes-venta/${id}`)
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos básicos */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-body-md">Datos de la Orden</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Cliente */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Cliente <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select
                value={clienteId}
                onChange={e => {
                  const id = e.target.value
                  setClienteId(id)
                  const c = clientes.find(x => x.id === id)
                  if (c?.plazo_pago_dias != null) setPlazoPago(c.plazo_pago_dias)
                }}
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                required
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Plazo de pago */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Plazo de Pago (Días)
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <input
                type="number"
                value={plazoPago}
                onChange={e => setPlazoPago(parseInt(e.target.value) || 0)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none"
                placeholder="30"
              />
            </div>
          </div>

          {/* Fecha entrega */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Fecha de Entrega <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <input
                type="date"
                value={fechaEntrega}
                onChange={e => setFechaEntrega(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">
            Notas / Instrucciones Especiales
          </label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Empaque especial, etiquetas específicas, etc."
              className="w-full bg-transparent text-body-sm text-foreground outline-none min-h-[80px] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Agregar productos */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-body-md">Productos</h2>

        {/* Selectores en cascada */}
        <div className="flex gap-3 flex-wrap items-center">
          {/* Selector de nombre base */}
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 flex-1 min-w-[200px]">
            <select
              value={nombreBaseSeleccionado}
              onChange={e => {
                setNombreBaseSeleccionado(e.target.value)
                setColorSeleccionado('')
              }}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="">Seleccionar producto...</option>
              {grupos.map(g => (
                <option key={g.nombreBase} value={g.nombreBase}>
                  {g.nombreBase}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de color (solo si hay grupo seleccionado con opciones) */}
          {grupoActual && coloresDisponibles.length > 0 && (
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 flex-1 min-w-[150px]">
              <select
                value={colorSeleccionado}
                onChange={e => setColorSeleccionado(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
              >
                <option value="">Seleccionar color...</option>
                {coloresDisponibles.map(opt => (
                  <option key={opt.productoId} value={opt.productoId}>
                    {opt.color ?? 'Sin color'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botón agregar */}
          <button
            type="button"
            onClick={agregarProducto}
            disabled={!colorSeleccionado}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        {/* Matriz de productos */}
        <MatrizProductos
          productos={productosEnForm}
          tallas={[...TALLAS_STANDARD]}
          mostrarPrecio
          opcionesAgregarColor={opcionesAgregarColor}
          onActualizarCantidad={actualizarCantidad}
          onActualizarPrecio={actualizarPrecio}
          onRemover={removerProducto}
          onAgregarColor={agregarProductoPorId}
        />
      </div>

      {/* Validaciones de condiciones */}
      {productosEnForm.length > 0 && (() => {
        const warnings: string[] = []
        for (const p of productosEnForm) {
          const cond = condicionesMap[p.producto_id]
          if (!cond) continue
          const totalUds = Object.values(p.cantidades).reduce((s, q) => s + q, 0)
          if (totalUds === 0) continue
          if (cond.minimo_orden && totalUds < cond.minimo_orden) {
            warnings.push(`${cond.nombre}: mínimo ${cond.minimo_orden} uds (solicitado: ${totalUds})`)
          }
          if (cond.multiplo_orden && cond.multiplo_orden > 0 && totalUds % cond.multiplo_orden !== 0) {
            warnings.push(`${cond.nombre}: debe ser múltiplo de ${cond.multiplo_orden} (solicitado: ${totalUds})`)
          }
        }
        if (fechaEntrega) {
          for (const p of productosEnForm) {
            const cond = condicionesMap[p.producto_id]
            if (!cond?.leadtime_dias) continue
            const diasDisponibles = Math.ceil((new Date(fechaEntrega).getTime() - Date.now()) / (1000 * 3600 * 24))
            if (diasDisponibles < cond.leadtime_dias) {
              warnings.push(`${cond.nombre}: requiere ${cond.leadtime_dias} días de anticipación (disponible: ${diasDisponibles}d)`)
            }
          }
        }
        if (warnings.length === 0) return null
        return (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 space-y-1">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">⚠ Advertencias de Condiciones</p>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700">{w}</p>
            ))}
            <p className="text-[10px] text-amber-500 mt-1">Puedes continuar, pero revisa con el equipo de compras/producción.</p>
          </div>
        )
      })()}

      {/* Total y submit */}
      {productosEnForm.length > 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-body-sm">Total estimado</p>
            <p className="text-display-xs font-bold text-foreground">
              ${calcularTotalOV(productosEnForm).toLocaleString('es-CO')}
            </p>
            <p className="text-muted-foreground text-body-sm">
              {calcularTotalUds(productosEnForm)} unidades
            </p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neu-base shadow-neu text-primary-700 font-bold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60 hover:shadow-neu-lg"
          >
            {isPending ? (initialData ? 'Actualizando...' : 'Guardando...') : (initialData ? 'Actualizar Borrador' : 'Guardar Borrador')}
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
