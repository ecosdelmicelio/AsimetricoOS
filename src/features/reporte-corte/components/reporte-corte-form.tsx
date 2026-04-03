'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createReporteCorte } from '@/features/reporte-corte/services/reporte-corte-actions'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'

export interface LineaOPSimple {
  producto_id: string
  referencia: string
  nombre: string
  color: string | null
  talla: string
  cantidad_asignada: number
}

interface TendidoState {
  id: string
  color: string
  metros: string
  peso: string
  productosEnMatriz: ProductoEnMatriz[]
  maxCantidades: Record<string, number>
}

interface Props {
  opId: string
  lineasOP: LineaOPSimple[]
}

function inicializarTendidos(lineasOP: LineaOPSimple[]): TendidoState[] {
  // Agrupar por color único
  const coloresUnicos = [...new Set(lineasOP.map(l => l.color ?? 'Sin color'))]

  return coloresUnicos.map(color => {
    const lineasColor = lineasOP.filter(l => (l.color ?? 'Sin color') === color)

    // Agrupar lineasColor por producto_id
    const map = new Map<string, { referencia: string; nombre: string; lineas: LineaOPSimple[] }>()
    for (const linea of lineasColor) {
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

    // Extraer tallas únicas para este color
    const tallaSet = new Set(lineasColor.map(l => l.talla))
    const tallasArray = Array.from(tallaSet).sort()

    // Construir ProductoEnMatriz[] y maxCantidades
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
        color: lineas[0].color ?? null,
        precio_unitario: 0,
        cantidades,
      })
    }

    return {
      id: Math.random().toString(36).slice(2),
      color,
      metros: '',
      peso: '',
      productosEnMatriz: productos,
      maxCantidades: maxCant,
    }
  })
}

export function ReporteCorteeForm({ opId, lineasOP }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [tendidos, setTendidos] = useState<TendidoState[]>(inicializarTendidos(lineasOP))
  const [error, setError] = useState<string | null>(null)

  function actualizarTendido(id: string, field: 'color' | 'metros' | 'peso', value: string) {
    setTendidos(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  function actualizarCantidadProducto(tendidoId: string, productoId: string, talla: string, cantidad: number) {
    setTendidos(prev =>
      prev.map(t =>
        t.id === tendidoId
          ? {
              ...t,
              productosEnMatriz: t.productosEnMatriz.map(p =>
                p.producto_id === productoId
                  ? { ...p, cantidades: { ...p.cantidades, [talla]: cantidad } }
                  : p
              ),
            }
          : t
      )
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    for (const t of tendidos) {
      if (!t.color.trim()) { setError('Todos los colores deben estar rellenados'); return }
      if (!t.metros || parseFloat(t.metros) <= 0) {
        setError('Los metros usados deben ser mayores a 0'); return
      }
    }

    startTransition(async () => {
      const res = await createReporteCorte({
        op_id: opId,
        fecha,
        notas: notas || undefined,
        tendidos: tendidos.map(t => {
          // Get tallas for this tendido from its productosEnMatriz
          const tallasSet = new Set<string>()
          for (const producto of t.productosEnMatriz) {
            for (const talla of Object.keys(producto.cantidades)) {
              tallasSet.add(talla)
            }
          }

          const lineas = t.productosEnMatriz.flatMap(producto =>
            Array.from(tallasSet).map(talla => ({
              producto_id: producto.producto_id,
              talla,
              cantidad_cortada: producto.cantidades[talla] ?? 0,
            })).filter(l => l.cantidad_cortada > 0)
          )

          return {
            color: t.color.trim(),
            metros_usados: parseFloat(t.metros),
            peso_desperdicio_kg: parseFloat(t.peso) || 0,
            lineas,
          }
        }),
      })
      if (res.error) { setError(res.error); return }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Fecha + Notas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">
            Fecha del Corte <span className="text-red-500">*</span>
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
              placeholder="Observaciones del corte..."
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Tendidos por color */}
      <div className="space-y-4">
        {tendidos.map((tendido) => {
          return (
            <div key={tendido.id} className="rounded-xl bg-neu-base shadow-neu p-4 space-y-4">
              {/* Color / Metros / Peso */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Color <span className="text-red-500">*</span></label>
                  <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2">
                    <input
                      value={tendido.color}
                      onChange={e => actualizarTendido(tendido.id, 'color', e.target.value)}
                      placeholder="Ej: Azul Navy"
                      className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Metros usados <span className="text-red-500">*</span></label>
                  <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={tendido.metros}
                      onChange={e => actualizarTendido(tendido.id, 'metros', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Desperdicio (kg)</label>
                  <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.001}
                      value={tendido.peso}
                      onChange={e => actualizarTendido(tendido.id, 'peso', e.target.value)}
                      placeholder="0.000"
                      className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Matriz de corte */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Unidades cortadas por talla</p>
                <MatrizProductos
                  productos={tendido.productosEnMatriz}
                  tallas={Array.from(
                    new Set(
                      tendido.productosEnMatriz.flatMap(p => Object.keys(p.cantidades))
                    )
                  ).sort()}
                  mostrarPrecio={false}
                  maxCantidades={tendido.maxCantidades}
                  onActualizarCantidad={(productoId, talla, cantidad) =>
                    actualizarCantidadProducto(tendido.id, productoId, talla, cantidad)
                  }
                  onRemover={() => {}}
                />
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-red-600 text-body-sm">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Registrar Reporte de Corte
      </button>
    </form>
  )
}
