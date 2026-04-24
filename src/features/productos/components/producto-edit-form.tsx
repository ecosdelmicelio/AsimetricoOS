'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Globe } from 'lucide-react'
import { updateProducto } from '@/features/productos/services/producto-actions'
import type { Producto, TipoProducto, TipoDistribucion } from '@/features/productos/types'
import type { AtributoPT, TipoAtributo } from '@/features/productos/types/atributos'
import { TIPOS_ATRIBUTO, LABELS_ATRIBUTO } from '@/features/productos/types/atributos'

interface Props {
  producto: Producto
  atributos: Record<TipoAtributo, AtributoPT[]>
  atributosProducto: Record<TipoAtributo, string>
}

export function ProductoEditForm({ producto, atributos, atributosProducto }: Props) {
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
  const [tipoDistribucion, setTipoDistribucion] = useState<TipoDistribucion>(
    producto.tipo_distribucion ?? 'MTS',
  )
  const [atributosSeleccionados, setAtributosSeleccionados] = useState<Record<TipoAtributo, string>>(
    atributosProducto,
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
        tipo_distribucion: tipoDistribucion,
        atributos: atributosSeleccionados,
      })
      if (res.error) { setError(res.error); return }
      router.push(`/catalogo/${producto.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
      {/* SECCIÓN 1: Identidad y Origen */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Referencia (Única)</label>
            <p className="text-sm font-black text-slate-900 tracking-widest uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
              {producto.referencia}
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => setOrigenUsa(v => !v)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all border-2",
              origenUsa 
                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                : "bg-slate-50 border-slate-100 text-slate-400"
            )}
          >
            <Globe className={cn("w-4 h-4", origenUsa ? "text-emerald-500" : "text-slate-300")} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {origenUsa ? "Origen USA Activo" : "Origen Local"}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Producto *</label>
            <div className="relative flex rounded-xl bg-slate-50 p-1 w-full border border-slate-100">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-slate-900 shadow transition-transform duration-300 ${
                  tipoProducto === 'fabricado' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                type="button"
                onClick={() => setTipoProducto('fabricado')}
                className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                  tipoProducto === 'fabricado' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Fabricado
              </button>
              <button
                type="button"
                onClick={() => setTipoProducto('comercializado')}
                className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                  tipoProducto === 'comercializado' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Comercializado
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Plan de Distribución *</label>
            <div className="relative flex rounded-xl bg-slate-50 p-1 w-full border border-slate-100">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-slate-900 shadow transition-transform duration-300 ${
                  tipoDistribucion === 'MTS' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                type="button"
                onClick={() => setTipoDistribucion('MTS')}
                className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                  tipoDistribucion === 'MTS' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                MTS (Stock)
              </button>
              <button
                type="button"
                onClick={() => setTipoDistribucion('MTO')}
                className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                  tipoDistribucion === 'MTO' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                MTO (Orden)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Datos Comerciales */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Descriptivo *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-slate-300 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Color (Manual)</label>
            <input
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="Ej: Azul Navy"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-slate-300 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Techo (COP)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">$</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={precioBase}
                onChange={e => setPrecioBase(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-4 py-3 text-xs font-black text-slate-900 tabular-nums outline-none focus:bg-white focus:border-slate-300 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Atributos PLM */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="space-y-3">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Atributos Técnicos (Gestión vía PLM)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TIPOS_ATRIBUTO.map(tipoAtributo => (
              <div key={tipoAtributo} className="space-y-2">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter block truncate px-1">
                  {LABELS_ATRIBUTO[tipoAtributo]}
                </label>
                <select
                  value={atributosSeleccionados[tipoAtributo]}
                  disabled
                  className="w-full text-[10px] font-black uppercase tracking-tighter rounded-xl bg-slate-50 border border-slate-100 px-2 py-2.5 text-slate-900 outline-none opacity-40 cursor-not-allowed appearance-none"
                >
                  <option value="">—</option>
                  {(atributos[tipoAtributo] ?? []).map(attr => (
                    <option key={attr.id} value={attr.id}>
                      {attr.valor}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 text-[11px] font-black uppercase text-center tracking-widest">
          ERROR OPERATIVO: {error}
        </div>
      )}

      {/* STICKY FOOTER PREMIUM */}
      <div className="sticky bottom-4 left-0 right-0 z-40 bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-100 shadow-2xl p-6 flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estatus del Registro</p>
          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Referencia: {producto.referencia}</p>
        </div>
        
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-40"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </form>
  )
}
