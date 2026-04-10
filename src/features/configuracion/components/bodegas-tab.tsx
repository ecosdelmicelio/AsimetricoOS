'use client'

import { useState } from 'react'
import { Plus, Edit2, Check, X, Package, TrendingDown, TrendingUp, ArrowRightLeft, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  createBodega,
  updateBodega,
  toggleBodega,
  setBodegaDefault,
} from '@/features/wms/services/bodegas-actions'
import { crearTraslado, getTraslados, confirmarTraslado, cancelarTraslado } from '@/features/wms/services/traslados-actions'
import type { Bodega, Traslado } from '@/features/wms/types'

type TabId = 'bodegas' | 'traslados' | 'ingresos' | 'salidas'

const TABS: { id: TabId; label: string; sub: string; Icon: React.ElementType }[] = [
  { id: 'bodegas', label: 'Bodegas', sub: 'Crear y administrar bodegas', Icon: Package },
  { id: 'traslados', label: 'Traslados', sub: 'Movimientos entre bodegas', Icon: ArrowRightLeft },
  { id: 'ingresos', label: 'Ingresos', sub: 'Entradas de mercancía', Icon: TrendingUp },
  { id: 'salidas', label: 'Salidas', sub: 'Salidas de mercancía', Icon: TrendingDown },
]

interface Props {
  bodegas: Bodega[]
  bodegaDefaultId: string | null
}

const TIPOS = [
  { value: 'principal', label: 'Principal' },
  { value: 'secundaria', label: 'Secundaria' },
  { value: 'externa', label: 'Externa' },
  { value: 'consignacion', label: 'Consignación' },
]

