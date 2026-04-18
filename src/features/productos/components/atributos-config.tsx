'use client'

import { useState, useTransition, useEffect } from 'react'
import { Loader2, Trash2, Plus, Check, AlertCircle, Edit2, Lock } from 'lucide-react'
import { createAtributoPT, deleteAtributoPT, validateAbreviacionPT, updateAbreviacionPT, getAtributoPTUsos, toggleAtributoPTActivo } from '@/features/productos/services/atributo-actions'
import { generarAbreviacion } from '@/shared/lib/abreviacion-utils'
import type { AtributoPT, TipoAtributo } from '@/features/productos/types/atributos'
import { TIPOS_ATRIBUTO, LABELS_ATRIBUTO } from '@/features/productos/types/atributos'

interface Props {
  atributos: AtributoPT[]
}

// Longitud de abreviaciones por tipo
const LONGITUD_ABREVIACION: Record<TipoAtributo, number> = {
  genero: 1,
  tipo: 2,
  fit: 1,
  color: 3,
  diseno: 4,
  superior: 2,
  inferior: 2,
  capsula: 2,
}

export function AtributosConfig({ atributos }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedTipo, setSelectedTipo] = useState<TipoAtributo>('tipo')
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
        usosMap[atributo.id] = await getAtributoPTUsos(atributo.id)
      }
      setUsos(usosMap)
      setLoadingUsos(false)
    }
    cargarUsos()
  }, [atributos])

  const atributosPorTipo = TIPOS_ATRIBUTO.reduce(
    (acc, tipo) => {
      acc[tipo] = atributos.filter(a => a.tipo === tipo)
      return acc
    },
    {} as Record<TipoAtributo, AtributoPT[]>,
  )

  const handleValorChange = (valor: string) => {
    setNuevoValor(valor)
    // Auto-generar abreviación cuando cambia el valor
    if (valor.trim()) {
      const abrGenerada = generarAbreviacion(valor, LONGITUD_ABREVIACION[selectedTipo])
      setNuevoAbreviacion(abrGenerada)
    }
  }

  const handleValidarAbreviacion = (tipo: TipoAtributo, abreviacion: string, atributoId?: string) => {
    if (!abreviacion.trim()) return

    const key = atributoId || `new-${selectedTipo}`
    setValidationStatus(prev => ({ ...prev, [key]: 'pending' }))

    startTransition(async () => {
      const res = await validateAbreviacionPT(tipo, abreviacion, atributoId)
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

    const abrFinal = nuevoAbreviacion || generarAbreviacion(nuevoValor, LONGITUD_ABREVIACION[selectedTipo])

    startTransition(async () => {
      const res = await createAtributoPT(selectedTipo, nuevoValor, abrFinal)
      if (res.error) {
        setError(res.error)
        return
      }
      setNuevoValor('')
      setNuevoAbreviacion('')
      setValidationStatus({})
      setValidationErrors({})
      setSuccessMsg(`"${nuevoValor}" agregado a ${LABELS_ATRIBUTO[selectedTipo]}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    })
  }

  const handleEliminar = (id: string) => {
    const usosCount = usos[id] ?? 0
    if (usosCount > 0) {
      setError(`No se puede eliminar este atributo. Se usa en ${usosCount} producto${usosCount > 1 ? 's' : ''}.`)
      setTimeout(() => setError(null), 5000)
      return
    }

    if (!confirm('¿Eliminar este atributo?')) return
    startTransition(async () => {
      const res = await deleteAtributoPT(id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  const handleToggleActivo = (id: string) => {
    startTransition(async () => {
      const res = await toggleAtributoPTActivo(id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  const handleEditarAbreviacion = (id: string, valorActual: string) => {
    const usosCount = usos[id] ?? 0
    if (usosCount > 0) {
      setError(`No se puede editar este atributo. Se usa en ${usosCount} producto${usosCount > 1 ? 's' : ''}.`)
      setTimeout(() => setError(null), 5000)
      return
    }
    setEditingId(id)
    setEditingAbreviacion(valorActual || '')
  }

  const handleGuardarAbreviacion = (id: string, tipo: TipoAtributo) => {
    if (!editingAbreviacion.trim()) {
      setError('La abreviación no puede estar vacía')
      return
    }

    startTransition(async () => {
      const res = await updateAbreviacionPT(id, editingAbreviacion)
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
    <div className="space-y-8 text-slate-900">
      {/* Formulario para agregar Premium */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Configuración de Atributos</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">Expansión de taxonomía industrial</p>
          </div>
        </div>

        <form onSubmit={handleAgregarAtributo} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dimensión</label>
              <select
                value={selectedTipo}
                onChange={e => setSelectedTipo(e.target.value as TipoAtributo)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-black uppercase tracking-tight text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all appearance-none"
              >
                {TIPOS_ATRIBUTO.map(tipo => (
                  <option key={tipo} value={tipo}>
                    {LABELS_ATRIBUTO[tipo]}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor del Atributo</label>
              <input
                type="text"
                value={nuevoValor}
                onChange={e => handleValorChange(e.target.value)}
                placeholder="EJ: SLIM FIT, VERANO 2025..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-black uppercase tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Abrev. Sistemática</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoAbreviacion}
                  onChange={e => setNuevoAbreviacion(e.target.value.toUpperCase())}
                  maxLength={LONGITUD_ABREVIACION[selectedTipo]}
                  placeholder="AUTO"
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => handleValidarAbreviacion(selectedTipo, nuevoAbreviacion)}
                  disabled={pending || !nuevoAbreviacion}
                  className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 transition-all disabled:opacity-50"
                >
                  {validationStatus[`new-${selectedTipo}`] === 'valid' && <Check className="w-4 h-4 text-emerald-600" />}
                  {validationStatus[`new-${selectedTipo}`] === 'invalid' && <AlertCircle className="w-4 h-4 text-red-600" />}
                  {validationStatus[`new-${selectedTipo}`] === 'pending' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {!validationStatus[`new-${selectedTipo}`] && <Edit2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex-1">
              {validationErrors[`new-${selectedTipo}`] && (
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors[`new-${selectedTipo}`]}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              Empadronar Atributo
            </button>
          </div>
        </form>

        {error && <div className="text-red-600 text-[10px] font-black uppercase tracking-widest text-center mt-2">{error}</div>}
        {successMsg && <div className="text-emerald-600 text-[10px] font-black uppercase tracking-widest text-center mt-2">{successMsg}</div>}
      </div>

      {/* Grid de Atributos Premium */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {TIPOS_ATRIBUTO.map(tipo => (
          <div key={tipo} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group/card transition-all hover:border-slate-200">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[.25em]">
                {LABELS_ATRIBUTO[tipo]}
              </h3>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-white border border-slate-100 rounded-full">
                {atributosPorTipo[tipo].length} ITEM{atributosPorTipo[tipo].length !== 1 ? 'S' : ''}
              </span>
            </div>

            <div className="p-4">
              {atributosPorTipo[tipo].length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[.2em]">Sectores sin Definición</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-50">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="text-left py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descriptor</th>
                        <th className="text-left py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-24">A01</th>
                        <th className="text-center py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-28">Status</th>
                        <th className="text-right py-3 px-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {atributosPorTipo[tipo].map(attr => (
                        <tr key={attr.id} className="group/row hover:bg-slate-50/50 transition-all">
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{attr.valor}</span>
                          </td>
                          <td className="py-3 px-4">
                            {editingId === attr.id ? (
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={editingAbreviacion}
                                  onChange={e => setEditingAbreviacion(e.target.value.toUpperCase())}
                                  maxLength={LONGITUD_ABREVIACION[tipo]}
                                  className="w-16 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-mono font-black"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleGuardarAbreviacion(attr.id, tipo)}
                                  disabled={pending}
                                  className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group-hover/row:translate-x-1 transition-transform">
                                <span className={cn("text-[10px] font-mono font-black px-2 py-1 rounded bg-slate-100", 
                                  attr.abreviacion ? "text-slate-900" : "text-slate-300"
                                )}>
                                  {attr.abreviacion || "???"}
                                </span>
                                {attr.abreviacion && (
                                  <button
                                    onClick={() => handleEditarAbreviacion(attr.id, attr.abreviacion || '')}
                                    disabled={pending}
                                    className="text-slate-300 hover:text-slate-900 opacity-0 group-hover/row:opacity-100 transition-all"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {editingId !== attr.id && (
                              <div className="flex flex-col items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleActivo(attr.id)}
                                  disabled={pending}
                                  className={cn('text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all',
                                    attr.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                                  )}
                                >
                                  {attr.activo ? 'Activo' : 'Inactivo'}
                                </button>
                                {(usos[attr.id] ?? 0) > 0 && (
                                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">
                                    {usos[attr.id]} Vinculaciones
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {editingId !== attr.id && (
                              <div className="flex justify-end">
                                {(usos[attr.id] ?? 0) === 0 ? (
                                  <button
                                    onClick={() => handleEliminar(attr.id)}
                                    disabled={pending}
                                    className="p-2 rounded-xl bg-white border border-slate-100 text-slate-200 hover:text-red-600 hover:border-red-100 hover:shadow-sm transition-all opacity-0 group-hover/row:opacity-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <div className="p-2 text-slate-300 cursor-not-allowed">
                                    <Lock className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
