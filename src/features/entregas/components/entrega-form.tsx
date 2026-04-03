'use client'

import { useState, useTransition, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { createEntrega } from '@/features/entregas/services/entregas-actions'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'

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
  const [error, setError] = useState<string | null>(null)

  // Agrupar por producto_id y construir ProductoEnMatriz[]
  const { productosEnMatriz, maxCantidades, tallas } = useMemo(() => {
    const map = new Map<string, { referencia: string; nombre: string; lineas: LineaOPSimple[] }>()

    for (const linea of lineasOP) {
      const key = linea.producto_id
      if (!map.has(key)) {
        map.set(key, {
          referencia: linea.referencia,
          nombre: linea.nombre,
          lineas: [],
        })
      }
      map.get(key)!.lineas.push(linea)
    }

    const tallaSet = new Set(lineasOP.map(l => l.talla))
    const tallasArray = Array.from(tallaSet).sort()

    const maxCant: Record<string, number> = {}
    const productos: ProductoEnMatriz[] = []

    for (const { referencia, nombre, lineas } of map.values()) {
      const productId = lineas[0].producto_id
      const cantidades: Record<string, number> = {}

      for (const talla of tallasArray) {
        cantidades[talla] = 0
      }

      for (const linea of lineas) {
        maxCant[`${productId}:${linea.talla}`] = linea.cantidad_asignada
      }

      productos.push({
        producto_id: productId,
        referencia,
        nombre,
        color: null,
        precio_unitario: 0,
        cantidades,
      })
    }

    return { productosEnMatriz: productos, maxCantidades: maxCant, tallas: tallasArray }
  }, [lineasOP])

  const [productosEnMatrizState, setProductosEnMatrizState] = useState(productosEnMatriz)

  function actualizarCantidad(productoId: string, talla: string, cantidad: number) {
    setProductosEnMatrizState(prev =>
      prev.map(p =>
        p.producto_id === productoId
          ? { ...p, cantidades: { ...p.cantidades, [talla]: cantidad } }
          : p
      )
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const lineas = productosEnMatrizState.flatMap(producto =>
      tallas.map(talla => ({
        producto_id: producto.producto_id,
        talla,
        cantidad_entregada: producto.cantidades[talla] ?? 0,
      })).filter(l => l.cantidad_entregada > 0)
    )

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

      {/* Matriz de entregas */}
      <div className="space-y-2">
        <p className="text-body-sm font-medium text-foreground">Unidades a entregar</p>
        <MatrizProductos
          productos={productosEnMatrizState}
          tallas={tallas}
          mostrarPrecio={false}
          maxCantidades={maxCantidades}
          onActualizarCantidad={actualizarCantidad}
          onRemover={() => {}}
        />
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
