'use client'

import { useState, useTransition } from 'react'
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
  const [lineasMP, setLineasMP] = useState<unknown[]>([])
  const [lineasPT, setLineasPT] = useState<unknown[]>([])

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">

        {/* Top Row: Tipo toggle + Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-start">

          {/* Toggle Tipo OC — estilo ProductoForm */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo de OC *</label>
            <div className="relative flex rounded-xl bg-neu-base shadow-neu-inset p-1 w-full max-w-sm">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-primary-600 shadow transition-transform duration-300 ${
                  tipo === 'materia_prima' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                type="button"
                onClick={() => setTipo('materia_prima')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors duration-300 ${
                  tipo === 'materia_prima' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Materia Prima
              </button>
              <button
                type="button"
                onClick={() => setTipo('producto_terminado')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors duration-300 ${
                  tipo === 'producto_terminado' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                Producto Terminado
              </button>
            </div>
          </div>

          {/* Fecha OC */}
          <div className="space-y-1 md:min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">
              Fecha OC <span className="text-red-500">*</span>
            </label>
            <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
              <input
                name="fecha_oc"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Proveedor */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Proveedor <span className="text-red-500">*</span>
          </label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
            <select
              name="proveedor_id"
              className="w-full bg-transparent text-sm text-foreground outline-none appearance-none"
            >
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          {proveedores.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Agrega proveedores en{' '}
              <a href="/terceros" className="text-primary-600 underline">
                Terceros
              </a>
            </p>
          )}
        </div>
        {/* Divider */}
        <div className="border-t border-black/8" />

        {/* Líneas según tipo */}
        {tipo === 'materia_prima' ? (
          <OCLineasMPForm materiales={materiales} onLineasChange={setLineasMP} embedded />
        ) : (
          <OCLineasPTForm productos={productos} onLineasChange={setLineasPT} />
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neu-base shadow-neu text-primary-700 font-bold text-sm transition-all active:shadow-neu-inset disabled:opacity-60 hover:shadow-neu-lg"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear OC
        </button>
      </div>
    </form>
  )
}

