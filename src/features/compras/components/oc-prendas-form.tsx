'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createOCPrendas } from '@/features/compras/services/compras-actions'
import { TALLAS_STANDARD } from '@/shared/constants/tallas'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'

interface Producto {
  id: string
  nombre: string
  referencia: string
  color: string | null
  precio_base: number | null
  categoria: string | null
  origen_usa: boolean
}

interface Proveedor {
  id: string
  nombre: string
}

interface Props {
  proveedores: Proveedor[]
  productos: Producto[]
}

// Helper: extract base name without color
function derivarNombreBase(nombre: string, color: string | null): string {
  if (!color) return nombre
  const regex = new RegExp(`\\s*${color.trim()}\\s*$`, 'i')
  return nombre.replace(regex, '').trim()
}

// Helper: extract color from name if color field is null
function extraerColorDelNombre(nombre: string, colorBD: string | null): string | null {
  if (colorBD) return colorBD

  const palabras = nombre.split(' ')
  const ultimaPalabra = palabras[palabras.length - 1]

  const coloresComunes = [
    'Beige', 'Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Gris', 'Rosa',
    'Naranja', 'Marrón', 'Morado', 'Plateado', 'Dorado', 'Marino', 'Claro', 'Oscuro',
    'Burdeos', 'Vino', 'Navy', 'Royal', 'Teal', 'Turquesa', 'Coral', 'Salmón',
    'BEN', 'NEN', 'BLN', 'RJO', 'AZL', 'VRD', 'GRS', 'RSA'
  ]

  if (coloresComunes.some(c => ultimaPalabra.toLowerCase() === c.toLowerCase())) {
    return ultimaPalabra
  }

  return null
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

function calcularTotalProducto(producto: ProductoEnMatriz): number {
  return Object.values(producto.cantidades).reduce((s, q) => s + q, 0) * producto.precio_unitario
}

function calcularTotalOC(productos: ProductoEnMatriz[]): number {
  return productos.reduce((sum, p) => sum + calcularTotalProducto(p), 0)
}

function calcularTotalUds(productos: ProductoEnMatriz[]): number {
  return productos.reduce((sum, p) => sum + Object.values(p.cantidades).reduce((s, q) => s + q, 0), 0)
}

export function OCPrendasForm({ proveedores, productos }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [proveedorId, setProveedorId] = useState('')
  const [fechaOC, setFechaOC] = useState(new Date().toISOString().split('T')[0])
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [productosEnForm, setProductosEnForm] = useState<ProductoEnMatriz[]>([])
  const [nombreBaseSeleccionado, setNombreBaseSeleccionado] = useState('')
  const [colorSeleccionado, setColorSeleccionado] = useState('')
  const [error, setError] = useState<string | null>(null)

  const grupos = useMemo(() => derivarGrupos(productos), [productos])
  const grupoActual = grupos.find(g => g.nombreBase === nombreBaseSeleccionado)
  const coloresDisponibles = grupoActual?.opciones.filter(
    opt => !productosEnForm.some(pf => pf.producto_id === opt.productoId)
  ) ?? []

  function agregarProducto() {
    if (!colorSeleccionado) return

    const productoSeleccionado = coloresDisponibles.find(
      opt => opt.productoId === colorSeleccionado
    )
    if (!productoSeleccionado) return

    if (productosEnForm.some(p => p.producto_id === colorSeleccionado)) return

    const nuevoProducto: ProductoEnMatriz = {
      producto_id: productoSeleccionado.productoId,
      referencia: productoSeleccionado.referencia,
      nombre: derivarNombreBase(productoSeleccionado.nombre, productoSeleccionado.color),
      color: productoSeleccionado.color,
      precio_unitario: productos.find(p => p.id === colorSeleccionado)?.precio_base ?? 0,
      cantidades: Object.fromEntries(TALLAS_STANDARD.map(t => [t, 0])),
    }

    setProductosEnForm(prev => [...prev, nuevoProducto])
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

    if (!proveedorId) { setError('Selecciona un proveedor'); return }
    if (!fechaOC) { setError('Selecciona la fecha de OC'); return }

    const lineas = productosEnForm.flatMap(p =>
      TALLAS_STANDARD.map(talla => ({
        producto_id: p.producto_id,
        talla,
        cantidad: p.cantidades[talla] ?? 0,
        precio_pactado: p.precio_unitario,
      })).filter(l => l.cantidad > 0)
    )

    if (lineas.length === 0) {
      setError('Agrega al menos un producto con cantidad mayor a 0')
      return
    }

    startTransition(async () => {
      const result = await createOCPrendas({
        proveedor_id: proveedorId,
        fecha_oc: fechaOC,
        fecha_entrega_est: fechaEntrega || undefined,
        lineas,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(`/compras/${result.data?.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos básicos */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-body-md">Datos de la Orden</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Proveedor */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Proveedor <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select
                value={proveedorId}
                onChange={e => setProveedorId(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                required
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha OC */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Fecha OC <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <input
                type="date"
                value={fechaOC}
                onChange={e => setFechaOC(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none"
                required
              />
            </div>
          </div>

          {/* Fecha Entrega Estimada */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Fecha Entrega Estimada
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <input
                type="date"
                value={fechaEntrega}
                onChange={e => setFechaEntrega(e.target.value)}
                className="w-full bg-transparent text-body-sm text-foreground outline-none"
              />
            </div>
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

          {/* Selector de color */}
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
          onActualizarCantidad={actualizarCantidad}
          onActualizarPrecio={actualizarPrecio}
          onRemover={removerProducto}
        />
      </div>

      {/* Total y submit */}
      {productosEnForm.length > 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-6 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-body-sm">Total estimado</p>
            <p className="text-display-xs font-bold text-foreground">
              ${calcularTotalOC(productosEnForm).toLocaleString('es-CO')}
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
            {isPending ? 'Creando...' : 'Crear OC'}
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
