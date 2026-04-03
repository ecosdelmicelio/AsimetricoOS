'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { reportarHito } from '@/features/hitos-produccion/services/hitos-actions'
import { HITO_CONFIG, type Hito, type TipoHito } from '@/features/hitos-produccion/types'
import type { EstadoOP } from '@/features/ordenes-produccion/types'

const TIPO_HITO_OPTIONS: { value: TipoHito; label: string }[] = [
  { value: 'corte',      label: 'Corte' },
  { value: 'confeccion', label: 'Confección' },
  { value: 'dupro',      label: 'DuPro (Control en proceso)' },
  { value: 'terminado',  label: 'Terminado' },
  { value: 'fri',        label: 'FRI (Control final)' },
  { value: 'empaque',    label: 'Empaque' },
]

interface LineaOP {
  id: string
  producto_id: string | null
  productos: { nombre: string; referencia: string } | null
  talla: string
  cantidad_asignada: number
}

interface Props {
  opId: string
  estadoActual: EstadoOP
  hitos: Hito[]
  lineas: LineaOP[]
}

function formatTs(ts: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts))
}

export function HitosPanel({ opId, estadoActual, hitos: hitosIniciales, lineas }: Props) {
  const router = useRouter()
  const [hitos] = useState(hitosIniciales)
  const [showForm, setShowForm] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const visible = showAll ? hitos : hitos.slice(0, 4)
  const canReport = estadoActual !== 'completada' && estadoActual !== 'cancelada'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const hito      = fd.get('hito') as TipoHito
    const cantidad  = parseInt(fd.get('cantidad') as string, 10)
    const producto_id = fd.get('producto_id') as string || null
    const talla     = fd.get('talla') as string || null
    const notas     = fd.get('notas') as string || null

    if (!hito || isNaN(cantidad) || cantidad <= 0) {
      setError('Tipo de hito y cantidad son requeridos')
      return
    }

    setError(null)
    startTransition(async () => {
      const res = await reportarHito({ op_id: opId, hito, cantidad, producto_id, talla, notas })
      if (res.error) { setError(res.error); return }
      setShowForm(false)
      router.refresh()
    })
  }

  // Productos únicos en la OP para el selector
  const productosUnicos = Array.from(
    new Map(lineas.filter(l => l.producto_id).map(l => [l.producto_id, l])).values()
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-body-md">Hitos de Producción</h2>
        {canReport && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Reportar hito
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-neu-base shadow-neu-inset p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuevo hito</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tipo */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Tipo de hito *</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <select name="hito" required className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none">
                  <option value="">— Seleccionar —</option>
                  {TIPO_HITO_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cantidad */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Cantidad *</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  name="cantidad"
                  type="number"
                  min="1"
                  required
                  placeholder="120"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Producto (opcional) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Producto (opc.)</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <select name="producto_id" className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none">
                  <option value="">Todos</option>
                  {productosUnicos.map(l => (
                    <option key={l.producto_id} value={l.producto_id!}>
                      {l.productos?.referencia}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Talla */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Talla (opc.)</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  name="talla"
                  placeholder="XS, S, M, L, XL..."
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Notas (opc.)</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  name="notas"
                  placeholder="Observación..."
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null) }}
              className="px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
            >
              {pending && <Loader2 className="w-3 h-3 animate-spin" />}
              Registrar hito
            </button>
          </div>
        </form>
      )}

      {/* Lista de hitos */}
      {hitos.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
          <p className="text-muted-foreground text-body-sm">Sin hitos reportados aún</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-black/5">
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Uds.</span>
            <span className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Producto / Talla</span>
            <span className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Registrado</span>
          </div>

          <div className="divide-y divide-black/5">
            {visible.map(h => {
              const cfg = HITO_CONFIG[h.hito]
              return (
                <div key={h.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                  <div className="col-span-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <span className="col-span-2 font-bold text-foreground text-body-sm text-right">{h.cantidad}</span>
                  <div className="col-span-4 text-body-sm text-muted-foreground">
                    {h.talla && <span className="font-mono font-semibold text-foreground mr-1">{h.talla}</span>}
                    {h.notas && <span className="truncate">{h.notas}</span>}
                    {!h.talla && !h.notas && <span>—</span>}
                  </div>
                  <span className="col-span-4 text-xs text-muted-foreground">{formatTs(h.timestamp_registro)}</span>
                </div>
              )
            })}
          </div>

          {hitos.length > 4 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-black/5"
            >
              {showAll
                ? <><ChevronUp className="w-3 h-3" /> Mostrar menos</>
                : <><ChevronDown className="w-3 h-3" /> Ver {hitos.length - 4} hitos más</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  )
}
