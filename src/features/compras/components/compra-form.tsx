'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createOrdenCompra } from '@/features/compras/services/compras-actions'
import type { EstadoGreige, EstadoDocumental } from '@/features/compras/types'

interface Props {
  proveedores: { id: string; nombre: string }[]
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

export function CompraForm({ proveedores }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [greige, setGreige] = useState<EstadoGreige>('para_tejer')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fechaOC = fd.get('fecha_oc') as string
    const estadoDocumental = fd.get('estado_documental') as EstadoDocumental

    startTransition(async () => {
      const res = await createOrdenCompra({
        proveedor_id:      (fd.get('proveedor_id') as string) || undefined,
        estado_greige:     greige,
        estado_documental: estadoDocumental,
        fecha_oc:          fechaOC,
        notas:             (fd.get('notas') as string) || undefined,
      })
      if (res.error) { setError(res.error); return }
      router.push(`/compras/${res.data!.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h2 className="font-semibold text-foreground text-body-md">Datos de la Orden</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Proveedor */}
          <div className="space-y-1.5">
            <label className="text-body-sm font-medium text-foreground">Proveedor</label>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <select name="proveedor_id"
                className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none">
                <option value="">Sin proveedor (definir luego)</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            {proveedores.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Agrega proveedores en <a href="/terceros" className="text-primary-600 underline">Terceros</a>
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

        {/* Estado Greige */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Estado de la tela</label>
          <div className="flex gap-3">
            {GREIGE_OPTIONS.map(opt => (
              <label key={opt.value} className="flex-1 cursor-pointer">
                <input type="radio" name="estado_greige" value={opt.value}
                  checked={greige === opt.value}
                  onChange={() => setGreige(opt.value)}
                  className="sr-only" />
                <div className={`rounded-xl p-3 border-2 transition-all ${
                  greige === opt.value
                    ? 'border-primary-500 bg-primary-50 shadow-neu-inset'
                    : 'border-transparent bg-neu-base shadow-neu'
                }`}>
                  <p className="font-semibold text-body-sm text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Estado Documental */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Estado documental (Afidávit)</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <select name="estado_documental"
              className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none">
              {DOC_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-medium text-foreground">Notas (opcional)</label>
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
            <textarea name="notas" rows={2} placeholder="Especificaciones, referencias del proveedor..."
              className="w-full bg-transparent text-body-sm text-foreground outline-none resize-none placeholder:text-muted-foreground" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-body-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neu-base shadow-neu text-primary-700 font-bold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60 hover:shadow-neu-lg">
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear OC y registrar rollos
        </button>
      </div>
    </form>
  )
}