export function BodegasTab({ bodegas, bodegaDefaultId }: Props) {
  const [tab, setTab] = useState<TabId>('bodegas')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [traslados, setTraslados] = useState<Traslado[]>([])

  const [formData, setFormData] = useState<{
    nombre: string
    tipo: Bodega['tipo']
  }>({
    nombre: '',
    tipo: 'secundaria',
  })

  const [trasladoForm, setTrasladoForm] = useState<{
    bodega_origen_id: string
    bodega_destino_id: string
    notas: string
    cantidad: number
  }>({
    bodega_origen_id: '',
    bodega_destino_id: '',
    notas: '',
    cantidad: 1,
  })

  const [showTrasladoForm, setShowTrasladoForm] = useState(false)

  const [ingresoForm, setIngresoForm] = useState<{
    bodega_id: string
    cantidad: number
    notas: string
  }>({
    bodega_id: '',
    cantidad: 1,
    notas: '',
  })

  const [salidaForm, setSalidaForm] = useState<{
    bodega_id: string
    cantidad: number
    notas: string
  }>({
    bodega_id: '',
    cantidad: 1,
    notas: '',
  })

  const [showIngresoForm, setShowIngresoForm] = useState(false)
  const [showSalidaForm, setShowSalidaForm] = useState(false)

  const resetForm = () => {
    setFormData({ nombre: '', tipo: 'secundaria' })
    setEditingId(null)
    setShowForm(false)
    setError(null)
  }

  const handleCreate = async () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setLoading(true)
    const result = await createBodega(formData)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      resetForm()
    }
  }

  const handleUpdate = async (id: string) => {
    setLoading(true)
    const result = await updateBodega(id, {
      nombre: formData.nombre || undefined,
      tipo: formData.tipo || undefined,
    })
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      resetForm()
    }
  }

  const handleToggle = async (id: string, activo: boolean) => {
    setLoading(true)
    const result = await toggleBodega(id, !activo)
    setLoading(false)

    if (result.error) setError(result.error)
  }

  const handleSetDefault = async (id: string) => {
    setLoading(true)
    const result = await setBodegaDefault(id)
    setLoading(false)

    if (result.error) setError(result.error)
  }

  const startEdit = (bodega: Bodega) => {
    setFormData({
      nombre: bodega.nombre,
      tipo: bodega.tipo,
    })
    setEditingId(bodega.id)
    setShowForm(true)
  }

  const handleCreateTraslado = async () => {
    if (!trasladoForm.bodega_origen_id || !trasladoForm.bodega_destino_id) {
      setError('Debe seleccionar bodega origen y destino')
      return
    }

    if (trasladoForm.cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0')
      return
    }

    setLoading(true)
    const result = await crearTraslado({
      tipo: 'entre_bodegas',
      bodega_origen_id: trasladoForm.bodega_origen_id,
      bodega_destino_id: trasladoForm.bodega_destino_id,
      items: [
        {
          cantidad: trasladoForm.cantidad,
          unidad: 'unidad',
        },
      ],
      notas: trasladoForm.notas || undefined,
    })
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setTrasladoForm({
        bodega_origen_id: '',
        bodega_destino_id: '',
        notas: '',
        cantidad: 1,
      })
      setShowTrasladoForm(false)
      const trasladosData = await getTraslados()
      setTraslados(trasladosData)
    }
  }

  const handleConfirmarTraslado = async (trasladoId: string) => {
    setLoading(true)
    const result = await confirmarTraslado(trasladoId)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      const trasladosData = await getTraslados()
      setTraslados(trasladosData)
    }
  }

  const handleCancelarTraslado = async (trasladoId: string) => {
    setLoading(true)
    const result = await cancelarTraslado(trasladoId)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      const trasladosData = await getTraslados()
      setTraslados(trasladosData)
    }
  }

  const handleCreateIngreso = async () => {
    if (!ingresoForm.bodega_id) {
      setError('Debe seleccionar una bodega')
      return
    }

    if (ingresoForm.cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0')
      return
    }

    setLoading(true)
    // Aquí se implementaría la lógica para crear un ingreso
    // Por ahora mostramos un placeholder
    setError('Función de ingresos no completamente implementada - próximamente')
    setLoading(false)
  }

  const handleCreateSalida = async () => {
    if (!salidaForm.bodega_id) {
      setError('Debe seleccionar una bodega')
      return
    }

    if (salidaForm.cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0')
      return
    }

    setLoading(true)
    // Aquí se implementaría la lógica para crear una salida
    // Por ahora mostramos un placeholder
    setError('Función de salidas no completamente implementada - próximamente')
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Gestión de Bodegas</h3>
        <p className="text-sm text-muted-foreground">
          Bodegas, traslados e ingresos/salidas de mercancía
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
              tab === t.id
                ? 'bg-neu-base shadow-neu-inset border-2 border-primary-400'
                : 'bg-neu-base shadow-neu border-2 border-transparent hover:shadow-neu-lg'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              tab === t.id ? 'bg-primary-100' : 'bg-neu-base shadow-neu-inset'
            }`}>
              <t.Icon className={`w-4 h-4 ${tab === t.id ? 'text-primary-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className={`text-body-sm font-semibold ${tab === t.id ? 'text-primary-700' : 'text-foreground'}`}>
                {t.label}
              </p>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Content - Tab Bodegas */}
      {tab === 'bodegas' && (
        <div className="space-y-6">
          {/* Header con botón crear */}
          <div className="flex items-center justify-between">
            <div />
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Bodega
              </Button>
            )}
          </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
          <h4 className="font-semibold">
            {editingId ? 'Editar Bodega' : 'Nueva Bodega'}
          </h4>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre ?? ''}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="e.g., Planta Principal"
                className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={formData.tipo ?? 'secundaria'}
                onChange={e =>
                  setFormData({
                    ...formData,
                    tipo: e.target.value as Bodega['tipo'],
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
              >
                {TIPOS.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingId) {
                  handleUpdate(editingId)
                } else {
                  handleCreate()
                }
              }}
              disabled={loading}
            >
              {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </div>
      )}

          {/* Lista de bodegas */}
          <div className="space-y-3">
            {bodegas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay bodegas creadas
              </div>
            ) : (
              bodegas.map(bodega => (
                <div
                  key={bodega.id}
                  className="flex items-center justify-between gap-4 bg-neu-base border border-neu-300 rounded-xl p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-sm">{bodega.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {bodega.codigo} • {TIPOS.find(t => t.value === bodega.tipo)?.label}
                        </p>
                      </div>
                      {bodegaDefaultId === bodega.id && (
                        <span className="text-xs font-semibold px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {bodegaDefaultId !== bodega.id && (
                      <button
                        onClick={() => handleSetDefault(bodega.id)}
                        disabled={loading}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neu-base hover:bg-neu-200 border border-neu-300 transition-colors"
                      >
                        Marcar Default
                      </button>
                    )}

                    <button
                      onClick={() => startEdit(bodega)}
                      disabled={loading}
                      className="p-1.5 rounded-lg hover:bg-neu-200 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={() => handleToggle(bodega.id, bodega.activo)}
                      disabled={loading}
                      className={`p-1.5 rounded-lg transition-colors ${
                        bodega.activo
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {bodega.activo ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Content - Tab Traslados */}
      {tab === 'traslados' && (
        <div className="space-y-6">
          {/* Header con botón crear */}
          <div className="flex items-center justify-between">
            <div />
            {!showTrasladoForm && (
              <Button onClick={() => setShowTrasladoForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Traslado
              </Button>
            )}
          </div>

          {/* Formulario de traslado */}
          {showTrasladoForm && (
            <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
              <h4 className="font-semibold">Crear Traslado</h4>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Bodega Origen</label>
                  <select
                    value={trasladoForm.bodega_origen_id}
                    onChange={e => setTrasladoForm({ ...trasladoForm, bodega_origen_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                  >
                    <option value="">Seleccionar bodega origen</option>
                    {bodegas.filter(b => b.activo).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} ({b.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bodega Destino</label>
                  <select
                    value={trasladoForm.bodega_destino_id}
                    onChange={e => setTrasladoForm({ ...trasladoForm, bodega_destino_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                  >
                    <option value="">Seleccionar bodega destino</option>
                    {bodegas.filter(b => b.activo && b.id !== trasladoForm.bodega_origen_id).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} ({b.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={trasladoForm.cantidad}
                    onChange={e => setTrasladoForm({ ...trasladoForm, cantidad: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notas</label>
                  <textarea
                    value={trasladoForm.notas}
                    onChange={e => setTrasladoForm({ ...trasladoForm, notas: e.target.value })}
                    placeholder="Notas adicionales del traslado"
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowTrasladoForm(false)
                  setError(null)
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTraslado} disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Traslado'}
                </Button>
              </div>
            </div>
          )}

          {/* Lista de traslados */}
          <div className="space-y-3">
            {traslados.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay traslados creados
              </div>
            ) : (
              traslados.map(traslado => (
                <div
                  key={traslado.id}
                  className="flex items-center justify-between gap-4 bg-neu-base border border-neu-300 rounded-xl p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-sm">{traslado.codigo}</p>
                        <p className="text-xs text-muted-foreground">
                          {bodegas.find(b => b.id === traslado.bodega_origen_id)?.nombre} → {bodegas.find(b => b.id === traslado.bodega_destino_id)?.nombre}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        traslado.estado === 'completado'
                          ? 'bg-green-100 text-green-700'
                          : traslado.estado === 'cancelado'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {traslado.estado.charAt(0).toUpperCase() + traslado.estado.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {traslado.estado === 'pendiente' && (
                      <>
                        <button
                          onClick={() => handleConfirmarTraslado(traslado.id)}
                          disabled={loading}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleCancelarTraslado(traslado.id)}
                          disabled={loading}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Content - Tab Ingresos */}
      {tab === 'ingresos' && (
        <div className="space-y-6">
          {/* Header con botón crear */}
          <div className="flex items-center justify-between">
            <div />
            {!showIngresoForm && (
              <Button onClick={() => setShowIngresoForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Ingreso
              </Button>
            )}
          </div>

          {/* Formulario de ingreso */}
          {showIngresoForm && (
            <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
              <h4 className="font-semibold">Crear Ingreso de Mercancía</h4>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Bodega Destino</label>
                  <select
                    value={ingresoForm.bodega_id}
                    onChange={e => setIngresoForm({ ...ingresoForm, bodega_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                  >
                    <option value="">Seleccionar bodega</option>
                    {bodegas.filter(b => b.activo).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} ({b.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={ingresoForm.cantidad}
                    onChange={e => setIngresoForm({ ...ingresoForm, cantidad: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notas</label>
                  <textarea
                    value={ingresoForm.notas}
                    onChange={e => setIngresoForm({ ...ingresoForm, notas: e.target.value })}
                    placeholder="Notas adicionales del ingreso"
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowIngresoForm(false)
                  setError(null)
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateIngreso} disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Ingreso'}
                </Button>
              </div>
            </div>
          )}

          {/* Placeholder para lista de ingresos */}
          <div className="text-center py-12 text-muted-foreground">
            No hay ingresos registrados
          </div>
        </div>
      )}

      {/* Content - Tab Salidas */}
      {tab === 'salidas' && (
        <div className="space-y-6">
          {/* Header con botón crear */}
          <div className="flex items-center justify-between">
            <div />
            {!showSalidaForm && (
              <Button onClick={() => setShowSalidaForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Salida
              </Button>
            )}
          </div>

          {/* Formulario de salida */}
          {showSalidaForm && (
            <div className="bg-neu-base border border-neu-300 rounded-xl p-6 space-y-4">
              <h4 className="font-semibold">Crear Salida de Mercancía</h4>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Bodega Origen</label>
                  <select
                    value={salidaForm.bodega_id}
                    onChange={e => setSalidaForm({ ...salidaForm, bodega_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                  >
                    <option value="">Seleccionar bodega</option>
                    {bodegas.filter(b => b.activo).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} ({b.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={salidaForm.cantidad}
                    onChange={e => setSalidaForm({ ...salidaForm, cantidad: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notas</label>
                  <textarea
                    value={salidaForm.notas}
                    onChange={e => setSalidaForm({ ...salidaForm, notas: e.target.value })}
                    placeholder="Notas adicionales de la salida"
                    className="w-full px-3 py-2 rounded-lg border border-neu-300 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowSalidaForm(false)
                  setError(null)
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSalida} disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Salida'}
                </Button>
              </div>
            </div>
          )}

          {/* Placeholder para lista de salidas */}
          <div className="text-center py-12 text-muted-foreground">
            No hay salidas registradas
          </div>
        </div>
      )}
    </div>
  )
}
