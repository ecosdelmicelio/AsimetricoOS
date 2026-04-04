'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fechaOC = fd.get('fecha_oc') as string
    const estadoDocumental = tipo === 'materia_prima' ? (fd.get('estado_documental') as EstadoDocumental) : 'na'

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
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-body-md">Datos de la Orden</h2>

        {/* Tipo de OC */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Tipo de OC</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as 'materia_prima' | 'producto_terminado')}
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
            >
              <option value="materia_prima">📦 Materia Prima</option>
              <option value="producto_terminado">👕 Producto Terminado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Proveedor */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">Proveedor</label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select
                name="proveedor_id"
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
              >
                <option value="">Sin proveedor (definir luego)</option>
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

          {/* Fecha OC */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Fecha OC <span className="text-red-500">*</span>
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <input
                name="fecha_oc"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
                className="w-full bg-transparent text-body-sm text-foreground outline-none"
              />
            </div>
          </div>
        </div>

        {/* Estado Greige - Solo para MP */}
        {tipo === 'materia_prima' && (
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">Estado de la tela</label>
            <div className="flex gap-3">
              {GREIGE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="estado_greige"
                    value={opt.value}
                    checked={greige === opt.value}
                    onChange={() => setGreige(opt.value)}
                    className="sr-only"
                  />
                  <div
                    className={`rounded-xl p-3 border-2 transition-all ${
                      greige === opt.value
                        ? 'border-primary-500 bg-primary-50 shadow-neu-inset'
                        : 'border-transparent bg-neu-base shadow-neu'
                    }`}
                  >
                    <p className="font-semibold text-body-sm text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Estado Documental - Solo para MP de tela */}
        {tipo === 'materia_prima' && (
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Estado documental (Afidávit)
            </label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select
                name="estado_documental"
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
              >
                {DOC_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">Solo se aplica a telas</p>
          </div>
        )}
      </div>

      {/* Líneas según tipo */}
      <div>
        {tipo === 'materia_prima' ? (
          <OCLineasMPForm materiales={materiales} onLineasChange={setLineasMP} />
        ) : (
          <OCLineasPTForm productos={productos} onLineasChange={setLineasPT} />
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-body-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neu-base shadow-neu text-primary-700 font-bold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60 hover:shadow-neu-lg"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear OC
        </button>
      </div>
    </form>
  )
}
