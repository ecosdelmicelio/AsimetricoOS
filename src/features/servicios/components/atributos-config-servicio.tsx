'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Plus, Trash2, Edit2, Loader2, Lightbulb, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  createTipoServicioAtributo,
  updateTipoServicioAtributo,
  deleteTipoServicioAtributo,
  toggleTipoServicioAtributoActivo,
  getTipoServicioAtributoUsos,
} from '@/features/servicios/services/atributo-servicio-actions'
import { generarSugestionAbreviatura } from '@/features/servicios/lib/abreviatura-utils'
import type { TipoServicioAtributo } from '@/features/servicios/types/servicios'

interface Props {
  atributos: TipoServicioAtributo[]
}

export function AtributosConfigServicio({ atributos }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [usos, setUsos] = useState<Record<string, number>>({})
  const [loadingUsos, setLoadingUsos] = useState(true)

  // Cargar usos de cada atributo
  useEffect(() => {
    const cargarUsos = async () => {
      setLoadingUsos(true)
      const usosMap: Record<string, number> = {}
      for (const atributo of atributos) {
        usosMap[atributo.id] = await getTipoServicioAtributoUsos(atributo.id)
      }
      setUsos(usosMap)
      setLoadingUsos(false)
    }
    cargarUsos()
  }, [atributos])

  // Formulario Tipo
  const [showFormTipo, setShowFormTipo] = useState(false)
  const [nombreTipo, setNombreTipo] = useState('')
  const [abreviaturaTipo, setAbreviaturaTipo] = useState('')
  const [abreviaturaTipoSugerida, setAbreviaturaTipoSugerida] = useState(true)

  // Formulario Subtipo
  const [showFormSubtipo, setShowFormSubtipo] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(null)
  const [nombreSubtipo, setNombreSubtipo] = useState('')
  const [abreviaturaSubtipo, setAbreviaturaSubtipo] = useState('')
  const [abreviaturaSubtipoSugerida, setAbreviaturaSubtipoSugerida] = useState(true)

  // Formulario Detalle
  const [showFormDetalle, setShowFormDetalle] = useState(false)
  const [subtipoSeleccionado, setSubtipoSeleccionado] = useState<string | null>(null)
  const [nombreDetalle, setNombreDetalle] = useState('')
  const [abreviaturaDetalle, setAbreviaturaDetalle] = useState('')
  const [abreviaturaDetalleSugerida, setAbreviaturaDetalleSugerida] = useState(true)

  // Edición
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNombre, setEditingNombre] = useState('')
  const [editingAbreviatura, setEditingAbreviatura] = useState('')

  // Agrupar por tipo
  const tipos = atributos.filter(a => a.atributo_tipo === 'tipo')
  const subtipos = atributos.filter(a => a.atributo_tipo === 'subtipo')
  const detalles = atributos.filter(a => a.atributo_tipo === 'detalle')

  // Obtener abreviaturas existentes
  const abreviaturasExistentes = useMemo(() => {
    return atributos.map(a => a.abreviatura)
  }, [atributos])

  // Handler para cambio de nombre en Tipo - generar sugerencia
  const handleNombreTipoChange = (value: string) => {
    setNombreTipo(value)
    if (value.trim()) {
      const sugerencia = generarSugestionAbreviatura(value, abreviaturasExistentes)
      setAbreviaturaTipo(sugerencia)
      setAbreviaturaTipoSugerida(true)
    }
  }

  // Handler para cambio de nombre en Subtipo - generar sugerencia
  const handleNombreSubtipoChange = (value: string) => {
    setNombreSubtipo(value)
    if (value.trim()) {
      const sugerencia = generarSugestionAbreviatura(value, abreviaturasExistentes)
      setAbreviaturaSubtipo(sugerencia)
      setAbreviaturaSubtipoSugerida(true)
    }
  }

  // Handler para cambio de nombre en Detalle - generar sugerencia
  const handleNombreDetalleChange = (value: string) => {
    setNombreDetalle(value)
    if (value.trim()) {
      const sugerencia = generarSugestionAbreviatura(value, abreviaturasExistentes)
      setAbreviaturaDetalle(sugerencia)
      setAbreviaturaDetalleSugerida(true)
    }
  }

  // Handler para edición manual de abreviatura
  const handleAbreviaturaTipoChange = (value: string) => {
    setAbreviaturaTipo(value)
    setAbreviaturaTipoSugerida(false)
  }

  const handleAbreviaturaSubtipoChange = (value: string) => {
    setAbreviaturaSubtipo(value)
    setAbreviaturaSubtipoSugerida(false)
  }

  const handleAbreviaturaDetalleChange = (value: string) => {
    setAbreviaturaDetalle(value)
    setAbreviaturaDetalleSugerida(false)
  }

  const handleAgregarTipo = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!nombreTipo.trim() || !abreviaturaTipo.trim()) {
      setError('Nombre y abreviatura son obligatorios')
      return
    }

    startTransition(async () => {
      const res = await createTipoServicioAtributo('tipo', nombreTipo, abreviaturaTipo)
      if (res.error) {
        setError(res.error)
        return
      }

      setNombreTipo('')
      setAbreviaturaTipo('')
      setAbreviaturaTipoSugerida(true)
      setShowFormTipo(false)
      setSuccessMsg(`Tipo "${nombreTipo}" agregado`)
      setTimeout(() => setSuccessMsg(null), 3000)
    })
  }

  const handleAgregarSubtipo = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!tipoSeleccionado) {
      setError('Debe seleccionar un tipo')
      return
    }

    if (!nombreSubtipo.trim() || !abreviaturaSubtipo.trim()) {
      setError('Nombre y abreviatura son obligatorios')
      return
    }

    startTransition(async () => {
      const res = await createTipoServicioAtributo('subtipo', nombreSubtipo, abreviaturaSubtipo, tipoSeleccionado)
      if (res.error) {
        setError(res.error)
        return
      }

      setNombreSubtipo('')
      setAbreviaturaSubtipo('')
      setAbreviaturaSubtipoSugerida(true)
      setTipoSeleccionado(null)
      setShowFormSubtipo(false)
      setSuccessMsg(`Subtipo "${nombreSubtipo}" agregado`)
      setTimeout(() => setSuccessMsg(null), 3000)
    })
  }

  const handleAgregarDetalle = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!subtipoSeleccionado) {
      setError('Debe seleccionar un subtipo')
      return
    }

    if (!nombreDetalle.trim() || !abreviaturaDetalle.trim()) {
      setError('Nombre y abreviatura son obligatorios')
      return
    }

    startTransition(async () => {
      const res = await createTipoServicioAtributo('detalle', nombreDetalle, abreviaturaDetalle, undefined, subtipoSeleccionado)
      if (res.error) {
        setError(res.error)
        return
      }

      setNombreDetalle('')
      setAbreviaturaDetalle('')
      setAbreviaturaDetalleSugerida(true)
      setSubtipoSeleccionado(null)
      setShowFormDetalle(false)
      setSuccessMsg(`Detalle "${nombreDetalle}" agregado`)
      setTimeout(() => setSuccessMsg(null), 3000)
    })
  }

  const handleEditarGuardar = (id: string) => {
    setError(null)

    startTransition(async () => {
      const res = await updateTipoServicioAtributo(id, {
        nombre: editingNombre,
        abreviatura: editingAbreviatura,
      })
      if (res.error) {
        setError(res.error)
        return
      }

      setEditingId(null)
      setSuccessMsg('Atributo actualizado')
      setTimeout(() => setSuccessMsg(null), 3000)
    })
  }

  const handleEliminar = (id: string) => {
    const usosCount = usos[id] ?? 0
    if (usosCount > 0) {
      setError(`No se puede eliminar este atributo. Está siendo usado en ${usosCount} servicio${usosCount > 1 ? 's' : ''}.`)
      setTimeout(() => setError(null), 5000)
      return
    }

    if (!confirm('¿Eliminar este atributo?')) return
    startTransition(async () => {
      const res = await deleteTipoServicioAtributo(id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  const handleToggleActivo = (id: string) => {
    startTransition(async () => {
      const res = await toggleTipoServicioAtributoActivo(id)
      if (res.error) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="space-y-12 text-slate-900">
      {/* TIPOS PREMIUM */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Categorización Primaria</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">Tipos de Servicio / Operaciones Base</p>
            </div>
          </div>
          {!showFormTipo && (
            <button
              onClick={() => {
                setShowFormTipo(true)
                setNombreTipo('')
                setAbreviaturaTipo('')
                setAbreviaturaTipoSugerida(true)
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Tipo
            </button>
          )}
        </div>

        {showFormTipo && (
          <form onSubmit={handleAgregarTipo} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Operativo</label>
                <input
                  type="text"
                  value={nombreTipo}
                  onChange={e => handleNombreTipoChange(e.target.value)}
                  placeholder="EJ: CORTE, CONFECCIÓN, EMPAQUE..."
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abreviatura Sugerida</label>
                  {abreviaturaTipoSugerida && nombreTipo.trim() && (
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-full">Automática</span>
                  )}
                </div>
                <input
                  type="text"
                  value={abreviaturaTipo}
                  onChange={e => handleAbreviaturaTipoChange(e.target.value)}
                  placeholder="EJ: CO"
                  maxLength={3}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all uppercase"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Plus className="w-4 h-4" />
                Empadronar Tipo
              </button>
              <button
                type="button"
                onClick={() => setShowFormTipo(false)}
                className="px-8 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-50">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estructura Nominal</th>
                <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest w-40">Identificador</th>
                <th className="text-center py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Status</th>
                <th className="text-right py-4 px-6 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tipos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Sectores sin Definición Primaria</p>
                  </td>
                </tr>
              ) : (
                tipos.map(tipo => (
                  <tr key={tipo.id} className="group/row hover:bg-slate-50/30 transition-all">
                    <td className="py-4 px-6">
                      {editingId === tipo.id ? (
                        <input
                          type="text"
                          value={editingNombre}
                          onChange={e => setEditingNombre(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-[11px] font-black uppercase"
                          autoFocus
                        />
                      ) : (
                        <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">{tipo.nombre}</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {editingId === tipo.id ? (
                        <input
                          type="text"
                          value={editingAbreviatura}
                          onChange={e => setEditingAbreviatura(e.target.value)}
                          maxLength={3}
                          className="w-20 px-3 py-2 rounded-xl bg-white border border-slate-300 text-[11px] font-mono font-black uppercase"
                        />
                      ) : (
                        <span className="text-[11px] font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/50 uppercase tracking-widest">
                          {tipo.abreviatura}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {editingId !== tipo.id && (
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            onClick={() => handleToggleActivo(tipo.id)}
                            disabled={pending}
                            className={cn('text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all',
                              tipo.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                            )}
                          >
                            {tipo.activo ? 'Vigente' : 'Inactivo'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        {editingId === tipo.id ? (
                          <>
                            <button
                              onClick={() => handleEditarGuardar(tipo.id)}
                              disabled={pending}
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                            >
                              <Plus className="w-4 h-4 rotate-45 scale-75" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"
                            >
                              <Plus className="w-4 h-4 rotate-45" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                const usosCount = usos[tipo.id] ?? 0
                                if (usosCount > 0) {
                                  setError(`Restricción: ${usosCount} servicios vinculados.`)
                                  setTimeout(() => setError(null), 5000)
                                  return
                                }
                                setEditingId(tipo.id)
                                setEditingNombre(tipo.nombre)
                                setEditingAbreviatura(tipo.abreviatura)
                              }}
                              className="p-2 rounded-xl bg-white border border-slate-100 text-slate-300 hover:text-slate-900 hover:border-slate-200 hover:shadow-sm opacity-0 group-hover/row:opacity-100 transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {(usos[tipo.id] ?? 0) === 0 && (
                              <button
                                onClick={() => handleEliminar(tipo.id)}
                                className="p-2 rounded-xl bg-white border border-slate-100 text-slate-300 hover:text-red-500 hover:border-red-100 hover:shadow-sm opacity-0 group-hover/row:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUBTIPOS PREMIUM */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Subcategorización por Segmento</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">Especialización de Procesos Operativos</p>
            </div>
          </div>
          {!showFormSubtipo && (
            <button
              onClick={() => {
                setShowFormSubtipo(true)
                setNombreSubtipo('')
                setAbreviaturaSubtipo('')
                setAbreviaturaSubtipoSugerida(true)
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Subtipo
            </button>
          )}
        </div>

        {showFormSubtipo && (
          <form onSubmit={handleAgregarSubtipo} className="p-6 rounded-3xl bg-indigo-50/30 border border-indigo-100 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clasificación Superior</label>
                <select
                  value={tipoSeleccionado || ''}
                  onChange={e => setTipoSeleccionado(e.target.value || null)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-indigo-100 text-xs font-black uppercase tracking-tight text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 transition-all appearance-none"
                >
                  <option value="">SELECCIONAR TIPO...</option>
                  {tipos.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Sub-Operativo</label>
                <input
                  type="text"
                  value={nombreSubtipo}
                  onChange={e => handleNombreSubtipoChange(e.target.value)}
                  placeholder="EJ: RECTO, CIRCULAR..."
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-indigo-100 text-xs font-black uppercase tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador Sugerido</label>
                  {abreviaturaSubtipoSugerida && nombreSubtipo.trim() && (
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-white px-2 py-0.5 rounded-full border border-indigo-100">AUTO</span>
                  )}
                </div>
                <input
                  type="text"
                  value={abreviaturaSubtipo}
                  onChange={e => handleAbreviaturaSubtipoChange(e.target.value)}
                  placeholder="EJ: RCT"
                  maxLength={4}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-indigo-100 text-xs font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/5 transition-all uppercase"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Plus className="w-4 h-4" />
                Registrar Subtipo
              </button>
              <button
                type="button"
                onClick={() => setShowFormSubtipo(false)}
                className="px-8 py-3.5 rounded-2xl bg-white border border-indigo-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-50">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descriptor Segmentado</th>
                <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest w-40">Identificador</th>
                <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest w-40">Taxonomía Padre</th>
                <th className="text-center py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Status</th>
                <th className="text-right py-4 px-6 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subtipos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">En espera de definiciones secundarias</p>
                  </td>
                </tr>
              ) : (
                subtipos.map(subtipo => {
                  const tipoPadre = tipos.find(t => t.id === subtipo.tipo_padre_id)
                  return (
                    <tr key={subtipo.id} className="group/row hover:bg-slate-50/30 transition-all">
                      <td className="py-4 px-6">
                        {editingId === subtipo.id ? (
                          <input
                            type="text"
                            value={editingNombre}
                            onChange={e => setEditingNombre(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-[11px] font-black uppercase"
                            autoFocus
                          />
                        ) : (
                          <span className="font-black text-slate-900 uppercase tracking-tight">{subtipo.nombre}</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {editingId === subtipo.id ? (
                          <input
                            type="text"
                            value={editingAbreviatura}
                            onChange={e => setEditingAbreviatura(e.target.value)}
                            maxLength={4}
                            className="w-20 px-3 py-2 rounded-xl bg-white border border-slate-300 text-[11px] font-mono font-black uppercase"
                          />
                        ) : (
                          <span className="font-mono font-black text-indigo-500 bg-indigo-50/50 px-2.5 py-1.5 rounded-xl border border-indigo-100/30 uppercase tracking-[0.15em]">
                            {subtipo.abreviatura}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[9px] font-black text-slate-500 bg-white border border-slate-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">{tipoPadre?.nombre || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {editingId !== subtipo.id && (
                          <button
                            onClick={() => handleToggleActivo(subtipo.id)}
                            className={cn('text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all',
                              subtipo.activo ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                            )}
                          >
                            {subtipo.activo ? 'Activo' : 'Vancante'}
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              if (editingId === subtipo.id) {
                                handleEditarGuardar(subtipo.id)
                              } else {
                                const usosCount = usos[subtipo.id] ?? 0
                                if (usosCount > 0) {
                                  setError(`Sub-Nivel bloqueado: ${usosCount} servicios.`)
                                  setTimeout(() => setError(null), 5000)
                                  return
                                }
                                setEditingId(subtipo.id)
                                setEditingNombre(subtipo.nombre)
                                setEditingAbreviatura(subtipo.abreviatura)
                              }
                            }}
                            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-300 hover:text-slate-900 hover:border-slate-200 hover:shadow-sm opacity-0 group-hover/row:opacity-100 transition-all"
                          >
                            {editingId === subtipo.id ? <Check className="w-4 h-4 scale-75" /> : <Edit2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETALLES PREMIUM */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Matriz de Especificidad</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">Nivel Atómico de Configuración de Servicio</p>
            </div>
          </div>
          {!showFormDetalle && (
            <button
              onClick={() => {
                setShowFormDetalle(true)
                setNombreDetalle('')
                setAbreviaturaDetalle('')
                setAbreviaturaDetalleSugerida(true)
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Detalle
            </button>
          )}
        </div>

        {showFormDetalle && (
          <form onSubmit={handleAgregarDetalle} className="p-6 rounded-3xl bg-emerald-50/30 border border-emerald-100 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subtipo Vinculado</label>
                <select
                  value={subtipoSeleccionado || ''}
                  onChange={e => setSubtipoSeleccionado(e.target.value || null)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-emerald-100 text-xs font-black uppercase tracking-tight text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600/5 transition-all appearance-none"
                >
                  <option value="">SELECCIONAR SUBTIPO...</option>
                  {subtipos.map(subtipo => (
                    <option key={subtipo.id} value={subtipo.id}>{subtipo.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descriptor Atómico</label>
                <input
                  type="text"
                  value={nombreDetalle}
                  onChange={e => handleNombreDetalleChange(e.target.value)}
                  placeholder="EJ: DIAGONAL, REFORZADO..."
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-emerald-100 text-xs font-black uppercase tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador Sugerido</label>
                  {abreviaturaDetalleSugerida && nombreDetalle.trim() && (
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter bg-white px-2 py-0.5 rounded-full border border-emerald-100">AUTO</span>
                  )}
                </div>
                <input
                  type="text"
                  value={abreviaturaDetalle}
                  onChange={e => handleAbreviaturaDetalleChange(e.target.value)}
                  placeholder="EJ: DGN"
                  maxLength={4}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-emerald-100 text-xs font-mono font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600/5 transition-all uppercase"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Plus className="w-4 h-4" />
                Registrar Detalle
              </button>
              <button
                type="button"
                onClick={() => setShowFormDetalle(false)}
                className="px-8 py-3.5 rounded-2xl bg-white border border-emerald-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-50">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descriptor de Especialidad</th>
                <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest w-40">Identificador</th>
                <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest w-40">Taxonomía Padre (Sub)</th>
                <th className="text-center py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Status</th>
                <th className="text-right py-4 px-6 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {detalles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">En espera de especialidades atómicas</p>
                  </td>
                </tr>
              ) : (
                detalles.map(detalle => {
                  const subtipoPadre = subtipos.find(s => s.id === detalle.subtipo_padre_id)
                  return (
                    <tr key={detalle.id} className="group/row hover:bg-slate-50/30 transition-all">
                      <td className="py-4 px-6">
                        {editingId === detalle.id ? (
                          <input
                            type="text"
                            value={editingNombre}
                            onChange={e => setEditingNombre(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-[11px] font-black uppercase"
                            autoFocus
                          />
                        ) : (
                          <span className="font-black text-slate-900 uppercase tracking-tight">{detalle.nombre}</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {editingId === detalle.id ? (
                          <input
                            type="text"
                            value={editingAbreviatura}
                            onChange={e => setEditingAbreviatura(e.target.value)}
                            maxLength={4}
                            className="w-20 px-3 py-2 rounded-xl bg-white border border-slate-300 text-[11px] font-mono font-black uppercase"
                          />
                        ) : (
                          <span className="font-mono font-black text-emerald-500 bg-emerald-50/50 px-2.5 py-1.5 rounded-xl border border-emerald-100/30 uppercase tracking-[0.15em]">
                            {detalle.abreviatura}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[9px] font-black text-slate-500 bg-white border border-slate-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">{subtipoPadre?.nombre || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {editingId !== detalle.id && (
                          <div className={cn('text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border',
                            detalle.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                          )}>
                            {detalle.activo ? 'Activo' : 'Cerrado'}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end">
                           <button
                            onClick={() => {
                              if (editingId === detalle.id) {
                                handleEditarGuardar(detalle.id)
                              } else {
                                const usosCount = usos[detalle.id] ?? 0
                                if (usosCount > 0) {
                                  setError(`Atómica bloqueada: ${usosCount} servicios.`)
                                  setTimeout(() => setError(null), 5000)
                                  return
                                }
                                setEditingId(detalle.id)
                                setEditingNombre(detalle.nombre)
                                setEditingAbreviatura(detalle.abreviatura)
                              }
                            }}
                            className="p-2 rounded-xl bg-white border border-slate-100 text-slate-300 hover:text-slate-900 hover:border-slate-200 hover:shadow-sm opacity-0 group-hover/row:opacity-100 transition-all"
                          >
                            {editingId === detalle.id ? <Check className="w-4 h-4 scale-75" /> : <Edit2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* ALERTAS DE SISTEMA */}
      {(error || successMsg) && (
        <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {error && (
             <div className="bg-red-600 text-white px-8 py-4 rounded-[30px] shadow-2xl shadow-red-200 flex items-center gap-3">
               <AlertCircle className="w-5 h-5" />
               <span className="text-[11px] font-black uppercase tracking-widest">{error}</span>
             </div>
           )}
           {successMsg && (
             <div className="bg-slate-900 text-white px-8 py-4 rounded-[30px] shadow-2xl shadow-slate-200 flex items-center gap-3">
               <Check className="w-5 h-5 text-emerald-400" />
               <span className="text-[11px] font-black uppercase tracking-widest">{successMsg}</span>
             </div>
           )}
        </div>
      )}
    </div>
  )
}
