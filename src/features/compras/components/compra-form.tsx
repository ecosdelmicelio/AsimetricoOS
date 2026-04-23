'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Package, Shirt } from 'lucide-react'
import { createOrdenCompra } from '@/features/compras/services/compras-actions'
import type { EstadoGreige, EstadoDocumental } from '@/features/compras/types'
import { OCLineasMPForm } from './oc-lineas-mp-form'
import { OCLineasPTForm } from './oc-lineas-pt-form'

interface Props {
  proveedores: { id: string; nombre: string }[]
  productos?: {
    id: string
    referencia: string
    nombre: string
    color: string | null
    precio_base?: number | null
    tallas?: string[]
  }[]
  materiales?: {
    id: string
    codigo: string
    nombre: string
    unidad: string
    precio_referencia?: number | null
  }[]
}

const GREIGE_OPTIONS: { value: EstadoGreige; label: string; desc: string }[] = [
  { value: 'en_crudo', label: '⚡ En crudo', desc: '15 días de entrega' },
  { value: 'para_tejer', label: '🕐 Por tejer', desc: '30 días de entrega' },
]

const DOC_OPTIONS: { value: EstadoDocumental; label: string }[] = [
  { value: 'na', label: 'N/A — No requiere afidávit' },
  { value: 'pendiente_afidavit', label: 'Requiere afidávit (pendiente)' },
  { value: 'cargado', label: 'Afidávit ya cargado' },
]

export function CompraForm({
  proveedores,
  productos = [],
  materiales = [],
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState<'materia_prima' | 'producto_terminado'>('materia_prima')
  const [greige, setGreige] = useState<EstadoGreige>('para_tejer')
  const [lineasMP, setLineasMP] = useState<any[]>([])
  const [lineasPT, setLineasPT] = useState<any[]>([])

  const totalUds = useMemo(() => {
    if (tipo === 'materia_prima') {
      return lineasMP.reduce((acc, l) => acc + (Number(l.cantidad) || 0), 0)
    } else {
      return lineasPT.reduce((acc, l) => acc + (Number(l.cantidad) || 0), 0)
    }
  }, [lineasMP, lineasPT, tipo])

  const totalPrecio = useMemo(() => {
    if (tipo === 'materia_prima') {
      return lineasMP.reduce((acc, l) => acc + ((Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0)), 0)
    } else {
      return lineasPT.reduce((acc, l) => acc + ((Number(l.cantidad) || 0) * (Number(l.precio_pactado) || 0)), 0)
    }
  }, [lineasMP, lineasPT, tipo])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fechaOC = fd.get('fecha_oc') as string
    const estadoDocumental: EstadoDocumental = 'na'

    const proveedorId = fd.get('proveedor_id') as string
    if (!proveedorId) {
      setError('Debes seleccionar un proveedor antes de guardar')
      return
    }

    const lineas = tipo === 'materia_prima' ? lineasMP : lineasPT

    if (lineas.length === 0) {
      setError('Agrega al menos una línea')
      return
    }

    startTransition(async () => {
      const res = await createOrdenCompra({
        proveedor_id: (fd.get('proveedor_id') as string) || undefined,
        tipo: tipo,
        estado_greige: greige,
        estado_documental: estadoDocumental,
        fecha_oc: fechaOC,
      })

      if (res.error) {
        setError(res.error)
        return
      }

      // Guardar líneas de detalle según tipo
      try {
        if (tipo === 'materia_prima' && lineasMP.length > 0) {
          const { insertOCDetallesMp } = await import('../services/compras-actions')
          await insertOCDetallesMp(res.data!.id, lineasMP)
        } else if (tipo === 'producto_terminado' && lineasPT.length > 0) {
          const { insertOCDetalles } = await import('../services/compras-actions')
          await insertOCDetalles(res.data!.id, lineasPT)
        }
      } catch (err) {
        console.error('Error guardando líneas:', err)
        setError('Error guardando las líneas')
        return
      }

      router.push(`/compras/${res.data!.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* TOOLBAR */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-5 sticky top-0 z-[60] flex flex-wrap items-center gap-6">
        
        {/* Toggle Tipo OC */}
        <div className="w-64 space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Orden</label>
          <div className="relative flex rounded-xl bg-slate-50 border border-slate-100 p-1 w-full">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-slate-900 shadow transition-transform duration-300 ${
                tipo === 'materia_prima' ? 'translate-x-0' : 'translate-x-full'
              }`}
            />
            <button
              type="button"
              onClick={() => setTipo('materia_prima')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                tipo === 'materia_prima' ? 'text-white' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Materia Prima
            </button>
            <button
              type="button"
              onClick={() => setTipo('producto_terminado')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                tipo === 'producto_terminado' ? 'text-white' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              Prod. Terminado
            </button>
          </div>
        </div>

        {/* Proveedor */}
        <div className="flex-1 min-w-[280px] space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Proveedor / Taller <span className="text-red-500">*</span></label>
          <select
            name="proveedor_id"
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-slate-300 transition-all cursor-pointer"
            required
          >
            <option value="">Seleccione Proveedor...</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          {proveedores.length === 0 && (
            <p className="text-[9px] font-bold text-slate-400 px-1 mt-1">
              Agrega proveedores en <a href="/terceros" className="text-primary-600 hover:underline">Terceros</a>
            </p>
          )}
        </div>

        {/* Fecha OC */}
        <div className="w-40 space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Emisión <span className="text-red-500">*</span></label>
          <input
            name="fecha_oc"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-slate-300 transition-all"
          />
        </div>
      </div>

      {/* TRANSACTIONAL GRID */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {tipo === 'materia_prima' ? (
          <OCLineasMPForm materiales={materiales} onLineasChange={setLineasMP} />
        ) : (
          <OCLineasPTForm productos={productos} onLineasChange={setLineasPT} />
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 text-[11px] font-black uppercase text-center tracking-widest">
          ERROR OPERATIVO: {error}
        </div>
      )}

      {/* STICKY FOOTER SUBMIT */}
      <div className="sticky bottom-4 left-0 right-0 z-40 bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-100 shadow-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inversión Final</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">${totalPrecio.toLocaleString('es-CO')}</p>
           </div>
           <div className="h-10 w-px bg-slate-100" />
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volumen</p>
              <p className="text-lg font-black text-slate-900 tracking-tight tabular-nums">{totalUds.toLocaleString('es-CO')} {tipo === 'materia_prima' ? 'UNIDADES' : 'PRENDAS'}</p>
           </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-10 py-5 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-40"
        >
          {pending ? 'Procesando...' : 'Confirmar Orden'}
        </button>
      </div>
    </form>
  )
}

