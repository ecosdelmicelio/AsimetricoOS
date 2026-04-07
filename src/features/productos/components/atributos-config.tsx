'use client'

import { useState, useTransition } from 'react'
import { Loader2, Trash2, Plus } from 'lucide-react'
import { createAtributoPT, deleteAtributoPT } from '@/features/productos/services/atributo-actions'
import type { AtributoPT, TipoAtributo } from '@/features/productos/types/atributos'
import { TIPOS_ATRIBUTO, LABELS_ATRIBUTO } from '@/features/productos/types/atributos'

interface Props {
  atributos: AtributoPT[]
}

export function AtributosConfig({ atributos }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedTipo, setSelectedTipo] = useState<TipoAtributo>('tipo')
  const [nuevoValor, setNuevoValor] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const atributosPorTipo = TIPOS_ATRIBUTO.reduce(
    (acc, tipo) => {
      acc[tipo] = atributos.filter(a => a.tipo === tipo)
      return acc
    },
    {} as Record<TipoAtributo, AtributoPT[]>,
  )

  const handleAgregarAtributo = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!nuevoValor.trim()) {
      setError('Ingresa un valor')
      return
    }

    startTransition(async () => {
      const res = await createAtributoPT(selectedTipo, nuevoValor)
      if (res.error) {
        setError(res.error)
        return
      }
      setNuevoValor('')
      setSuccessMsg(`"${nuevoValor}" agregado a ${LABELS_ATRIBUTO[selectedTipo]}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    })
  }

  const handleEliminar = (id: string, valor: string) => {
    startTransition(async () => {
      const res = await deleteAtributoPT(id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Formulario para agregar */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="text-body-sm font-semibold text-foreground">Agregar nuevo atributo</h3>
        <form onSubmit={handleAgregarAtributo} className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Tipo</label>
            <select
              value={selectedTipo}
              onChange={e => setSelectedTipo(e.target.value as TipoAtributo)}
              className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke"
            >
              {TIPOS_ATRIBUTO.map(tipo => (
                <option key={tipo} value={tipo}>
                  {LABELS_ATRIBUTO[tipo]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Valor</label>
            <input
              type="text"
              value={nuevoValor}
              onChange={e => setNuevoValor(e.target.value)}
              placeholder="Ej: Slim, Verano 2025..."
              className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="self-end px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {error && <div className="text-red-600 text-body-sm">{error}</div>}
        {successMsg && <div className="text-green-600 text-body-sm">{successMsg}</div>}
      </div>

      {/* Lista por tipo */}
      <div className="space-y-4">
        {TIPOS_ATRIBUTO.map(tipo => (
          <div key={tipo} className="rounded-2xl bg-neu-base shadow-neu p-6">
            <h3 className="text-body-sm font-semibold text-foreground mb-3">
              {LABELS_ATRIBUTO[tipo]}
            </h3>

            {atributosPorTipo[tipo].length === 0 ? (
              <p className="text-muted-foreground text-body-sm">Sin atributos agregados</p>
            ) : (
              <div className="space-y-2">
                {atributosPorTipo[tipo].map(attr => (
                  <div
                    key={attr.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-neu border border-neu-stroke hover:bg-neu-hover transition-colors"
                  >
                    <span className="text-body-sm text-foreground">{attr.valor}</span>
                    <button
                      onClick={() => handleEliminar(attr.id, attr.valor)}
                      disabled={pending}
                      className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
