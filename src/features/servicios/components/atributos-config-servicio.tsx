'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, Loader2, Toggle2 } from 'lucide-react'
import {
  createTipoServicioAtributo,
  updateTipoServicioAtributo,
  deleteTipoServicioAtributo,
  toggleTipoServicioAtributoActivo,
} from '@/features/servicios/services/atributo-servicio-actions'
import type { TipoServicioAtributo } from '@/features/servicios/types/servicios'

interface Props {
  atributos: TipoServicioAtributo[]
}

export function AtributosConfigServicio({ atributos }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Formulario Tipo
  const [showFormTipo, setShowFormTipo] = useState(false)
  const [nombreTipo, setNombreTipo] = useState('')
  const [abreviaturaTipo, setAbreviaturaTipo] = useState('')

  // Formulario Subtipo
  const [showFormSubtipo, setShowFormSubtipo] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(null)
  const [nombreSubtipo, setNombreSubtipo] = useState('')
  const [abreviaturaSubtipo, setAbreviaturaSubtipo] = useState('')

  // Edición
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNombre, setEditingNombre] = useState('')
  const [editingAbreviatura, setEditingAbreviatura] = useState('')

  // Agrupar por tipo
  const tipos = atributos.filter(a => a.atributo_tipo === 'tipo')
  const subtipos = atributos.filter(a => a.atributo_tipo === 'subtipo')

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
      setTipoSeleccionado(null)
      setShowFormSubtipo(false)
      setSuccessMsg(`Subtipo "${nombreSubtipo}" agregado`)
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
    <div className="space-y-6">
      {/* TIPOS */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="text-body-sm font-semibold text-foreground">Tipos de Servicio</h3>

        <form onSubmit={handleAgregarTipo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Nombre *</label>
              <input
                type="text"
                value={nombreTipo}
                onChange={e => setNombreTipo(e.target.value)}
                placeholder="Ej: Corte"
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Abreviatura *</label>
              <input
                type="text"
                value={abreviaturaTipo}
                onChange={e => setAbreviaturaTipo(e.target.value)}
                placeholder="Ej: CO"
                maxLength={3}
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Plus className="w-4 h-4" />
            Agregar Tipo
          </button>
        </form>

        {tipos.length === 0 ? (
          <p className="text-muted-foreground text-body-sm">Sin tipos agregados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-neu-stroke">
                  <th className="text-left py-2 px-3 font-semibold text-foreground">Nombre</th>
                  <th className="text-left py-2 px-3 font-semibold text-foreground">Abreviatura</th>
                  <th className="text-center py-2 px-3 font-semibold text-foreground w-16">Estado</th>
                  <th className="text-right py-2 px-3 font-semibold text-foreground w-24"></th>
                </tr>
              </thead>
              <tbody>
                {tipos.map(tipo => (
                  <tr key={tipo.id} className="border-b border-neu-stroke hover:bg-neu-hover transition-colors">
                    <td className="py-2.5 px-3">
                      {editingId === tipo.id ? (
                        <input
                          type="text"
                          value={editingNombre}
                          onChange={e => setEditingNombre(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-white border border-neu-stroke text-body-sm"
                          autoFocus
                        />
                      ) : (
                        <span className="text-foreground">{tipo.nombre}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {editingId === tipo.id ? (
                        <input
                          type="text"
                          value={editingAbreviatura}
                          onChange={e => setEditingAbreviatura(e.target.value)}
                          maxLength={3}
                          className="w-full px-2 py-1 rounded bg-white border border-neu-stroke text-body-sm uppercase"
                        />
                      ) : (
                        <span className="text-foreground font-mono font-semibold">{tipo.abreviatura}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {editingId !== tipo.id && (
                        <button
                          onClick={() => handleToggleActivo(tipo.id)}
                          disabled={pending}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                            tipo.activo
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {tipo.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right flex justify-end gap-1">
                      {editingId === tipo.id ? (
                        <>
                          <button
                            onClick={() => handleEditarGuardar(tipo.id)}
                            disabled={pending}
                            className="px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(tipo.id)
                              setEditingNombre(tipo.nombre)
                              setEditingAbreviatura(tipo.abreviatura)
                            }}
                            disabled={pending}
                            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEliminar(tipo.id)}
                            disabled={pending}
                            className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* SUBTIPOS */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6 space-y-4">
        <h3 className="text-body-sm font-semibold text-foreground">Subtipos por Tipo</h3>

        <form onSubmit={handleAgregarSubtipo} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Tipo Padre *</label>
              <select
                value={tipoSeleccionado || ''}
                onChange={e => setTipoSeleccionado(e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke"
              >
                <option value="">Seleccionar...</option>
                {tipos.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Nombre *</label>
              <input
                type="text"
                value={nombreSubtipo}
                onChange={e => setNombreSubtipo(e.target.value)}
                placeholder="Ej: Recto"
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Abreviatura *</label>
              <input
                type="text"
                value={abreviaturaSubtipo}
                onChange={e => setAbreviaturaSubtipo(e.target.value)}
                placeholder="Ej: RCT"
                maxLength={4}
                className="w-full px-3 py-2.5 rounded-xl bg-neu text-body-sm text-foreground outline-none border border-neu-stroke placeholder:text-muted-foreground uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Plus className="w-4 h-4" />
            Agregar Subtipo
          </button>
        </form>

        {subtipos.length === 0 ? (
          <p className="text-muted-foreground text-body-sm">Sin subtipos agregados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-neu-stroke">
                  <th className="text-left py-2 px-3 font-semibold text-foreground">Nombre</th>
                  <th className="text-left py-2 px-3 font-semibold text-foreground">Abreviatura</th>
                  <th className="text-left py-2 px-3 font-semibold text-foreground">Tipo Padre</th>
                  <th className="text-center py-2 px-3 font-semibold text-foreground w-16">Estado</th>
                  <th className="text-right py-2 px-3 font-semibold text-foreground w-24"></th>
                </tr>
              </thead>
              <tbody>
                {subtipos.map(subtipo => {
                  const tipoPadre = tipos.find(t => t.id === subtipo.tipo_padre_id)
                  return (
                    <tr key={subtipo.id} className="border-b border-neu-stroke hover:bg-neu-hover transition-colors">
                      <td className="py-2.5 px-3">
                        {editingId === subtipo.id ? (
                          <input
                            type="text"
                            value={editingNombre}
                            onChange={e => setEditingNombre(e.target.value)}
                            className="w-full px-2 py-1 rounded bg-white border border-neu-stroke text-body-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="text-foreground">{subtipo.nombre}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {editingId === subtipo.id ? (
                          <input
                            type="text"
                            value={editingAbreviatura}
                            onChange={e => setEditingAbreviatura(e.target.value)}
                            maxLength={4}
                            className="w-full px-2 py-1 rounded bg-white border border-neu-stroke text-body-sm uppercase"
                          />
                        ) : (
                          <span className="text-foreground font-mono font-semibold">{subtipo.abreviatura}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-foreground text-xs bg-neu px-2 py-1 rounded inline-block">{tipoPadre?.nombre || 'N/A'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {editingId !== subtipo.id && (
                          <button
                            onClick={() => handleToggleActivo(subtipo.id)}
                            disabled={pending}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                              subtipo.activo
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {subtipo.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right flex justify-end gap-1">
                        {editingId === subtipo.id ? (
                          <>
                            <button
                              onClick={() => handleEditarGuardar(subtipo.id)}
                              disabled={pending}
                              className="px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(subtipo.id)
                                setEditingNombre(subtipo.nombre)
                                setEditingAbreviatura(subtipo.abreviatura)
                              }}
                              disabled={pending}
                              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleEliminar(subtipo.id)}
                              disabled={pending}
                              className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && <div className="text-red-600 text-body-sm rounded-xl bg-red-50 p-3">{error}</div>}
      {successMsg && <div className="text-green-600 text-body-sm rounded-xl bg-green-50 p-3">{successMsg}</div>}
    </div>
  )
}
