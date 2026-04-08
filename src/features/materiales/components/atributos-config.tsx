'use client'

import { useState, useTransition, useEffect } from 'react'
import { Loader2, Trash2, Plus, Check, AlertCircle, Edit2, Lock } from 'lucide-react'
import { createAtributoMP, deleteAtributoMP, validateAbreviacionMP, updateAbreviacionMP, getAtributoMPUsos, toggleAtributoMPActivo } from '@/features/materiales/services/atributo-actions'
import { generarAbreviacion } from '@/shared/lib/abreviacion-utils'
import type { AtributoMP, TipoAtributoMP } from '@/features/materiales/types/atributos'
import { TIPOS_ATRIBUTO_MP, LABELS_ATRIBUTO_MP } from '@/features/materiales/types/atributos'

interface Props {
  atributos: AtributoMP[]
}

// Longitud de abreviaciones por tipo MP
const LONGITUD_ABREVIACION_MP: Record<TipoAtributoMP, number> = {
  tipo: 2,
  subtipo: 2,
  color: 3,
  diseño: 4,
}

export function AtributosConfigMP({ atributos }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedTipo, setSelectedTipo] = useState<TipoAtributoMP>('tipo')
  const [nuevoValor, setNuevoValor] = useState('')
  const [nuevoAbreviacion, setNuevoAbreviacion] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingAbreviacion, setEditingAbreviacion] = useState('')
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'pending'>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [usos, setUsos] = useState<Record<string, number>>({})
  const [loadingUsos, setLoadingUsos] = useState(true)

  // Cargar usos de cada atributo
  useEffect(() => {
    const cargarUsos = async () => {
      setLoadingUsos(true)
      const usosMap: Record<string, number> = {}
      for (const atributo of atributos) {
        usosMap[atributo.id] = await getAtributoMPUsos(atributo.id)
      }
      setUsos(usosMap)
      setLoadingUsos(false)
    }
    cargarUsos()
  }, [atributos])

  const atributosPorTipo = TIPOS_ATRIBUTO_MP.reduce(
    (acc, tipo) => {
      acc[tipo] = atributos.filter(a => a.tipo === tipo)
      return acc
    },
    {} as Record<TipoAtributoMP, AtributoMP[]>,
  )

  const handleValorChange = (valor: string) => {
    setNuevoValor(valor)
    if (valor.trim()) {
      const abrGenerada = generarAbreviacion(valor, LONGITUD_ABREVIACION_MP[selectedTipo])
      setNuevoAbreviacion(abrGenerada)
    }
  }

  const handleValidarAbreviacion = (tipo: TipoAtributoMP, abreviacion: string, atributoId?: string) => {
    if (!abreviacion.trim()) return

    const key = atributoId || `new-${selectedTipo}`
    setValidationStatus(prev => ({ ...prev, [key]: 'pending' }))

    startTransition(async () => {
      const res = await validateAbreviacionMP(tipo, abreviacion, atributoId)
      if (res.isValid) {
        setValidationStatus(prev => ({ ...prev, [key]: 'valid' }))
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[key]
          return newErrors
        })
      } else {
        setValidationStatus(prev => ({ ...prev, [key]: 'invalid' }))
        setValidationErrors(prev => ({ ...prev, [key]: res.error || 'Inválido' }))
      }
    })
  }

  const handleAgregarAtributo = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!nuevoValor.trim()) {
      setError('Ingresa un valor')
      return
    }

    const abrFinal = nuevoAbreviacion || generarAbreviacion(nuevoValor, LONGITUD_ABREVIACION_MP[selectedTipo])

    startTransition(async () => {
      const res = await createAtributoMP(selectedTipo, nuevoValor, abrFinal)
      if (res.error) {
        setError(res.error)
        return
      }
      setNuevoValor('')
      setNuevoAbreviacion('')
      setValidationStatus({})
      setValidationErrors({})
      setSuccessMsg(`"${nuevoValor}" agregado a ${LABELS_ATRIBUTO_MP[selectedTipo]}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    })
  }

  const handleEliminar = (id: string) => {
    const usosCount = usos[id] ?? 0
    if (usosCount > 0) {
      setError(`No se puede eliminar este atributo. Se usa en ${usosCount} material${usosCount > 1 ? 'es' : ''}.`)
      setTimeout(() => setError(null), 5000)
      return
    }

    if (!confirm('¿Eliminar este atributo?')) return
    startTransition(async () => {
      const res = await deleteAtributoMP(id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  const handleToggleActivo = (id: string) => {
    startTransition(async () => {
      const res = await toggleAtributoMPActivo(id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  const handleEditarAbreviacion = (id: string, valorActual: string) => {
    const usosCount = usos[id] ?? 0
    if (usosCount > 0) {
      setError(`No se puede editar este atributo. Se usa en ${usosCount} material${usosCount > 1 ? 'es' : ''}.`)
      setTimeout(() => setError(null), 5000)
      return
    }
    setEditingId(id)
    setEditingAbreviacion(valorActual || '')
  }

  const handleGuardarAbreviacion = (id: string, tipo: TipoAtributoMP) => {
    if (!editingAbreviacion.trim()) {
      setError('La abreviación no puede estar vacía')
      return
    }

    startTransition(async () => {
      const res = await updateAbreviacionMP(id, editingAbreviacion)
      if (res.error) {
        setError(res.error)
        return
      }
      setEditingId(null)
      setEditingAbreviacion('')
      setSuccessMsg('Abreviación actualizada')
      setTimeout(() => setSuccessMsg(null), 3000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Formulario para agregar */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="text-body-sm font-semibold text-foreground">Agregar nuevo atributo</h3>
        <form onSubmit={handleAgregarAtributo} className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Tipo</label>
              <select
                value={selectedTipo}
                onChange={e => setSelectedTipo(e.target.value as TipoAtributoMP)}
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke"
              >
                {TIPOS_ATRIBUTO_MP.map(tipo => (
                  <option key={tipo} value={tipo}>
                    {LABELS_ATRIBUTO_MP[tipo]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Valor</label>
              <input
                type="text"
                value={nuevoValor}
                onChange={e => handleValorChange(e.target.value)}
                placeholder="Ej: Algodón, Rojo, Estampado..."
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Abr.</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoAbreviacion}
                  onChange={e => setNuevoAbreviacion(e.target.value.toUpperCase())}
                  maxLength={LONGITUD_ABREVIACION_MP[selectedTipo]}
                  placeholder="Auto"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => handleValidarAbreviacion(selectedTipo, nuevoAbreviacion)}
                  disabled={pending || !nuevoAbreviacion}
                  className="self-end p-2.5 rounded-xl bg-neu text-foreground hover:bg-neu-hover transition-colors disabled:opacity-50"
                  title="Validar abreviación"
                >
                  {validationStatus[`new-${selectedTipo}`] === 'valid' && <Check className="w-4 h-4 text-green-600" />}
                  {validationStatus[`new-${selectedTipo}`] === 'invalid' && <AlertCircle className="w-4 h-4 text-red-600" />}
                  {validationStatus[`new-${selectedTipo}`] === 'pending' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {!validationStatus[`new-${selectedTipo}`] && <Edit2 className="w-4 h-4" />}
                </button>
              </div>
              {validationErrors[`new-${selectedTipo}`] && (
                <p className="text-xs text-red-600">{validationErrors[`new-${selectedTipo}`]}</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </form>

        {error && <div className="text-red-600 text-body-sm">{error}</div>}
        {successMsg && <div className="text-green-600 text-body-sm">{successMsg}</div>}
      </div>

      {/* Lista por tipo */}
      <div className="space-y-4">
        {TIPOS_ATRIBUTO_MP.map(tipo => (
          <div key={tipo} className="rounded-2xl bg-neu-base shadow-neu p-6">
            <h3 className="text-body-sm font-semibold text-foreground mb-4">
              {LABELS_ATRIBUTO_MP[tipo]}
            </h3>

            {atributosPorTipo[tipo].length === 0 ? (
              <p className="text-muted-foreground text-body-sm">Sin atributos agregados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b border-neu-stroke">
                      <th className="text-left py-2 px-3 font-semibold text-foreground">Valor</th>
                      <th className="text-left py-2 px-3 font-semibold text-foreground w-24">Abr.</th>
                      <th className="text-center py-2 px-3 font-semibold text-foreground w-20">Estado</th>
                      <th className="text-right py-2 px-3 font-semibold text-foreground w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {atributosPorTipo[tipo].map(attr => (
                      <tr key={attr.id} className="border-b border-neu-stroke hover:bg-neu-hover transition-colors">
                        <td className="py-2.5 px-3 text-foreground">{attr.valor}</td>
                        <td className="py-2.5 px-3">
                          {editingId === attr.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editingAbreviacion}
                                onChange={e => setEditingAbreviacion(e.target.value.toUpperCase())}
                                maxLength={LONGITUD_ABREVIACION_MP[tipo]}
                                className="flex-1 px-2 py-1 rounded bg-white border border-neu-stroke text-body-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleGuardarAbreviacion(attr.id, tipo)}
                                disabled={pending}
                                className="px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-foreground font-mono">
                                {attr.abreviacion || <span className="text-muted-foreground text-xs">—</span>}
                              </span>
                              {attr.abreviacion && (
                                <button
                                  onClick={() => handleEditarAbreviacion(attr.id, attr.abreviacion || '')}
                                  disabled={pending}
                                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {editingId !== attr.id && (
                            <div className="flex items-center justify-center gap-1">
                              {(usos[attr.id] ?? 0) > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {usos[attr.id]} uso{usos[attr.id] !== 1 ? 's' : ''}
                                </span>
                              )}
                              <button
                                onClick={() => handleToggleActivo(attr.id)}
                                disabled={pending}
                                className={`text-xs font-semibold px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                                  attr.activo
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {attr.activo ? 'Activo' : 'Inactivo'}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right flex justify-end gap-1">
                          {editingId !== attr.id && (
                            <>
                              {(usos[attr.id] ?? 0) === 0 && (
                                <button
                                  onClick={() => handleEliminar(attr.id)}
                                  disabled={pending}
                                  className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              {(usos[attr.id] ?? 0) > 0 && (
                                <div className="text-muted-foreground" title="No se puede eliminar: en uso">
                                  <Lock className="w-4 h-4" />
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
