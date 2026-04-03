'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Globe } from 'lucide-react'
import { updateProducto } from '@/features/productos/services/producto-actions'
import type { Producto, TipoProducto } from '@/features/productos/types'

interface Props {
  producto: Producto
}

export function ProductoEditForm({ producto }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState(producto.nombre)
  const [color, setColor] = useState(producto.color ?? '')
  const [origenUsa, setOrigenUsa] = useState(producto.origen_usa ?? false)
  const [precioBase, setPrecioBase] = useState(producto.precio_base?.toString() ?? '')
  const [tipoProducto, setTipoProducto] = useState<TipoProducto>(
    producto.tipo_producto ?? 'fabricado',
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await updateProducto(producto.id, {
        nombre: nombre.trim(),
        color: color.trim() || undefined,
        origen_usa: origenUsa,
        precio_base: precioBase ? parseFloat(precioBase) : undefined,
        tipo_producto: tipoProducto,
      })
      if (res.error) { setError(res.error); return }
      router.push(`/productos/${producto.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Referencia (read-only) */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Referencia</label>
        <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
          <span className="font-mono text-body-sm text-muted-foreground tracking-widest">
            {producto.referencia}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">La referencia no puede modificarse.</p>
      </div>

      {/* Tipo producto */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Tipo de Producto</label>
        <select
          value={tipoProducto}
          onChange={e => setTipoProducto(e.target.value as TipoProducto)}
          className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 text-body-sm text-foreground outline-none"
        >
          <option value="fabricado">Fabricado</option>
          <option value="comercializado">Comercializado</option>
        </select>
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Nombre *</label>
        <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            className="w-full bg-transparent text-body-sm text-foreground outline-none"
          />
        </div>
      </div>

      {/* Color */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Color</label>
        <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
          <input
            value={color}
            onChange={e => setColor(e.target.value)}
            placeholder="Ej: Rojo Vino, Azul Navy"
            className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Origen USA */}
      <button
        type="button"
        onClick={() => setOrigenUsa(v => !v)}
        className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left transition-all border-2 ${
          origenUsa
            ? 'border-blue-400 bg-blue-50 shadow-neu-inset'
            : 'border-transparent bg-neu-base shadow-neu hover:shadow-neu-lg'
        }`}
      >
        <Globe className={`w-4 h-4 shrink-0 ${origenUsa ? 'text-blue-600' : 'text-muted-foreground'}`} />
        <div>
          <p className={`text-body-sm font-semibold ${origenUsa ? 'text-blue-700' : 'text-foreground'}`}>
            Origen USA 🇺🇸
          </p>
          <p className="text-xs text-muted-foreground">
            Requiere etiquetas en inglés, composición de fibras y &quot;Made in Colombia&quot;
          </p>
        </div>
        <div className={`ml-auto w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
          origenUsa ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
        }`}>
          {origenUsa && <span className="text-white text-xs font-bold">✓</span>}
        </div>
      </button>

      {/* Precio */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Precio techo (COP)</label>
        <div className="relative rounded-xl bg-neu-base shadow-neu-inset">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-body-sm">
            $
          </span>
          <input
            type="number"
            min={0}
            step={1000}
            value={precioBase}
            onChange={e => setPrecioBase(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent pl-7 pr-3 py-2.5 text-body-sm text-foreground outline-none"
          />
        </div>
      </div>

      {error && <p className="text-red-600 text-body-sm">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl bg-neu-base shadow-neu text-body-sm text-muted-foreground hover:text-foreground transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </form>
  )
}
